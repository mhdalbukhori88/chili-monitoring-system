"""SQLAlchemy ORM models untuk seluruh sistem."""
import os
from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, Float, DateTime, ForeignKey, Text, Boolean, JSON
)
from sqlalchemy.orm import relationship
from app.database import Base


class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True)
    username = Column(String(50), unique=True, nullable=False)
    email = Column(String(120), unique=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(120))
    created_at = Column(DateTime, default=datetime.utcnow)

    plants = relationship("Plant", back_populates="owner")


class Plant(Base):
    """Satu tanaman cabai yang dimonitor."""
    __tablename__ = "plants"
    id = Column(Integer, primary_key=True)
    owner_id = Column(Integer, ForeignKey("users.id"))
    name = Column(String(100), nullable=False)          # mis. "Cabai Rawit #1"
    variety = Column(String(100))                        # varietas cabai
    planted_at = Column(DateTime, default=datetime.utcnow)
    location = Column(String(150))                        # mis. "Greenhouse A - Baris 2"
    created_at = Column(DateTime, default=datetime.utcnow)

    owner = relationship("User", back_populates="plants")
    photos = relationship("Photo", back_populates="plant")
    sensor_readings = relationship("SensorReading", back_populates="plant")
    growth_records = relationship("GrowthRecord", back_populates="plant")
    alerts = relationship("Alert", back_populates="plant")


class Photo(Base):
    """Foto yang diupload manual secara berkala untuk dianalisis CNN."""
    __tablename__ = "photos"
    id = Column(Integer, primary_key=True)
    plant_id = Column(Integer, ForeignKey("plants.id"))
    file_path = Column(String(255), nullable=False)
    uploaded_at = Column(DateTime, default=datetime.utcnow)

    plant = relationship("Plant", back_populates="photos")
    detection = relationship("Detection", back_populates="photo", uselist=False)

    @property
    def photo_url(self) -> str:
        if not self.file_path:
            return ""
        filename = os.path.basename(self.file_path.replace("\\", "/"))
        return f"/uploads/{filename}"


class Detection(Base):
    """Hasil deteksi CNN dari satu foto: tanaman, daun, buah, kondisi."""
    __tablename__ = "detections"
    id = Column(Integer, primary_key=True)
    photo_id = Column(Integer, ForeignKey("photos.id"))

    plant_detected = Column(Boolean, default=False)
    plant_confidence = Column(Float, default=0.0)

    leaf_count_estimate = Column(Integer, default=0)
    leaf_health_label = Column(String(50))          # sehat / kuning / keriting / bercak
    leaf_confidence = Column(Float, default=0.0)

    fruit_count_estimate = Column(Integer, default=0)
    fruit_stage_label = Column(String(50))           # bunga / hijau / matang
    fruit_confidence = Column(Float, default=0.0)

    condition_label = Column(String(50))             # sehat / stres_air / defisiensi_nutrisi / hama_penyakit
    condition_confidence = Column(Float, default=0.0)

    raw_output = Column(JSON)                        # simpan raw logits/metadata jika perlu
    created_at = Column(DateTime, default=datetime.utcnow)

    photo = relationship("Photo", back_populates="detection")


class SensorReading(Base):
    """Data sensor lingkungan (suhu, kelembapan udara/tanah, pH, cahaya)."""
    __tablename__ = "sensor_readings"
    id = Column(Integer, primary_key=True)
    plant_id = Column(Integer, ForeignKey("plants.id"))
    temperature_c = Column(Float)
    humidity_pct = Column(Float)
    soil_moisture_pct = Column(Float)
    soil_ph = Column(Float)
    light_lux = Column(Float)
    recorded_at = Column(DateTime, default=datetime.utcnow)

    plant = relationship("Plant", back_populates="sensor_readings")


class GrowthRecord(Base):
    """Rekap harian pertumbuhan (dipakai untuk grafik & training LSTM)."""
    __tablename__ = "growth_records"
    id = Column(Integer, primary_key=True)
    plant_id = Column(Integer, ForeignKey("plants.id"))
    date = Column(DateTime, default=datetime.utcnow)
    height_cm = Column(Float)
    leaf_count = Column(Integer)
    fruit_count = Column(Integer)
    avg_temperature_c = Column(Float)
    avg_humidity_pct = Column(Float)
    avg_soil_moisture_pct = Column(Float)

    plant = relationship("Plant", back_populates="growth_records")


class Prediction(Base):
    """Hasil prediksi LSTM untuk pertumbuhan ke depan."""
    __tablename__ = "predictions"
    id = Column(Integer, primary_key=True)
    plant_id = Column(Integer, ForeignKey("plants.id"))
    predicted_for_date = Column(DateTime)
    predicted_height_cm = Column(Float)
    predicted_leaf_count = Column(Float)
    predicted_fruit_count = Column(Float)
    model_version = Column(String(50), default="v1-dummy")
    created_at = Column(DateTime, default=datetime.utcnow)


class Alert(Base):
    """Alert/anomaly yang terdeteksi (dari sensor maupun hasil deteksi CNN)."""
    __tablename__ = "alerts"
    id = Column(Integer, primary_key=True)
    plant_id = Column(Integer, ForeignKey("plants.id"))
    severity = Column(String(20))       # info / warning / critical
    source = Column(String(30))         # sensor / detection
    message = Column(Text)
    is_resolved = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    plant = relationship("Plant", back_populates="alerts")


class ChatMessage(Base):
    """Riwayat percakapan dengan AI Chat Assistant."""
    __tablename__ = "chat_messages"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    role = Column(String(10))    # user / assistant
    content = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
