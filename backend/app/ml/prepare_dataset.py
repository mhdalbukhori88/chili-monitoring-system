"""
Script untuk memproses dan mempersiapkan dataset foto mentah tanaman cabai
sebelum digunakan untuk melatih CNN di backend/app/ml/train_cnn.py.

Fungsi utama:
1. Menerima folder foto mentah (raw photos) yang belum terkelompokkan.
2. Memvalidasi setiap file gambar (skip file corrupt, 0 byte, atau non-gambar).
3. Mendeteksi kelas target otomatis dari:
   - Label mapping file (CSV/JSON jika ada)
   - Struktur subfolder mentah (jika ada)
   - Nama file menggunakan pola kata kunci (contoh: 'kuning_01.jpg', 'bunga_sehat.png')
   - Mode interaktif di terminal (opsional)
4. Membagi foto ke folder train/val (default 80/20) secara stratified per kelas.
5. Menyusun struktur folder sesuai kebutuhan train_cnn.py:
     dataset/
       train/
         leaf_health/{sehat, kuning, keriting, bercak_daun}
         fruit_stage/{tidak_ada, bunga, buah_hijau, buah_matang}
         condition/{sehat, stres_air, defisiensi_nutrisi, hama_penyakit}
       val/
         leaf_health/...
         fruit_stage/...
         condition/...
6. Menampilkan tabel ringkasan jumlah foto per kelas & rekomendasi kecukupan data.
"""
import argparse
import csv
import json
import os
import random
import re
import shutil
import sys
from pathlib import Path
from typing import Dict, List, Optional, Set, Tuple

from PIL import Image

# Import kelas resmi dari cnn_model
try:
    from app.ml.cnn_model import (
        LEAF_HEALTH_CLASSES,
        FRUIT_STAGE_CLASSES,
        CONDITION_CLASSES,
    )
except ImportError:
    # Fallback jika dijalankan langsung tanpa package context
    LEAF_HEALTH_CLASSES = ["sehat", "kuning", "keriting", "bercak_daun"]
    FRUIT_STAGE_CLASSES = ["tidak_ada", "bunga", "buah_hijau", "buah_matang"]
    CONDITION_CLASSES = ["sehat", "stres_air", "defisiensi_nutrisi", "hama_penyakit"]

HEAD_CLASSES = {
    "leaf_health": LEAF_HEALTH_CLASSES,
    "fruit_stage": FRUIT_STAGE_CLASSES,
    "condition": CONDITION_CLASSES,
}

SUPPORTED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".bmp"}

# Pola regex kata kunci untuk deteksi otomatis dari nama file atau subfolder
KEYWORD_PATTERNS = {
    "leaf_health": {
        "bercak_daun": [
            r"bercak[_\s-]?daun",
            r"bercak",
            r"leaf[_\s-]?spot",
            r"bacterial[_\s-]?spot",
            r"white[_\s-]?spot",
            r"spot",
            r"antraknos?a",
            r"cercospora",
        ],
        "keriting": [
            r"keriting",
            r"kriting",
            r"curl",
            r"curly",
            r"gemini[_\s-]?virus",
            r"bule",
        ],
        "kuning": [
            r"kuning",
            r"yellow",
            r"chloros[ie]s",
            r"klorosis",
            r"nutri(ent|tion)[_\s-]?deficiency",
        ],
        "sehat": [
            r"(?<!tidak_)sehat",
            r"healthy",
            r"normal[_\s-]?leaf",
            r"daun[_\s-]?sehat",
        ],
    },
    "fruit_stage": {
        "tidak_ada": [
            r"tidak[_\s-]?ada",
            r"tanpa[_\s-]?buah",
            r"vegetatif",
            r"no[_\s-]?fruit",
            r"none",
            r"healthy[_\s-]?leaf",
        ],
        "bunga": [
            r"bunga",
            r"flower",
            r"flowering",
            r"kuncup",
            r"blossom",
        ],
        "buah_hijau": [
            r"buah[_\s-]?hijau",
            r"hijau",
            r"green[_\s-]?fruit",
            r"green[_\s-]?chili",
            r"green[_\s-]?chilli",
            r"rawit[_\s-]?hijau",
        ],
        "buah_matang": [
            r"buah[_\s-]?matang",
            r"matang",
            r"merah",
            r"ripe[_\s-]?fruit",
            r"red[_\s-]?chili",
            r"red[_\s-]?chilli",
            r"buah[_\s-]?merah",
        ],
    },
    "condition": {
        "stres_air": [
            r"stres[_\s-]?air",
            r"stress[_\s-]?air",
            r"dry[_\s-]?chili",
            r"dry[_\s-]?chilli",
            r"kekeringan",
            r"kurang[_\s-]?air",
            r"layu",
            r"wilt",
            r"water[_\s-]?stress",
            r"drought",
        ],
        "defisiensi_nutrisi": [
            r"defisiensi[_\s-]?nutrisi",
            r"defisiensi",
            r"kurang[_\s-]?pupuk",
            r"kurang[_\s-]?nitrogen",
            r"nutri(ent|tion)[_\s-]?deficiency",
        ],
        "hama_penyakit": [
            r"hama[_\s-]?penyakit",
            r"hama",
            r"penyakit",
            r"kutu",
            r"whitefly",
            r"white[_\s-]?fly",
            r"thrips",
            r"ulat",
            r"tungau",
            r"aphid",
            r"pest",
            r"disease",
            r"rotten",
            r"rotten[_\s-]?chili",
            r"rotten[_\s-]?chilli",
            r"curl",
            r"spot",
            r"bacterial",
            r"cercospora",
            r"virus",
        ],
        "sehat": [
            r"kondisi[_\s-]?sehat",
            r"tanaman[_\s-]?sehat",
            r"prime",
            r"(?<!tidak_)sehat",
            r"healthy",
        ],
    },
}


