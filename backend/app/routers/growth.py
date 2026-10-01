from datetime import datetime
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app import models, schemas
from app.auth import get_current_user

router = APIRouter()


@router.get("/{plant_id}", response_model=List[schemas.GrowthRecordOut])
def get_growth_history(
    plant_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    plant = db.query(models.Plant).filter(
        models.Plant.id == plant_id, models.Plant.owner_id == current_user.id
    ).first()
    if not plant:
        raise HTTPException(status_code=404, detail="Tanaman tidak ditemukan")

    return db.query(models.GrowthRecord).filter(
        models.GrowthRecord.plant_id == plant_id
    ).order_by(models.GrowthRecord.date.asc()).all()


@router.delete("/record/{record_id}")
def delete_growth_record(
    record_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    record = db.query(models.GrowthRecord).join(models.Plant).filter(
        models.GrowthRecord.id == record_id,
        models.Plant.owner_id == current_user.id
    ).first()
    if not record:
        raise HTTPException(status_code=404, detail="Catatan pertumbuhan tidak ditemukan")
    db.delete(record)
    db.commit()
    return {"status": "ok", "message": "Catatan pertumbuhan berhasil dihapus"}


@router.post("/{plant_id}", response_model=schemas.GrowthRecordOut)
def add_growth_record(
    plant_id: int,
    payload: schemas.GrowthRecordCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    plant = db.query(models.Plant).filter(
        models.Plant.id == plant_id, models.Plant.owner_id == current_user.id
    ).first()
    if not plant:
        raise HTTPException(status_code=404, detail="Tanaman tidak ditemukan")

    record_date = payload.date or datetime.utcnow()
    record = models.GrowthRecord(
        plant_id=plant_id,
        date=record_date,
        height_cm=payload.height_cm,
        leaf_count=payload.leaf_count,
        fruit_count=payload.fruit_count,
        avg_temperature_c=payload.avg_temperature_c,
        avg_humidity_pct=payload.avg_humidity_pct,
        avg_soil_moisture_pct=payload.avg_soil_moisture_pct,
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record
