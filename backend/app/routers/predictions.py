"""Endpoint prediksi pertumbuhan menggunakan model LSTM."""
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app import models, schemas
from app.auth import get_current_user
from app.ml.inference import run_lstm_prediction

router = APIRouter()


@router.get("/{plant_id}", response_model=list[schemas.PredictionOut])
def get_predictions(
    plant_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    plant = db.query(models.Plant).filter(
        models.Plant.id == plant_id, models.Plant.owner_id == current_user.id
    ).first()
    if not plant:
        raise HTTPException(404, "Tanaman tidak ditemukan")

    return (
        db.query(models.Prediction)
        .filter(models.Prediction.plant_id == plant_id)
        .order_by(models.Prediction.predicted_for_date.asc())
        .limit(14)
        .all()
    )


@router.post("/{plant_id}", response_model=list[schemas.PredictionOut])
def predict_growth(
    plant_id: int,
    payload: schemas.PredictionRequest = schemas.PredictionRequest(),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    plant = db.query(models.Plant).filter(
        models.Plant.id == plant_id, models.Plant.owner_id == current_user.id
    ).first()
    if not plant:
        raise HTTPException(404, "Tanaman tidak ditemukan")

    history = db.query(models.GrowthRecord).filter(
        models.GrowthRecord.plant_id == plant_id
    ).order_by(models.GrowthRecord.date.asc()).all()

    if not history:
        raise HTTPException(
            400,
            "Catat minimal 1 data pengukuran pertumbuhan pada tanaman ini untuk menjalankan proyeksi LSTM",
        )

    predictions = run_lstm_prediction(history, horizon_days=payload.horizon_days)

    # Hapus prediksi lama untuk tanaman ini agar tidak menumpuk
    db.query(models.Prediction).filter(models.Prediction.plant_id == plant_id).delete()

    saved = []
    for i, pred in enumerate(predictions):
        row = models.Prediction(
            plant_id=plant_id,
            predicted_for_date=datetime.utcnow() + timedelta(days=i + 1),
            predicted_height_cm=pred["height_cm"],
            predicted_leaf_count=pred["leaf_count"],
            predicted_fruit_count=pred["fruit_count"],
        )
        db.add(row)
        saved.append(row)
    db.commit()
    return saved
