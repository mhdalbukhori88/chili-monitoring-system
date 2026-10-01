import json
import urllib.request
from sqlalchemy.orm import Session
from app import models
from app.config import settings

# Ambang batas kondisi ideal tanaman cabai (bisa disesuaikan)
THRESHOLDS = {
    "temperature_c": (18, 32),
    "humidity_pct": (50, 90),
    "soil_moisture_pct": (40, 85),
    "soil_ph": (5.5, 7.0),
}


def send_telegram_alert(message: str, bot_token: str | None = None, chat_id: str | None = None) -> bool:
    """Kirim pesan peringatan instan ke Telegram Bot."""
    token = bot_token or settings.TELEGRAM_BOT_TOKEN
    chat = chat_id or settings.TELEGRAM_CHAT_ID
    if not token or not chat:
        return False
    try:
        url = f"https://api.telegram.org/bot{token}/sendMessage"
        payload = json.dumps({"chat_id": chat, "text": message, "parse_mode": "Markdown"}).encode("utf-8")
        req = urllib.request.Request(url, data=payload, headers={"Content-Type": "application/json"})
        with urllib.request.urlopen(req, timeout=5) as resp:
            return resp.status == 200
    except Exception as e:
        print(f"[warning] Gagal mengirim alert Telegram: {e}")
        return False


def send_webhook_alert(data: dict, webhook_url: str | None = None) -> bool:
    """Kirim data JSON peringatan instan ke Webhook URL."""
    target_url = webhook_url or settings.ALERT_WEBHOOK_URL
    if not target_url:
        return False
    try:
        payload = json.dumps(data).encode("utf-8")
        req = urllib.request.Request(target_url, data=payload, headers={"Content-Type": "application/json"})
        with urllib.request.urlopen(req, timeout=5) as resp:
            return resp.status in (200, 201, 202, 204)
    except Exception as e:
        print(f"[warning] Gagal mengirim alert Webhook: {e}")
        return False


def dispatch_alert_notifications(plant_name: str, severity: str, source: str, message: str):
    """Kirim notifikasi eksternal terpadu (Telegram dan Webhook) secara aman."""
    prefix = "🚨 *[PERINGATAN KRITIS CABAI]*" if severity == "critical" else "⚠️ *[PERINGATAN ANOMALI CABAI]*"
    tg_text = f"{prefix}\n*Tanaman:* {plant_name}\n*Sumber:* {source.upper()}\n*Detail:* {message}"
    send_telegram_alert(tg_text)
    send_webhook_alert({
        "event": "chili_anomaly_alert",
        "plant_name": plant_name,
        "severity": severity,
        "source": source,
        "message": message,
    })


def evaluate_sensor_for_alerts(db: Session, reading: models.SensorReading):
    checks = [
        ("temperature_c", reading.temperature_c, "Suhu"),
        ("humidity_pct", reading.humidity_pct, "Kelembapan udara"),
        ("soil_moisture_pct", reading.soil_moisture_pct, "Kelembapan tanah"),
        ("soil_ph", reading.soil_ph, "pH tanah"),
    ]

    plant = db.query(models.Plant.name).filter(models.Plant.id == reading.plant_id).first()
    plant_name = plant[0] if plant else f"Tanaman #{reading.plant_id}"

    for key, value, label in checks:
        low, high = THRESHOLDS[key]
        if value is None:
            continue
        if value < low or value > high:
            severity = "critical" if (value < low * 0.8 or value > high * 1.2) else "warning"
            message = f"{label} di luar rentang ideal: {value} (ideal {low}-{high})"
            db.add(models.Alert(
                plant_id=reading.plant_id,
                severity=severity,
                source="sensor",
                message=message,
            ))
            dispatch_alert_notifications(plant_name, severity, "sensor", message)


def evaluate_detection_for_alerts(db: Session, plant_id: int, detection: models.Detection):
    plant = db.query(models.Plant.name).filter(models.Plant.id == plant_id).first()
    plant_name = plant[0] if plant else f"Tanaman #{plant_id}"

    if detection.condition_label and detection.condition_label != "sehat":
        severity = "critical" if detection.condition_label == "hama_penyakit" else "warning"
        message = (
            f"Kondisi tanaman terdeteksi '{detection.condition_label}' "
            f"(confidence {detection.condition_confidence:.2f})"
        )
        db.add(models.Alert(
            plant_id=plant_id,
            severity=severity,
            source="detection",
            message=message,
        ))
        dispatch_alert_notifications(plant_name, severity, "detection", message)

    if detection.leaf_health_label and detection.leaf_health_label != "sehat":
        message = (
            f"Kondisi daun terdeteksi '{detection.leaf_health_label}' "
            f"(confidence {detection.leaf_confidence:.2f})"
        )
        db.add(models.Alert(
            plant_id=plant_id,
            severity="warning",
            source="detection",
            message=message,
        ))
        dispatch_alert_notifications(plant_name, severity, "detection", message)
