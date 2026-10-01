"""
Wrapper inference yang dipanggil router. Memuat model jika file weight
sudah ada (hasil training); jika belum ada (skeleton awal, belum training),
fallback ke output dummy acak agar API tetap bisa didemokan end-to-end.
"""
import os
import numpy as np
import torch
from PIL import Image
from torchvision import transforms

from app.ml.cnn_model import build_model, LEAF_HEALTH_CLASSES, FRUIT_STAGE_CLASSES, CONDITION_CLASSES
from app.ml.lstm_model import build_model as build_lstm

MODELS_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "models_data"))
CNN_WEIGHTS_PATH = os.path.join(MODELS_DIR, "cnn_model.pt")

LSTM_WEIGHTS_PATH = os.path.join(MODELS_DIR, "lstm_growth_model.pt")
if not os.path.exists(LSTM_WEIGHTS_PATH):
    alt_lstm = os.path.join(os.path.dirname(__file__), "..", "..", "dummy_data", "lstm_growth_model.pt")
    if os.path.exists(alt_lstm):
        LSTM_WEIGHTS_PATH = alt_lstm

SCALER_PATH = os.path.join(MODELS_DIR, "lstm_scaler.npy")
if not os.path.exists(SCALER_PATH):
    alt_scaler = os.path.join(os.path.dirname(__file__), "..", "..", "dummy_data", "lstm_scaler.npy")
    if os.path.exists(alt_scaler):
        SCALER_PATH = alt_scaler

_IMG_TRANSFORM = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
])

_cnn_model = None
_lstm_model = None


def _get_cnn_model():
    global _cnn_model
    if _cnn_model is None:
        _cnn_model = build_model(pretrained=os.path.exists(CNN_WEIGHTS_PATH) is False)
        if os.path.exists(CNN_WEIGHTS_PATH):
            _cnn_model.load_state_dict(torch.load(CNN_WEIGHTS_PATH, map_location="cpu"))
        _cnn_model.eval()
    return _cnn_model


def _get_lstm_model():
    global _lstm_model
    if _lstm_model is None and os.path.exists(LSTM_WEIGHTS_PATH):
        _lstm_model = build_lstm()
        _lstm_model.load_state_dict(torch.load(LSTM_WEIGHTS_PATH, map_location="cpu"))
        _lstm_model.eval()
    return _lstm_model


def run_cnn_inference(image_path: str) -> dict:
    """Jalankan deteksi tanaman/daun/buah/kondisi pada satu foto."""
    model_has_weights = os.path.exists(CNN_WEIGHTS_PATH)

    if not model_has_weights:
        # Fallback estimasi jika weights belum dimuat
        rng = np.random.default_rng()
        return {
            "plant_detected": True,
            "plant_confidence": round(float(rng.uniform(0.85, 0.98)), 3),
            "leaf_count_estimate": int(rng.integers(25, 80)),
            "leaf_health_label": "sehat",
            "leaf_confidence": 0.88,
            "fruit_count_estimate": int(rng.integers(5, 20)),
            "fruit_stage_label": "buah_hijau",
            "fruit_confidence": 0.85,
            "condition_label": "sehat",
            "condition_confidence": 0.90,
        }

    model = _get_cnn_model()
    image = Image.open(image_path).convert("RGB")
    tensor = _IMG_TRANSFORM(image).unsqueeze(0)

    with torch.no_grad():
        out = model(tensor)

    plant_prob = torch.softmax(out["plant_logits"], dim=1)[0]
    leaf_prob = torch.softmax(out["leaf_health_logits"], dim=1)[0]
    fruit_prob = torch.softmax(out["fruit_stage_logits"], dim=1)[0]
    cond_prob = torch.softmax(out["condition_logits"], dim=1)[0]

    return {
        "plant_detected": bool(plant_prob.argmax().item() == 1),
        "plant_confidence": round(plant_prob.max().item(), 3),
        "leaf_count_estimate": int(out["leaf_count"].item()),
        "leaf_health_label": LEAF_HEALTH_CLASSES[leaf_prob.argmax().item()],
        "leaf_confidence": round(leaf_prob.max().item(), 3),
        "fruit_count_estimate": int(out["fruit_count"].item()),
        "fruit_stage_label": FRUIT_STAGE_CLASSES[fruit_prob.argmax().item()],
        "fruit_confidence": round(fruit_prob.max().item(), 3),
        "condition_label": CONDITION_CLASSES[cond_prob.argmax().item()],
        "condition_confidence": round(cond_prob.max().item(), 3),
    }


