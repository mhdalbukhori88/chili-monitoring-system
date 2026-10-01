"""
Script untuk mengintegrasikan 'dataset baru 1' ke dalam dataset utama CNN.
- Dataset 1 (56 foto): Bibit / Vegetatif (fruit_stage: tidak_ada, leaf_health: sehat/kuning, condition: sehat)
- Dataset 2 (40 foto): Tanaman Berbuah Rawit (fruit_stage: buah_hijau, leaf_health: keriting/kuning, condition: hama_penyakit)
"""
import os
import shutil
import random
from pathlib import Path

def ingest_dataset_baru_1():
    base_dir = Path(__file__).resolve().parent.parent.parent.parent
    src_d1 = base_dir / "dataset baru 1" / "Dataset 1"
    src_d2 = base_dir / "dataset baru 1" / "Dataset 2"
    target_dataset = base_dir / "backend" / "app" / "models_data" / "dataset"

    if not src_d1.exists() or not src_d2.exists():
        raise FileNotFoundError(f"Folder sumber tidak ditemukan di {src_d1} atau {src_d2}")

    files_d1 = sorted([f for f in src_d1.iterdir() if f.suffix.lower() in [".jpg", ".jpeg", ".png"]])
    files_d2 = sorted([f for f in src_d2.iterdir() if f.suffix.lower() in [".jpg", ".jpeg", ".png"]])

    print(f"Ditemukan {len(files_d1)} foto di Dataset 1 (Bibit / Vegetatif)")
    print(f"Ditemukan {len(files_d2)} foto di Dataset 2 (Tanaman Berbuah Rawit)")

    rng = random.Random(42)
    rng.shuffle(files_d1)
    rng.shuffle(files_d2)

    # 80/20 train/val split
    split_d1 = int(len(files_d1) * 0.8)
    d1_train, d1_val = files_d1[:split_d1], files_d1[split_d1:]

    split_d2 = int(len(files_d2) * 0.8)
    d2_train, d2_val = files_d2[:split_d2], files_d2[split_d2:]

    # Distribusi Dataset 1 (tidak_ada fruit, vegetative seedling)
    # Target 1: fruit_stage/tidak_ada
    # Target 2: leaf_health/sehat & kuning
    # Target 3: condition/sehat & defisiensi_nutrisi
    copied_counts = {"fruit_stage": 0, "leaf_health": 0, "condition": 0}

    def copy_files(file_list, split_name, head_name, class_name):
        dest_dir = target_dataset / split_name / head_name / class_name
        dest_dir.mkdir(parents=True, exist_ok=True)
        count = 0
        for f in file_list:
            dest_file = dest_dir / f"nb1_{f.name}"
            shutil.copy2(f, dest_file)
            count += 1
        return count

    # Ingest Dataset 1 -> fruit_stage/tidak_ada
    copied_counts["fruit_stage"] += copy_files(d1_train, "train", "fruit_stage", "tidak_ada")
    copied_counts["fruit_stage"] += copy_files(d1_val, "val", "fruit_stage", "tidak_ada")

    # Ingest Dataset 1 -> leaf_health (bibit sehat & klorosis ringan)
    copied_counts["leaf_health"] += copy_files(d1_train[:len(d1_train)//2], "train", "leaf_health", "sehat")
    copied_counts["leaf_health"] += copy_files(d1_train[len(d1_train)//2:], "train", "leaf_health", "kuning")
    copied_counts["leaf_health"] += copy_files(d1_val[:len(d1_val)//2], "val", "leaf_health", "sehat")
    copied_counts["leaf_health"] += copy_files(d1_val[len(d1_val)//2:], "val", "leaf_health", "kuning")

    # Ingest Dataset 1 -> condition (sehat)
    copied_counts["condition"] += copy_files(d1_train, "train", "condition", "sehat")
    copied_counts["condition"] += copy_files(d1_val, "val", "condition", "sehat")

    # Ingest Dataset 2 -> fruit_stage/buah_hijau
    copied_counts["fruit_stage"] += copy_files(d2_train, "train", "fruit_stage", "buah_hijau")
    copied_counts["fruit_stage"] += copy_files(d2_val, "val", "fruit_stage", "buah_hijau")

    # Ingest Dataset 2 -> leaf_health (daun keriting & kuning mosaik)
    copied_counts["leaf_health"] += copy_files(d2_train[:len(d2_train)//2], "train", "leaf_health", "keriting")
    copied_counts["leaf_health"] += copy_files(d2_train[len(d2_train)//2:], "train", "leaf_health", "kuning")
    copied_counts["leaf_health"] += copy_files(d2_val[:len(d2_val)//2], "val", "leaf_health", "keriting")
    copied_counts["leaf_health"] += copy_files(d2_val[len(d2_val)//2:], "val", "leaf_health", "kuning")

    # Ingest Dataset 2 -> condition (hama_penyakit)
    copied_counts["condition"] += copy_files(d2_train, "train", "condition", "hama_penyakit")
    copied_counts["condition"] += copy_files(d2_val, "val", "condition", "hama_penyakit")

    print("\n[OK] Integrasi Dataset Baru 1 berhasil!")
    print(f"- Total file disalin ke fruit_stage: {copied_counts['fruit_stage']}")
    print(f"- Total file disalin ke leaf_health: {copied_counts['leaf_health']}")
    print(f"- Total file disalin ke condition:   {copied_counts['condition']}")

if __name__ == "__main__":
    ingest_dataset_baru_1()
