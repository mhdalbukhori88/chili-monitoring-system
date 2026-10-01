from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app import models, schemas
from app.auth import get_current_user
from app.services.anomaly_detection import evaluate_sensor_for_alerts

router = APIRouter()


@router.post("/", response_model=schemas.SensorReadingOut)
def add_reading(
    payload: schemas.SensorReadingCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    plant = db.query(models.Plant).filter(
        models.Plant.id == payload.plant_id,
        models.Plant.owner_id == current_user.id
    ).first()
    if not plant:
        raise HTTPException(status_code=404, detail="Tanaman tidak ditemukan")

    reading = models.SensorReading(**payload.model_dump())
    db.add(reading)
    db.commit()
    db.refresh(reading)

    evaluate_sensor_for_alerts(db, reading)
    db.commit()
    return reading


@router.get("/{plant_id}", response_model=List[schemas.SensorReadingOut])
def list_readings(
    plant_id: int,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    plant = db.query(models.Plant).filter(
        models.Plant.id == plant_id,
        models.Plant.owner_id == current_user.id
    ).first()
    if not plant:
        raise HTTPException(status_code=404, detail="Tanaman tidak ditemukan")

    return db.query(models.SensorReading).filter(
        models.SensorReading.plant_id == plant_id
    ).order_by(models.SensorReading.recorded_at.desc()).limit(limit).all()


@router.delete("/reading/{reading_id}")
def delete_reading(
    reading_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    reading = (
        db.query(models.SensorReading)
        .join(models.Plant)
        .filter(
            models.SensorReading.id == reading_id,
            models.Plant.owner_id == current_user.id,
        )
        .first()
    )
    if not reading:
        raise HTTPException(status_code=404, detail="Data sensor tidak ditemukan")

    db.delete(reading)
    db.commit()
    return {"status": "ok", "message": "Data pembacaan sensor berhasil dihapus"}