def run_lstm_prediction(growth_history: list, horizon_days: int = 14) -> list:
    """
    growth_history: list of GrowthRecord ORM objects (urut ascending by date).
    Mengembalikan list of dict prediksi untuk N hari ke depan (rolling forecast).
    """
    model = _get_lstm_model()
    seq_len = 7

    feature_rows = [
        [
            float(g.height_cm if g.height_cm is not None else 0),
            float(g.leaf_count if g.leaf_count is not None else 0),
            float(g.fruit_count if g.fruit_count is not None else 0),
            float(g.avg_temperature_c if g.avg_temperature_c is not None else 27),
            float(g.avg_humidity_pct if g.avg_humidity_pct is not None else 70),
            float(g.avg_soil_moisture_pct if g.avg_soil_moisture_pct is not None else 60),
        ]
        for g in growth_history[-seq_len:]
    ]

    if not feature_rows:
        return []

    if model is None:
        # Fallback ekstrapolasi linier sederhana jika bobot LSTM belum tersedia
        last = feature_rows[-1]
        trend = (feature_rows[-1][0] - feature_rows[0][0]) / max(len(feature_rows) - 1, 1)
        results = []
        for i in range(1, horizon_days + 1):
            results.append({
                "height_cm": max(0.0, round(last[0] + trend * i, 2)),
                "leaf_count": max(0.0, round(last[1] + i * 0.5, 1)),
                "fruit_count": max(0.0, round(last[2] + i * 0.3, 1)),
            })
        return results

    # Pad baris awal jika panjang riwayat < seq_len (misalnya hanya 5 hari)
    while len(feature_rows) < seq_len:
        feature_rows.insert(0, list(feature_rows[0]))

    raw_arr = np.array(feature_rows, dtype=np.float32)
    scaler_data = None
    if os.path.exists(SCALER_PATH):
        try:
            scaler_data = np.load(SCALER_PATH, allow_pickle=True).item()
        except Exception:
            scaler_data = None

    if scaler_data and "min" in scaler_data and "max" in scaler_data:
        s_min = np.array(scaler_data["min"], dtype=np.float32)
        s_max = np.array(scaler_data["max"], dtype=np.float32)
        s_diff = np.where(s_max - s_min == 0, 1.0, s_max - s_min)
        scaled_arr = (raw_arr - s_min) / s_diff
    else:
        s_min = np.zeros(6, dtype=np.float32)
        s_diff = np.ones(6, dtype=np.float32)
        scaled_arr = raw_arr

    window = torch.tensor(np.array([scaled_arr], dtype=np.float32))
    results = []
    with torch.no_grad():
        for _ in range(horizon_days):
            pred = model(window)[0]  # shape: (3,)
            pred_np = pred.cpu().numpy()
            unscaled = pred_np * s_diff[:3] + s_min[:3]

            results.append({
                "height_cm": max(0.0, round(float(unscaled[0]), 2)),
                "leaf_count": max(0.0, round(float(unscaled[1]), 1)),
                "fruit_count": max(0.0, round(float(unscaled[2]), 1)),
            })
            # Geser window
            new_row = torch.cat([pred, window[0, -1, 3:]]).unsqueeze(0).unsqueeze(0)
            window = torch.cat([window[:, 1:, :], new_row], dim=1)
    return results
