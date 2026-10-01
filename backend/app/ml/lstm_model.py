"""
LSTM untuk memprediksi pertumbuhan tanaman cabai (tinggi, jumlah daun, jumlah buah)
berdasarkan urutan waktu (time series) data pertumbuhan + sensor.

Input per timestep (fitur): [height_cm, leaf_count, fruit_count,
                              avg_temperature_c, avg_humidity_pct, avg_soil_moisture_pct]
Output: prediksi [height_cm, leaf_count, fruit_count] untuk timestep berikutnya.
"""
import torch
import torch.nn as nn

NUM_FEATURES = 6
NUM_TARGETS = 3  # height_cm, leaf_count, fruit_count


class GrowthLSTM(nn.Module):
    def __init__(self, input_size=NUM_FEATURES, hidden_size=64, num_layers=2, output_size=NUM_TARGETS):
        super().__init__()
        self.lstm = nn.LSTM(
            input_size=input_size,
            hidden_size=hidden_size,
            num_layers=num_layers,
            batch_first=True,
            dropout=0.1 if num_layers > 1 else 0.0,
        )
        self.fc = nn.Linear(hidden_size, output_size)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        # x shape: (batch, seq_len, input_size)
        out, _ = self.lstm(x)
        last_step = out[:, -1, :]         # ambil output timestep terakhir
        return self.fc(last_step)          # (batch, output_size)


def build_model() -> GrowthLSTM:
    return GrowthLSTM()
