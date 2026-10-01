"""Pydantic schemas untuk request/response API."""
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, EmailStr


# ---------- Auth ----------
class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str
    full_name: Optional[str] = None


class UserOut(BaseModel):
    id: int
    username: str
    email: str
    full_name: Optional[str]

    class Config:
        from_attributes = True


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[EmailStr] = None


class ChangePasswordRequest(BaseModel):
    old_password: str
    new_password: str


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


# ---------- Plant ----------
class PlantCreate(BaseModel):
    name: str
    variety: Optional[str] = None
    location: Optional[str] = None


class PlantUpdate(BaseModel):
    name: Optional[str] = None
    variety: Optional[str] = None
    location: Optional[str] = None


class PlantOut(BaseModel):
    id: int
    name: str
    variety: Optional[str]
    location: Optional[str]
    planted_at: datetime
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ---------- Detection ----------
class DetectionOut(BaseModel):
    id: int
    plant_detected: bool
    plant_confidence: float
    leaf_count_estimate: int
    leaf_health_label: Optional[str]
    leaf_confidence: float = 0.0
    fruit_count_estimate: int
    fruit_stage_label: Optional[str]
    fruit_confidence: float = 0.0
    condition_label: Optional[str]
    condition_confidence: float = 0.0
    created_at: datetime

    class Config:
        from_attributes = True


class PhotoOut(BaseModel):
    id: int
    plant_id: int
    file_path: str
    photo_url: Optional[str] = None
    uploaded_at: datetime
    detection: Optional[DetectionOut] = None

    class Config:
        from_attributes = True


# ---------- Sensor ----------
class SensorReadingCreate(BaseModel):
    plant_id: int
    temperature_c: float
    humidity_pct: float
    soil_moisture_pct: float
    soil_ph: Optional[float] = 6.5
    light_lux: Optional[float] = 10000.0


class SensorReadingOut(SensorReadingCreate):
    id: int
    recorded_at: datetime

    class Config:
        from_attributes = True


# ---------- Growth ----------
class GrowthRecordCreate(BaseModel):
    date: Optional[datetime] = None
    height_cm: float
    leaf_count: int
    fruit_count: int
    avg_temperature_c: Optional[float] = None
    avg_humidity_pct: Optional[float] = None
    avg_soil_moisture_pct: Optional[float] = None


class GrowthRecordOut(BaseModel):
    id: int
    date: datetime
    height_cm: float
    leaf_count: int
    fruit_count: int
    avg_temperature_c: Optional[float] = None
    avg_humidity_pct: Optional[float] = None
    avg_soil_moisture_pct: Optional[float] = None

    class Config:
        from_attributes = True


# ---------- Prediction ----------
class PredictionRequest(BaseModel):
    horizon_days: int = 14


class PredictionOut(BaseModel):
    predicted_for_date: datetime
    predicted_height_cm: float
    predicted_leaf_count: float
    predicted_fruit_count: float

    class Config:
        from_attributes = True


# ---------- Alert ----------
class AlertOut(BaseModel):
    id: int
    plant_id: int
    severity: str
    source: str
    message: str
    is_resolved: bool
    created_at: datetime

    class Config:
        from_attributes = True


# ---------- Chat ----------
class ChatRequest(BaseModel):
    message: str
    plant_id: Optional[int] = None


class ChatResponse(BaseModel):
    reply: str


class ChatMessageOut(BaseModel):
    id: int
    role: str
    content: str
    created_at: datetime

    class Config:
        from_attributes = True


# ---------- Dashboard ----------
class DashboardStats(BaseModel):
    total_plants: int
    total_photos: int
    total_alerts_unresolved: int
    avg_height_cm: Optional[float]
    avg_temperature_c: Optional[float]
    avg_soil_moisture_pct: Optional[float]


# ---------- External Alert Notifications ----------
class ExternalAlertTestRequest(BaseModel):
    bot_token: Optional[str] = None
    chat_id: Optional[str] = None
    webhook_url: Optional[str] = None
    message: Optional[str] = "Uji Coba: Sistem Notifikasi Peringatan Dini Cabai Terhubung Normal."


class ExternalAlertTestResponse(BaseModel):
    status: str
    telegram_sent: bool
    webhook_sent: bool
    message: str
