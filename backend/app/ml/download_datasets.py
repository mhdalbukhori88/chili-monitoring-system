"""
Script utilitas untuk mengunduh dan menyusun dataset foto cabai skala besar
dari penyimpanan eksternal (Google Drive / Hugging Face / GitHub Releases)
ke folder lokal proyek.
"""
import os
import sys
import argparse
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent.parent.parent

DATASET_INFO = {
    "leaf_disease": {
        "name": "Chili Leaf Disease Dataset (1.07 GB, 5.000 foto)",
        "target_dir": BASE_DIR / "Chili-Leaf-Disease-Dataset-main",
        "description": "Foto daun cabai: sehat, bercak daun, kuning, keriting.",
    },
    "growth_augmented": {
        "name": "Chili Growth & Augmented Dataset (8.84 GB, 25.570 foto)",
        "target_dir": BASE_DIR / "dataset baru",
        "description": "Foto fase pertumbuhan cabai dan augmentasi variasi cahaya/sudut.",
    },
    "dataset_baru_1": {
        "name": "Dataset Baru 1 (23.3 MB, 96 foto)",
        "target_dir": BASE_DIR / "dataset baru 1",
        "description": "Foto bibit polibag & tanaman rawit berbuah (sudah ada di repo).",
    }
}


def check_local_status():
    print("=" * 65)
    print("           STATUS DATASET LOKAL CHILI MONITORING SYSTEM")
    print("=" * 65)
    for key, info in DATASET_INFO.items():
        p = info["target_dir"]
        exists = p.exists()
        count = 0
        sz_mb = 0.0
        if exists:
            files = [f for f in p.rglob("*") if f.is_file()]
            count = len(files)
            sz_mb = sum(f.stat().st_size for f in files) / (1024 * 1024)
        status = "[TERSEDIA]" if exists and count > 0 else "[BELUM DIUNDUH]"
        print(f"\n* {info['name']}")
        print(f"  Status    : {status} ({count} berkas, {sz_mb:.2f} MB)")
        print(f"  Direktori : {p}")
        print(f"  Deskripsi : {info['description']}")


def main():
    parser = argparse.ArgumentParser(description="Pemeriksa & Pengunduh Dataset Cabai")
    parser.add_argument("--status", action="store_true", help="Cek status dataset lokal")
    args = parser.parse_args()

    check_local_status()
    print("\n" + "=" * 65)
    print("Catatan: Untuk mengunduh dataset lengkap atau menempatkannya secara manual,")
    print("silakan kunjungi tab 'Releases' pada repositori GitHub:")
    print("https://github.com/mhdalbukhori88/chili-monitoring-system/releases")
    print("=" * 65)


if __name__ == "__main__":
    main()
