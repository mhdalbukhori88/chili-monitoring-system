"""
Latih CNN multi-head menggunakan FOTO ASLI tanaman cabai.

Susun dataset foto Anda menggunakan script bantuan:
  python backend/app/ml/prepare_dataset.py -r /path/ke/foto_mentah

Struktur dataset yang didukung:
1. Split-first (rekomendasi dari prepare_dataset.py):
   backend/app/models_data/dataset/
       train/
           leaf_health/{sehat, kuning, keriting, bercak_daun}/*.jpg
           fruit_stage/{tidak_ada, bunga, buah_hijau, buah_matang}/*.jpg
           condition/{sehat, stres_air, defisiensi_nutrisi, hama_penyakit}/*.jpg
       val/
           leaf_health/...
           fruit_stage/...
           condition/...

2. Head-first atau flat folder juga tetap didukung otomatis untuk kompatibilitas ke belakang.

Script ini melatih tiap head secara terpisah dari folder klasifikasinya
masing-masing (transfer learning di atas backbone MobileNetV3 pretrained).
"""
import os
import sys
import torch
import torch.nn as nn
from torch.utils.data import DataLoader
from torchvision import datasets, transforms

# Pastikan folder backend masuk ke sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

from app.ml.cnn_model import (
    build_model,
    LEAF_HEALTH_CLASSES,
    FRUIT_STAGE_CLASSES,
    CONDITION_CLASSES,
)

DATASET_DIR = os.path.join(os.path.dirname(__file__), "..", "models_data", "dataset")
MODEL_OUT = os.path.join(os.path.dirname(__file__), "..", "models_data", "cnn_model.pt")

TRAIN_TRANSFORM = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.RandomHorizontalFlip(),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
])

VAL_TRANSFORM = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
])

HEAD_CONFIG = {
    "leaf_health": "leaf_health_logits",
    "fruit_stage": "fruit_stage_logits",
    "condition": "condition_logits",
}

HEAD_TARGET_CLASSES = {
    "leaf_health": LEAF_HEALTH_CLASSES,
    "fruit_stage": FRUIT_STAGE_CLASSES,
    "condition": CONDITION_CLASSES,
}


def find_head_folders(dataset_dir: str, head_name: str):
    """Cari folder train dan val untuk head tertentu."""
    # Opsi 1: dataset/train/<head_name> dan dataset/val/<head_name>
    split_first_train = os.path.join(dataset_dir, "train", head_name)
    split_first_val = os.path.join(dataset_dir, "val", head_name)
    if os.path.isdir(split_first_train):
        val_folder = split_first_val if os.path.isdir(split_first_val) else None
        return split_first_train, val_folder

    # Opsi 2: dataset/<head_name>/train dan dataset/<head_name>/val
    head_first_train = os.path.join(dataset_dir, head_name, "train")
    head_first_val = os.path.join(dataset_dir, head_name, "val")
    if os.path.isdir(head_first_train):
        val_folder = head_first_val if os.path.isdir(head_first_val) else None
        return head_first_train, val_folder

    # Opsi 3: dataset/<head_name> (flat)
    flat_folder = os.path.join(dataset_dir, head_name)
    if os.path.isdir(flat_folder):
        return flat_folder, None

    return None, None


def evaluate_head(model, val_loader, head_module, loss_fn, remap):
    """Evaluasi performa model pada data validasi."""
    model.eval()
    val_loss = 0.0
    correct = 0
    total = 0

    with torch.no_grad():
        for images, labels in val_loader:
            target_labels = remap[labels]
            feat = model.pool(model.features(images)).flatten(1)
            outputs = head_module(feat)
            loss = loss_fn(outputs, target_labels)
            val_loss += loss.item() * images.size(0)
            preds = torch.argmax(outputs, dim=1)
            correct += (preds == target_labels).sum().item()
            total += target_labels.size(0)

    avg_loss = val_loss / total if total > 0 else 0.0
    acc = correct / total if total > 0 else 0.0
    return avg_loss, acc


