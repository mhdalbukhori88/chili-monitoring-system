import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.config import settings
from app.database import Base, engine
from app.routers import auth, plants, photos, sensors, growth, predictions, alerts, chat, dashboard

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Sistem Monitoring Cabai CNN-LSTM API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # ganti dengan domain vercel frontend saat production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")

app.include_router(auth.router, prefix="/auth", tags=["Auth"])
app.include_router(plants.router, prefix="/plants", tags=["Tanaman"])
app.include_router(photos.router, prefix="/photos", tags=["Foto & Deteksi"])
app.include_router(sensors.router, prefix="/sensors", tags=["Sensor"])
app.include_router(growth.router, prefix="/growth", tags=["Grafik Pertumbuhan"])
app.include_router(predictions.router, prefix="/predictions", tags=["Prediksi LSTM"])
app.include_router(alerts.router, prefix="/alerts", tags=["Anomaly/Alert"])
app.include_router(chat.router, prefix="/chat", tags=["AI Chat Assistant"])
app.include_router(dashboard.router, prefix="/dashboard", tags=["Dashboard"])


@app.get("/")
def root():
    return {"status": "ok", "message": "Chili Monitoring API is running"}


@app.get("/health")
def health():
    cnn_path = os.path.join(os.path.dirname(__file__), "app", "models_data", "cnn_model.pt")
    lstm_path = os.path.join(os.path.dirname(__file__), "app", "models_data", "lstm_growth_model.pt")
    return {
        "status": "healthy",
        "service": "chili-monitoring-backend",
        "cnn_model_ready": os.path.exists(cnn_path),
        "lstm_model_ready": os.path.exists(lstm_path),
    }
