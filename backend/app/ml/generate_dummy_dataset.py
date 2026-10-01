"""
Generator dataset DUMMY untuk sensor & pertumbuhan (dipakai melatih LSTM
sebelum data sensor asli tersedia). Foto TIDAK di-dummy-kan - itu harus
foto asli yang Anda kumpulkan sendiri (lihat train_cnn.py).

Simulasi: kurva pertumbuhan cabai logistik (S-curve) + noise + siklus harian
suhu/kelembapan yang realistis secara kasar.
"""
import numpy as np
import pandas as pd
import os

OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "dummy_data")
os.makedirs(OUTPUT_DIR, exist_ok=True)


def logistic_growth(t, max_val, k, t0):
    return max_val / (1 + np.exp(-k * (t - t0)))


def generate_plant_series(plant_id: int, days: int = 90, seed: int = 0) -> pd.DataFrame:
    rng = np.random.default_rng(seed + plant_id)
    t = np.arange(days)

    height = logistic_growth(t, max_val=rng.uniform(60, 90), k=0.08, t0=rng.uniform(35, 55))
    height += rng.normal(0, 0.5, size=days).cumsum() * 0.05
    height = np.clip(height, 0, None)

    leaf_count = logistic_growth(t, max_val=rng.uniform(80, 140), k=0.09, t0=rng.uniform(25, 40))
    leaf_count += rng.normal(0, 1, size=days)
    leaf_count = np.clip(leaf_count, 0, None).round()

    fruit_count = logistic_growth(t, max_val=rng.uniform(15, 40), k=0.1, t0=rng.uniform(55, 75))
    fruit_count += rng.normal(0, 0.5, size=days)
    fruit_count = np.clip(fruit_count, 0, None).round()

    base_temp = 27 + 2 * np.sin(2 * np.pi * t / 30)
    temperature = base_temp + rng.normal(0, 0.8, size=days)

    base_humidity = 70 + 5 * np.sin(2 * np.pi * t / 20 + 1)
    humidity = np.clip(base_humidity + rng.normal(0, 3, size=days), 40, 100)

    base_moisture = 60 + rng.normal(0, 5, size=days)
    soil_moisture = np.clip(base_moisture, 20, 100)

    dates = pd.date_range(end=pd.Timestamp.today(), periods=days, freq="D")

    return pd.DataFrame({
        "plant_id": plant_id,
        "date": dates,
        "height_cm": height.round(2),
        "leaf_count": leaf_count.astype(int),
        "fruit_count": fruit_count.astype(int),
        "avg_temperature_c": temperature.round(2),
        "avg_humidity_pct": humidity.round(2),
        "avg_soil_moisture_pct": soil_moisture.round(2),
    })


def main(num_plants: int = 10, days: int = 90):
    all_dfs = [generate_plant_series(pid, days=days) for pid in range(1, num_plants + 1)]
    df = pd.concat(all_dfs, ignore_index=True)
    out_path = os.path.join(OUTPUT_DIR, "dummy_growth_sensor_data.csv")
    df.to_csv(out_path, index=False)
    print(f"Dataset dummy tersimpan: {out_path} ({len(df)} baris, {num_plants} tanaman, {days} hari)")


if __name__ == "__main__":
    main()