def train_head(model, head_name, logits_key, epochs=6, lr=1e-3, batch_size=64):
    train_folder, val_folder = find_head_folders(DATASET_DIR, head_name)

    if not train_folder:
        print(f"[skip] Folder dataset untuk head '{head_name}' belum ditemukan - lewati.")
        return

    try:
        train_dataset = datasets.ImageFolder(train_folder, transform=TRAIN_TRANSFORM)
    except Exception as e:
        print(f"[skip] Gagal memuat folder '{train_folder}': {e}")
        return

    if len(train_dataset) == 0:
        print(f"[skip] Folder '{train_folder}' kosong - lewati.")
        return

    target_classes = HEAD_TARGET_CLASSES[head_name]
    # Bangun remap tensor agar indeks ImageFolder cocok persis dengan index cnn_model.py
    remap = torch.zeros(len(train_dataset.classes), dtype=torch.long)
    for folder_class, idx in train_dataset.class_to_idx.items():
        if folder_class in target_classes:
            remap[idx] = target_classes.index(folder_class)
        else:
            print(f"[warning] Folder '{folder_class}' bukan kelas resmi di {head_name}")

    val_loader = None
    val_remap = None
    if val_folder:
        try:
            val_dataset = datasets.ImageFolder(val_folder, transform=VAL_TRANSFORM)
            if len(val_dataset) > 0:
                val_loader = DataLoader(val_dataset, batch_size=batch_size, shuffle=False)
                val_remap = torch.zeros(len(val_dataset.classes), dtype=torch.long)
                for folder_class, idx in val_dataset.class_to_idx.items():
                    if folder_class in target_classes:
                        val_remap[idx] = target_classes.index(folder_class)
        except Exception as e:
            print(f"[warning] Gagal memuat folder validasi '{val_folder}': {e}")
            val_loader = None
            val_remap = None

    train_loader = DataLoader(train_dataset, batch_size=batch_size, shuffle=True)

    # Transfer Learning: bekukan fitur backbone MobileNetV3 agar training cepat & stabil di CPU
    for param in model.features.parameters():
        param.requires_grad = False

    head_module = getattr(model, f"{head_name}_head")
    for param in head_module.parameters():
        param.requires_grad = True

    params_to_opt = list(head_module.parameters())
    if head_name == "leaf_health":
        for param in model.plant_head.parameters():
            param.requires_grad = True
        params_to_opt += list(model.plant_head.parameters())
    elif head_name == "fruit_stage":
        for param in model.fruit_count_head.parameters():
            param.requires_grad = True
        for param in model.leaf_count_head.parameters():
            param.requires_grad = True
        params_to_opt += list(model.fruit_count_head.parameters()) + list(model.leaf_count_head.parameters())

    optimizer = torch.optim.Adam(params_to_opt, lr=lr)
    loss_fn = nn.CrossEntropyLoss()

    best_val_acc = 0.0
    best_head_state = None
    best_plant_state = None
    best_counts_state = None

    print(f"\n---> Memulai training head: {head_name} ({len(train_dataset)} sampel train" +
          (f", {len(val_loader.dataset)} sampel val)" if val_loader else ")"))
    print(f"     Kelas terdeteksi: {list(train_dataset.class_to_idx.keys())}")
    print(f"     Target index mapping: { {k: remap[v].item() for k, v in train_dataset.class_to_idx.items()} }")

    for epoch in range(epochs):
        model.train()
        total_loss = 0.0
        correct_train = 0
        total_train = 0

        for images, labels in train_loader:
            optimizer.zero_grad()
            target_labels = remap[labels]

            # Fitur backbone dihitung tanpa grad untuk efisiensi CPU maksimal
            with torch.no_grad():
                feat = model.pool(model.features(images)).flatten(1)

            outputs_logits = head_module(feat)
            loss = loss_fn(outputs_logits, target_labels)

            # Jika leaf_health, supervisi tambahan untuk plant_head
            if head_name == "leaf_health":
                plant_targets = torch.ones(images.size(0), dtype=torch.long)
                loss += 0.5 * loss_fn(model.plant_head(feat), plant_targets)
            elif head_name == "fruit_stage":
                # Supervisi regresi estimasi daun & buah
                exp_fruits = torch.tensor([0.0, 1.0, 12.0, 18.0])[target_labels]
                exp_leaves = torch.tensor([12.0, 25.0, 45.0, 50.0])[target_labels]
                f_pred = model.fruit_count_head(feat).squeeze(-1)
                l_pred = model.leaf_count_head(feat).squeeze(-1)
                count_loss = nn.functional.smooth_l1_loss(f_pred, exp_fruits) + \
                             nn.functional.smooth_l1_loss(l_pred, exp_leaves)
                loss += 0.05 * count_loss

            loss.backward()
            optimizer.step()
            total_loss += loss.item()

            preds = torch.argmax(outputs_logits, dim=1)
            correct_train += (preds == target_labels).sum().item()
            total_train += target_labels.size(0)

        epoch_loss = total_loss / len(train_loader)
        train_acc = correct_train / total_train if total_train > 0 else 0.0
        log_msg = f"[{head_name}] Epoch {epoch + 1:2d}/{epochs} - Train Loss: {epoch_loss:.4f} | Train Acc: {train_acc * 100:.1f}%"

        if val_loader and val_remap is not None:
            v_loss, v_acc = evaluate_head(model, val_loader, head_module, loss_fn, val_remap)
            log_msg += f" | Val Loss: {v_loss:.4f} | Val Acc: {v_acc * 100:.1f}%"
            if v_acc >= best_val_acc:
                best_val_acc = v_acc
                best_head_state = {k: v.cpu().clone() for k, v in head_module.state_dict().items()}
                if head_name == "leaf_health":
                    best_plant_state = {k: v.cpu().clone() for k, v in model.plant_head.state_dict().items()}
                elif head_name == "fruit_stage":
                    best_counts_state = (
                        {k: v.cpu().clone() for k, v in model.fruit_count_head.state_dict().items()},
                        {k: v.cpu().clone() for k, v in model.leaf_count_head.state_dict().items()}
                    )

        print(log_msg)

    # Pulihkan bobot dengan akurasi validasi terbaik
    if best_head_state is not None:
        head_module.load_state_dict(best_head_state)
        if head_name == "leaf_health" and best_plant_state is not None:
            model.plant_head.load_state_dict(best_plant_state)
        elif head_name == "fruit_stage" and best_counts_state is not None:
            model.fruit_count_head.load_state_dict(best_counts_state[0])
            model.leaf_count_head.load_state_dict(best_counts_state[1])
        print(f"[{head_name}] Restored bobot checkpoint validasi terbaik: {best_val_acc * 100:.1f}%")