def validate_image_file(file_path: Path) -> Tuple[bool, Optional[str]]:
    """
    Validasi apakah file adalah gambar valid dan tidak korup.
    Mengembalikan tuple: (is_valid, error_reason).
    """
    if not file_path.is_file():
        return False, "Bukan file biasa"

    if file_path.suffix.lower() not in SUPPORTED_EXTENSIONS:
        return False, f"Ekstensi '{file_path.suffix}' tidak didukung (hanya {', '.join(sorted(SUPPORTED_EXTENSIONS))})"

    if file_path.stat().st_size == 0:
        return False, "Ukuran file 0 byte (kosong)"

    try:
        # Cek integritas header & struktur gambar
        with Image.open(file_path) as img:
            img.verify()

        # Buka ulang untuk verifikasi decoding piksel secara penuh
        with Image.open(file_path) as img:
            img.load()
            _ = img.convert("RGB")
        return True, None
    except Exception as e:
        return False, f"File korup atau rusak: {str(e)}"


def load_label_manifest(manifest_path: Path) -> Dict[str, Dict[str, str]]:
    """
    Muat mapping file gambar ke label dari CSV atau JSON.
    Format yang didukung:
    - CSV dengan header: filename, leaf_health, fruit_stage, condition
    - JSON: {"img_01.jpg": {"leaf_health": "sehat", ...}}
    """
    labels_map: Dict[str, Dict[str, str]] = {}
    if not manifest_path.is_file():
        return labels_map

    ext = manifest_path.suffix.lower()
    if ext == ".json":
        with open(manifest_path, "r", encoding="utf-8") as f:
            data = json.load(f)
            for fname, labels in data.items():
                labels_map[Path(fname).name] = labels
    elif ext == ".csv":
        with open(manifest_path, "r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                # Cari kolom filename
                fname = (
                    row.get("filename")
                    or row.get("file")
                    or row.get("image")
                    or row.get("nama_file")
                )
                if not fname:
                    continue
                fname_clean = Path(fname.strip()).name

                entry = {}
                for head in ["leaf_health", "fruit_stage", "condition"]:
                    val = row.get(head) or row.get(head.replace("_", " "))
                    if val and val.strip():
                        val_clean = val.strip().lower()
                        if val_clean in HEAD_CLASSES[head]:
                            entry[head] = val_clean

                if entry:
                    labels_map[fname_clean] = entry

    return labels_map


def infer_classes_from_path(file_path: Path) -> Dict[str, str]:
    """
    Deteksi kelas berdasarkan nama file dan folder induk menggunakan aturan regex.
    Satu foto bisa memiliki label untuk lebih dari 1 head (misal foto berisi daun kuning & buah hijau).
    """
    # Bersihkan nama untuk pencarian (folder induk + nama file tanpa ekstensi)
    search_string = f"{file_path.parent.name} {file_path.stem}".lower()

    detected: Dict[str, str] = {}

    for head, classes_dict in KEYWORD_PATTERNS.items():
        # Cek apakah subfolder langsung bernama salah satu kelas
        parent_name = file_path.parent.name.lower()
        if parent_name in HEAD_CLASSES[head]:
            detected[head] = parent_name
            continue

        # Cocokkan pola kata kunci dengan prioritas pola spesifik dulu
        matched_class = None
        for cls_name, patterns in classes_dict.items():
            for pat in patterns:
                if re.search(r"(?:^|[^a-zA-Z])" + pat + r"(?:[^a-zA-Z]|$)", search_string):
                    matched_class = cls_name
                    break
            if matched_class:
                break

        if matched_class:
            detected[head] = matched_class

    return detected


def prompt_user_for_classes(file_path: Path) -> Dict[str, str]:
    """Prompt interaktif di terminal jika user mengaktifkan --interactive."""
    print(f"\n[Interaktif] Mengklasifikasikan foto: {file_path.name}")
    labels: Dict[str, str] = {}

    for head, cls_list in HEAD_CLASSES.items():
        print(f"  Pilih target untuk '{head}':")
        for i, c in enumerate(cls_list, 1):
            print(f"    [{i}] {c}")
        print("    [s] Lewati / tidak relevan untuk head ini")

        choice = input("  Pilihan (1-4 atau s): ").strip().lower()
        if choice in ["1", "2", "3", "4"]:
            idx = int(choice) - 1
            if idx < len(cls_list):
                labels[head] = cls_list[idx]
        else:
            print(f"  -> Melewati head '{head}'")

    return labels


def split_and_distribute(
    samples_per_head_class: Dict[Tuple[str, str], List[Path]],
    output_dir: Path,
    val_ratio: float = 0.2,
    seed: int = 42,
    structure: str = "split_first",
    copy_mode: str = "copy",
) -> Dict[str, Dict[str, Dict[str, int]]]:
    """
    Membagi sampel tiap kelas secara stratified menjadi train dan val (misal 80/20).
    Menyalin file ke direktori tujuan.
    
    Mengembalikan statistik:
    stats[head][class] = {"train": count, "val": count, "total": count}
    """
    rng = random.Random(seed)
    stats: Dict[str, Dict[str, Dict[str, int]]] = {
        head: {cls: {"train": 0, "val": 0, "total": 0} for cls in classes}
        for head, classes in HEAD_CLASSES.items()
    }

    for (head, cls_name), file_list in samples_per_head_class.items():
        # Pastikan list terurut sebelum shuffle untuk konsistensi
        file_list_sorted = sorted(file_list, key=lambda p: p.name)
        rng.shuffle(file_list_sorted)

        total_files = len(file_list_sorted)
        if total_files == 0:
            continue

        if total_files == 1:
            # Jika hanya 1 file, letakkan di train agar model dapat melihat kelas tersebut
            train_files = file_list_sorted
            val_files = []
        else:
            val_count = max(1, int(round(total_files * val_ratio)))
            # Pastikan selalu ada minimal 1 di train jika total >= 2
            if val_count >= total_files:
                val_count = total_files - 1
            val_files = file_list_sorted[:val_count]
            train_files = file_list_sorted[val_count:]

        stats[head][cls_name]["train"] = len(train_files)
        stats[head][cls_name]["val"] = len(val_files)
        stats[head][cls_name]["total"] = total_files

        # Tentukan lokasi folder tujuan berdasarkan opsi struktur
        for split_name, files in [("train", train_files), ("val", val_files)]:
            if structure == "split_first":
                # dataset/train/leaf_health/kuning/
                dest_folder = output_dir / split_name / head / cls_name
            elif structure == "head_first":
                # dataset/leaf_health/train/kuning/
                dest_folder = output_dir / head / split_name / cls_name
            else:
                # Flat dataset/leaf_health/kuning/
                dest_folder = output_dir / head / cls_name

            dest_folder.mkdir(parents=True, exist_ok=True)

            for src_file in files:
                dest_file = dest_folder / src_file.name
                # Jika nama file bertabrakan, tambahkan prefix unik
                counter = 1
                while dest_file.exists() and dest_file.resolve() != src_file.resolve():
                    dest_file = dest_folder / f"{src_file.stem}_{counter}{src_file.suffix}"
                    counter += 1

                if copy_mode == "copy":
                    shutil.copy2(src_file, dest_file)
                elif copy_mode == "move":
                    shutil.move(src_file, dest_file)
                elif copy_mode == "symlink":
                    try:
                        dest_file.symlink_to(src_file.resolve())
                    except OSError:
                        shutil.copy2(src_file, dest_file)

    return stats


def print_summary_table(
    stats: Dict[str, Dict[str, Dict[str, int]]],
    total_scanned: int,
    total_valid: int,
    total_corrupt: int,
    total_unlabeled: int,
    output_dir: Path,
):
    """Menampilkan tabel ringkasan dataset dan evaluasi kecukupan foto per kelas."""
    print("\n" + "=" * 78)
    print("           RINGKASAN DATASET CABAI (TRAIN / VAL 80:20)")
    print("=" * 78)
    print(f"Total file dipindai   : {total_scanned}")
    print(f"Gambar valid         : {total_valid}")
    print(f"File rusak/dilewati  : {total_corrupt}")
    print(f"Gambar tanpa label   : {total_unlabeled}")
    print(f"Folder output        : {output_dir.resolve()}")
    print("-" * 78)
    print(f"{'Kategori (Head)':<16} | {'Kelas':<20} | {'Train':>6} | {'Val':>5} | {'Total':>6} | {'Status Kecukupan'}")
    print("-" * 78)

    warning_count = 0
    ready_count = 0

    for head, classes in stats.items():
        for cls_name, counts in classes.items():
            train_c = counts["train"]
            val_c = counts["val"]
            tot_c = counts["total"]

            if tot_c == 0:
                status = "[KOSONG] Belum ada foto! Segera tambahkan."
                warning_count += 1
            elif tot_c < 20:
                status = f"[KURANG] ({tot_c} foto) Disarankan min. 30-50 foto"
                warning_count += 1
            elif tot_c < 50:
                status = f"[CUKUP AWAL] ({tot_c} foto) Bisa dilatih, tambah lagi nanti"
                ready_count += 1
            else:
                status = f"[SIAP] ({tot_c} foto) Data memadai"
                ready_count += 1

            print(f"{head:<16} | {cls_name:<20} | {train_c:>6} | {val_c:>5} | {tot_c:>6} | {status}")
        print("-" * 78)

    print("\nEvaluasi Kesiapan Training:")
    if warning_count > 0:
        print(f"  [!] Perhatian: Ada {warning_count} kelas yang masih KOSONG atau KURANG dari 20 foto.")
        print("      Model CNN tetap dapat dilatih, namun akurasi pada kelas tersebut akan rendah.")
        print("      Fokuskan pengambilan foto pada kelas-kelas bertanda [KOSONG] dan [KURANG] di atas.")
    else:
        print("  [*] SEMUA KELAS SIAP! Dataset memiliki distribusi yang seimbang untuk training.")

    print(f"\nLangkah berikutnya untuk melatih model:")
    print(f"  python backend/app/ml/train_cnn.py")
    print("=" * 78 + "\n")


def generate_starter_csv(raw_dir: Path, unlabeled_files: List[Path]):
    """Buat file template CSV di folder mentah jika ada gambar tanpa label."""
    if not unlabeled_files:
        return

    csv_path = raw_dir / "labels_template.csv"
    try:
        with open(csv_path, "w", newline="", encoding="utf-8") as f:
            writer = csv.writer(f)
            writer.writerow(["filename", "leaf_health", "fruit_stage", "condition"])
            for p in unlabeled_files:
                writer.writerow([p.name, "", "", ""])
        print(f"[Info] Dibuat template anotasi: '{csv_path}'. Anda dapat mengisinya lalu jalankan ulang:")
        print(f"       python backend/app/ml/prepare_dataset.py -r \"{raw_dir}\" --labels \"{csv_path}\"")
    except Exception as e:
        print(f"[Warning] Gagal membuat file labels_template.csv: {e}")


def create_dummy_raw_dataset(dest_dir: Path) -> Path:
    """
    Membuat folder dataset dummy berisi beberapa contoh gambar asli (sintetis via PIL)
    untuk pengujian end-to-end tanpa memerlukan foto cabai asli saat ini.
    """
    from PIL import ImageDraw

    dest_dir.mkdir(parents=True, exist_ok=True)

    sample_specs = [
        # (filename, background_color, shape_color, shape_type)
        ("daun_sehat_01.jpg", (34, 139, 34), (50, 205, 50), "leaf"),
        ("daun_sehat_02.jpg", (46, 139, 87), (60, 179, 113), "leaf"),
        ("daun_sehat_03.jpg", (34, 139, 34), (46, 139, 87), "leaf"),
        ("kuning_klorosis_01.jpg", (218, 165, 32), (255, 215, 0), "leaf"),
        ("daun_kuning_02.jpg", (200, 180, 50), (240, 230, 80), "leaf"),
        ("keriting_virus_01.jpg", (85, 107, 47), (107, 142, 35), "curl"),
        ("daun_keriting_02.jpg", (70, 90, 40), (90, 120, 50), "curl"),
        ("bercak_daun_spot_01.jpg", (34, 139, 34), (139, 69, 19), "spots"),
        ("bercak_antraknosa_02.jpg", (40, 120, 40), (100, 50, 20), "spots"),
        ("bunga_mekar_01.jpg", (245, 245, 245), (255, 255, 224), "flower"),
        ("bunga_cabai_02.jpg", (240, 240, 240), (255, 250, 205), "flower"),
        ("buah_hijau_rawit_01.jpg", (34, 139, 34), (0, 100, 0), "fruit_green"),
        ("buah_hijau_02.jpg", (46, 139, 87), (34, 139, 34), "fruit_green"),
        ("buah_matang_merah_01.jpg", (178, 34, 34), (255, 0, 0), "fruit_red"),
        ("buah_matang_merah_02.jpg", (220, 20, 60), (205, 92, 92), "fruit_red"),
        ("kondisi_stres_air_layu_01.jpg", (160, 140, 90), (120, 100, 60), "leaf"),
        ("kondisi_stres_air_02.jpg", (150, 130, 80), (110, 90, 50), "leaf"),
        ("defisiensi_nutrisi_01.jpg", (189, 183, 107), (218, 165, 32), "leaf"),
        ("defisiensi_nutrisi_02.jpg", (170, 160, 90), (200, 150, 40), "leaf"),
        ("hama_kutu_penyakit_01.jpg", (60, 80, 50), (20, 20, 20), "spots"),
        ("hama_penyakit_thrips_02.jpg", (70, 85, 55), (30, 30, 30), "spots"),
        ("tanaman_sehat_prime_01.jpg", (34, 139, 34), (0, 128, 0), "leaf"),
        ("tanaman_tanpa_buah_01.jpg", (34, 139, 34), (46, 139, 87), "leaf"),
    ]

    for fname, bg_col, shape_col, shape_type in sample_specs:
        img = Image.new("RGB", (224, 224), color=bg_col)
        draw = ImageDraw.Draw(img)

        if shape_type == "leaf":
            draw.ellipse([40, 30, 184, 194], fill=shape_col)
            draw.line([112, 30, 112, 194], fill=(20, 60, 20), width=3)
        elif shape_type == "curl":
            draw.arc([40, 40, 184, 184], start=0, end=270, fill=shape_col, width=15)
        elif shape_type == "spots":
            draw.ellipse([40, 30, 184, 194], fill=shape_col)
            for x, y, r in [(70, 80, 12), (140, 90, 15), (100, 140, 10), (130, 160, 14)]:
                draw.ellipse([x - r, y - r, x + r, y + r], fill=(60, 30, 10))
        elif shape_type == "flower":
            draw.ellipse([70, 70, 154, 154], fill=shape_col)
            draw.ellipse([97, 97, 127, 127], fill=(255, 215, 0))
        elif shape_type in ["fruit_green", "fruit_red"]:
            draw.polygon([(112, 20), (140, 120), (112, 200), (84, 120)], fill=shape_col)
            draw.line([112, 10, 112, 30], fill=(0, 100, 0), width=5)

        img.save(dest_dir / fname, quality=90)

    # Tambahkan file corrupt dan file non-gambar untuk memvalidasi proteksi
    corrupt_file = dest_dir / "foto_corrupt_dummy.jpg"
    with open(corrupt_file, "wb") as f:
        f.write(b"CORRUPTED_NOT_AN_IMAGE_HEADER")

    empty_file = dest_dir / "foto_kosong_dummy.png"
    empty_file.touch()

    text_file = dest_dir / "catatan_pengambilan_foto.txt"
    with open(text_file, "w", encoding="utf-8") as f:
        f.write("Catatan: Foto diambil tanggal 26 September 2026 di kebun cabai.")

    return dest_dir


def prepare_dataset(
    raw_dir: Path,
    output_dir: Path,
    val_ratio: float = 0.2,
    seed: int = 42,
    labels_file: Optional[Path] = None,
    interactive: bool = False,
    structure: str = "split_first",
    copy_mode: str = "copy",
) -> Dict[str, Dict[str, Dict[str, int]]]:
    """
    Fungsi utama untuk memproses folder foto mentah ke dataset terstruktur.
    """
    if not raw_dir.is_dir():
        raise FileNotFoundError(f"Folder foto mentah tidak ditemukan: {raw_dir}")

    output_dir.mkdir(parents=True, exist_ok=True)

    # 1. Muat mapping label jika ada file manifest CSV/JSON
    manifest_map = {}
    if labels_file and labels_file.is_file():
        print(f"[*] Memuat label dari: {labels_file}")
        manifest_map = load_label_manifest(labels_file)
    else:
        # Cek otomatis apakah ada file labels.csv di raw_dir
        for auto_csv in [raw_dir / "labels.csv", raw_dir / "metadata.csv"]:
            if auto_csv.is_file():
                print(f"[*] Menemukan file label otomatis: {auto_csv}")
                manifest_map = load_label_manifest(auto_csv)
                break

    # 2. Pindai dan validasi semua file di raw_dir (rekursif)
    all_files = [p for p in raw_dir.rglob("*") if p.is_file()]
    total_scanned = len(all_files)

    valid_files: List[Path] = []
    corrupt_files: List[Tuple[Path, str]] = []

    for file_path in all_files:
        is_valid, reason = validate_image_file(file_path)
        if is_valid:
            valid_files.append(file_path)
        else:
            corrupt_files.append((file_path, reason or "Tidak valid"))

    print(f"\n[*] Hasil pemindaian awal:")
    print(f"    - Total file ditemukan : {total_scanned}")
    print(f"    - File gambar valid    : {len(valid_files)}")
    print(f"    - File dilewati/korup  : {len(corrupt_files)}")

    if corrupt_files:
        print("\n[!] Daftar file yang dilewati:")
        for cf, reason in corrupt_files[:10]:
            print(f"    x {cf.name} -> {reason}")
        if len(corrupt_files) > 10:
            print(f"    ... dan {len(corrupt_files) - 10} file lainnya.")

    # 3. Klasifikasikan setiap file valid ke target head & class
    samples_per_head_class: Dict[Tuple[str, str], List[Path]] = {
        (head, cls_name): []
        for head, classes in HEAD_CLASSES.items()
        for cls_name in classes
    }

    unassigned_files: List[Path] = []

    for img_path in valid_files:
        assigned = False

        # Prioritas 1: Dari file manifest CSV/JSON
        if img_path.name in manifest_map:
            labels = manifest_map[img_path.name]
            for head, cls_val in labels.items():
                if head in HEAD_CLASSES and cls_val in HEAD_CLASSES[head]:
                    samples_per_head_class[(head, cls_val)].append(img_path)
                    assigned = True

        # Prioritas 2: Dari nama file atau folder induk
        if not assigned:
            inferred = infer_classes_from_path(img_path)
            for head, cls_val in inferred.items():
                if head in HEAD_CLASSES and cls_val in HEAD_CLASSES[head]:
                    samples_per_head_class[(head, cls_val)].append(img_path)
                    assigned = True

        # Prioritas 3: Interaktif (jika diaktifkan)
        if not assigned and interactive and sys.stdin.isatty():
            user_labels = prompt_user_for_classes(img_path)
            for head, cls_val in user_labels.items():
                if head in HEAD_CLASSES and cls_val in HEAD_CLASSES[head]:
                    samples_per_head_class[(head, cls_val)].append(img_path)
                    assigned = True

        if not assigned:
            unassigned_files.append(img_path)

    if unassigned_files:
        print(f"\n[!] Ada {len(unassigned_files)} gambar valid yang belum memiliki label (nama file tidak mengandung kata kunci).")
        generate_starter_csv(raw_dir, unassigned_files)

    # 4. Bagi dataset ke train & val dan salin ke direktori output
    stats = split_and_distribute(
        samples_per_head_class=samples_per_head_class,
        output_dir=output_dir,
        val_ratio=val_ratio,
        seed=seed,
        structure=structure,
        copy_mode=copy_mode,
    )

    # 5. Tampilkan ringkasan data
    print_summary_table(
        stats=stats,
        total_scanned=total_scanned,
        total_valid=len(valid_files),
        total_corrupt=len(corrupt_files),
        total_unlabeled=len(unassigned_files),
        output_dir=output_dir,
    )

    return stats


def main():
    default_output = Path(__file__).resolve().parent.parent / "models_data" / "dataset"
    default_dummy = Path(__file__).resolve().parent.parent / "models_data" / "dummy_raw_photos"

    parser = argparse.ArgumentParser(
        description="Persiapan dan validasi dataset foto cabai untuk melatih CNN (train_cnn.py)"
    )
    parser.add_argument(
        "-r", "--raw-dir",
        type=str,
        default=None,
        help="Path folder berisi foto-foto mentah cabai",
    )
    parser.add_argument(
        "-o", "--output-dir",
        type=str,
        default=str(default_output),
        help=f"Folder tujuan penyimpanan dataset terstruktur (default: {default_output})",
    )
    parser.add_argument(
        "--val-ratio",
        type=float,
        default=0.2,
        help="Proporsi data validasi (default: 0.2 = 20%% val, 80%% train)",
    )
    parser.add_argument(
        "--seed",
        type=int,
        default=42,
        help="Random seed untuk pembagian train/val yang konsisten (default: 42)",
    )
    parser.add_argument(
        "-l", "--labels",
        type=str,
        default=None,
        help="Path ke file manifest label (CSV atau JSON) jika ada",
    )
    parser.add_argument(
        "-i", "--interactive",
        action="store_true",
        help="Aktifkan mode interaktif di terminal untuk gambar yang belum memiliki label",
    )
    parser.add_argument(
        "--structure",
        choices=["split_first", "head_first", "flat"],
        default="split_first",
        help="Struktur folder: split_first (train/<head>/<kelas>), head_first (<head>/train/<kelas>), flat (<head>/<kelas>)",
    )
    parser.add_argument(
        "--copy-mode",
        choices=["copy", "move", "symlink"],
        default="copy",
        help="Metode transfer file: copy (aman, duplikasi file), move (pindahkan), symlink (hemat ruang disk)",
    )
    parser.add_argument(
        "--test-dummy",
        action="store_true",
        help="Otomatis buat folder dataset dummy lalu jalankan proses pengujian",
    )

    args = parser.parse_args()

    # Mode uji cepat dengan dataset dummy
    if args.test_dummy or args.raw_dir is None:
        if args.raw_dir is None:
            print("[*] Argumen --raw-dir tidak ditentukan. Membuat dataset dummy untuk demonstrasi & pengujian...")
            raw_path = default_dummy
            create_dummy_raw_dataset(raw_path)
            print(f"[+] Dataset dummy dibuat di: {raw_path}")
        else:
            raw_path = Path(args.raw_dir)
            if args.test_dummy:
                create_dummy_raw_dataset(raw_path)
    else:
        raw_path = Path(args.raw_dir)

    out_path = Path(args.output_dir)
    labels_path = Path(args.labels) if args.labels else None

    prepare_dataset(
        raw_dir=raw_path,
        output_dir=out_path,
        val_ratio=args.val_ratio,
        seed=args.seed,
        labels_file=labels_path,
        interactive=args.interactive,
        structure=args.structure,
        copy_mode=args.copy_mode,
    )


if __name__ == "__main__":
    main()
