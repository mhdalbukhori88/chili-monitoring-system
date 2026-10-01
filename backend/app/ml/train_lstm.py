"""
Latih model LSTM memakai dataset dummy (atau data asli begitu tersedia,
selama formatnya sama seperti dummy_growth_sensor_data.csv).
"""
import os
import numpy as np
import pandas as pd
import torch
import torch.nn as nn
from sklearn.preprocessing import MinMaxScaler

from app.ml.lstm_model import build_model, NUM_FEATURES

DATA_PATH = os.path.join(os.path.dirname(__file__), "..", "..", "dummy_data", "dummy_growth_sensor_data.csv")
MODEL_OUT = os.path.join(os.path.dirname(__file__), "..", "..", "dummy_data", "lstm_growth_model.pt")
SCALER_OUT = os.path.join(os.path.dirname(__file__), "..", "..", "dummy_data", "lstm_scaler.npy")

FEATURE_COLS = [
    "height_cm", "leaf_count", "fruit_count",
    "avg_temperature_c", "avg_humidity_pct", "avg_soil_moisture_pct",
]
TARGET_COLS = ["height_cm", "leaf_count", "fruit_count"]
SEQ_LEN = 7  # pakai 7 hari terakhir untuk prediksi hari berikutnya


def make_sequences(df: pd.DataFrame, seq_len: int = SEQ_LEN):
    X, y = [], []
    for plant_id, group in df.groupby("plant_id"):
        values = group[FEATURE_COLS].values
        for i in range(len(values) - seq_len):
            X.append(values[i:i + seq_len])
            y.append(values[i + seq_len][:len(TARGET_COLS)])
    return np.array(X), np.array(y)


def main(epochs: int = 50, lr: float = 1e-3):
    if not os.path.exists(DATA_PATH):
        raise FileNotFoundError(
            f"Dataset dummy belum ada di {DATA_PATH}. Jalankan dulu: "
            "python -m app.ml.generate_dummy_dataset"
        )

    df = pd.read_csv(DATA_PATH)

    scaler = MinMaxScaler()
    df[FEATURE_COLS] = scaler.fit_transform(df[FEATURE_COLS])
    np.save(SCALER_OUT, {"min": scaler.data_min_, "max": scaler.data_max_, "cols": FEATURE_COLS}, allow_pickle=True)

    X, y = make_sequences(df)
    X = torch.tensor(X, dtype=torch.float32)
    y = torch.tensor(y, dtype=torch.float32)

    model = build_model()
    optimizer = torch.optim.Adam(model.parameters(), lr=lr)
    loss_fn = nn.MSELoss()

    model.train()
    for epoch in range(epochs):
        optimizer.zero_grad()
        pred = model(X)
        loss = loss_fn(pred, y)
        loss.backward()
        optimizer.step()
        if (epoch + 1) % 10 == 0:
            print(f"Epoch {epoch + 1}/{epochs} - loss: {loss.item():.4f}")

    torch.save(model.state_dict(), MODEL_OUT)
    print(f"Model LSTM tersimpan: {MODEL_OUT}")


if __name__ == "__main__":
    main()
