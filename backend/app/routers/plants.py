import os
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app import models, schemas
from app.auth import get_current_user

router = APIRouter()


@router.post("/", response_model=schemas.PlantOut)
def create_plant(
    payload: schemas.PlantCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    plant = models.Plant(owner_id=current_user.id, **payload.model_dump())
    db.add(plant)
    db.commit()
    db.refresh(plant)
    return plant


@router.get("/", response_model=List[schemas.PlantOut])
def list_plants(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    return db.query(models.Plant).filter(models.Plant.owner_id == current_user.id).all()


@router.get("/{plant_id}", response_model=schemas.PlantOut)
def get_plant(
    plant_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    plant = db.query(models.Plant).filter(
        models.Plant.id == plant_id, models.Plant.owner_id == current_user.id
    ).first()
    if not plant:
        raise HTTPException(status_code=404, detail="Tanaman tidak ditemukan")
    return plant


@router.put("/{plant_id}", response_model=schemas.PlantOut)
def update_plant(
    plant_id: int,
    payload: schemas.PlantUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    plant = db.query(models.Plant).filter(
        models.Plant.id == plant_id, models.Plant.owner_id == current_user.id
    ).first()
    if not plant:
        raise HTTPException(status_code=404, detail="Tanaman tidak ditemukan")

    data = payload.model_dump(exclude_unset=True)
    for k, v in data.items():
        setattr(plant, k, v)
    db.commit()
    db.refresh(plant)
    return plant


@router.delete("/{plant_id}")
def delete_plant(
    plant_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    plant = db.query(models.Plant).filter(
        models.Plant.id == plant_id, models.Plant.owner_id == current_user.id
    ).first()
    if not plant:
        raise HTTPException(status_code=404, detail="Tanaman tidak ditemukan")

    plant_name = plant.name

    # Hapus file fisik foto dan deteksi terkait
    photos = db.query(models.Photo).filter(models.Photo.plant_id == plant_id).all()
    for ph in photos:
        if ph.file_path and os.path.exists(ph.file_path):
            try:
                os.remove(ph.file_path)
            except OSError:
                pass
        if ph.detection:
            db.delete(ph.detection)
        db.delete(ph)

    # Hapus relasi data pendukung
    db.query(models.SensorReading).filter(models.SensorReading.plant_id == plant_id).delete(synchronize_session=False)
    db.query(models.GrowthRecord).filter(models.GrowthRecord.plant_id == plant_id).delete(synchronize_session=False)
    db.query(models.Prediction).filter(models.Prediction.plant_id == plant_id).delete(synchronize_session=False)
    db.query(models.Alert).filter(models.Alert.plant_id == plant_id).delete(synchronize_session=False)

    db.delete(plant)
    db.commit()
    return {"status": "ok", "message": f"Tanaman {plant_name} berhasil dihapus"}
