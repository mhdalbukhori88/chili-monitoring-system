from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import get_db
from app import models, schemas
from app.auth import get_current_user

router = APIRouter()


@router.get("/", response_model=schemas.DashboardStats)
def get_dashboard_stats(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    plant_rows = db.query(models.Plant.id).filter(
        models.Plant.owner_id == current_user.id
    ).all()
    plant_ids = [r[0] for r in plant_rows]

    total_plants = len(plant_ids)
    total_photos = db.query(models.Photo).filter(models.Photo.plant_id.in_(plant_ids)).count() if plant_ids else 0
    total_alerts_unresolved = db.query(models.Alert).filter(
        models.Alert.plant_id.in_(plant_ids), models.Alert.is_resolved == False  # noqa: E712
    ).count() if plant_ids else 0

    avg_height = db.query(func.avg(models.GrowthRecord.height_cm)).filter(
        models.GrowthRecord.plant_id.in_(plant_ids)
    ).scalar() if plant_ids else None

    avg_temp = db.query(func.avg(models.SensorReading.temperature_c)).filter(
        models.SensorReading.plant_id.in_(plant_ids)
    ).scalar() if plant_ids else None

    avg_moisture = db.query(func.avg(models.SensorReading.soil_moisture_pct)).filter(
        models.SensorReading.plant_id.in_(plant_ids)
    ).scalar() if plant_ids else None

    return schemas.DashboardStats(
        total_plants=total_plants,
        total_photos=total_photos,
        total_alerts_unresolved=total_alerts_unresolved,
        avg_height_cm=round(avg_height, 2) if avg_height is not None else None,
        avg_temperature_c=round(avg_temp, 2) if avg_temp is not None else None,
        avg_soil_moisture_pct=round(avg_moisture, 2) if avg_moisture is not None else None,
    )