def main():
    if not os.path.isdir(DATASET_DIR):
        print(
            f"Dataset foto belum ditemukan di {DATASET_DIR}.\n"
            "Silakan kumpulkan foto mentah lalu proses menggunakan:\n"
            "  python backend/app/ml/prepare_dataset.py -r <folder_foto_mentah>\n"
            "atau untuk pengujian awal dengan dataset dummy:\n"
            "  python backend/app/ml/prepare_dataset.py --test-dummy"
        )
        return

    # Optimalkan thread CPU
    num_threads = min(8, os.cpu_count() or 4)
    torch.set_num_threads(num_threads)

    print("=" * 70)
    print(f"   MELATIH CNN MULTI-HEAD CABAI DENGAN FOTO ASLI (MOBILENETV3 - {num_threads} THREADS)")
    print("=" * 70)

    model = build_model(pretrained=True)
    for head_name, logits_key in HEAD_CONFIG.items():
        train_head(model, head_name, logits_key, epochs=6, lr=1e-3, batch_size=64)

    os.makedirs(os.path.dirname(MODEL_OUT), exist_ok=True)
    torch.save(model.state_dict(), MODEL_OUT)
    print(f"\n[OK] Pelatihan selesai! Model CNN tersimpan di: {MODEL_OUT}")


if __name__ == "__main__":
    main()

