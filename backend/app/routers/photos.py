"""Upload foto berkala -> jalankan CNN inference -> simpan hasil deteksi."""
import os
import uuid
from typing import List

from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app import models, schemas
from app.auth import get_current_user
from app.config import settings
from app.ml.inference import run_cnn_inference
from app.services.anomaly_detection import evaluate_detection_for_alerts

router = APIRouter()

os.makedirs(settings.UPLOAD_DIR, exist_ok=True)


@router.post("/upload/{plant_id}", response_model=schemas.PhotoOut)
async def upload_photo(
    plant_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    plant = db.query(models.Plant).filter(
        models.Plant.id == plant_id, models.Plant.owner_id == current_user.id
    ).first()
    if not plant:
        raise HTTPException(404, "Tanaman tidak ditemukan")

    ext = os.path.splitext(file.filename)[1].lower() if file.filename else ".jpg"
    if ext not in [".jpg", ".jpeg", ".png", ".webp", ".bmp"]:
        raise HTTPException(400, "Format file tidak didukung. Harap unggah file foto gambar (JPG, JPEG, PNG, WEBP, BMP).")

    filename = f"{uuid.uuid4().hex}{ext}"
    file_path = os.path.join(settings.UPLOAD_DIR, filename)

    with open(file_path, "wb") as f:
        f.write(await file.read())

    photo = models.Photo(plant_id=plant_id, file_path=file_path)
    db.add(photo)
    db.commit()
    db.refresh(photo)

    # Jalankan inference CNN (deteksi tanaman/daun/buah/kondisi)
    try:
        result = run_cnn_inference(file_path)
    except Exception as e:
        if os.path.exists(file_path):
            try:
                os.remove(file_path)
            except OSError:
                pass
        db.delete(photo)
        db.commit()
        raise HTTPException(400, f"Gagal menganalisis gambar: pastikan file foto tidak rusak. ({str(e)})")

    detection = models.Detection(
        photo_id=photo.id,
        plant_detected=result["plant_detected"],
        plant_confidence=result["plant_confidence"],
        leaf_count_estimate=result["leaf_count_estimate"],
        leaf_health_label=result["leaf_health_label"],
        leaf_confidence=result["leaf_confidence"],
        fruit_count_estimate=result["fruit_count_estimate"],
        fruit_stage_label=result["fruit_stage_label"],
        fruit_confidence=result["fruit_confidence"],
        condition_label=result["condition_label"],
        condition_confidence=result["condition_confidence"],
        raw_output=result,
    )
    db.add(detection)

    # Cek apakah hasil deteksi memicu alert (misal kondisi buruk terdeteksi)
    evaluate_detection_for_alerts(db, plant_id, detection)

    db.commit()
    db.refresh(photo)
    return photo


@router.get("/photo/{photo_id}", response_model=schemas.PhotoOut)
def get_photo(
    photo_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    photo = db.query(models.Photo).join(models.Plant).filter(
        models.Photo.id == photo_id,
        models.Plant.owner_id == current_user.id,
    ).first()
    if not photo:
        raise HTTPException(404, "Foto tidak ditemukan")
    return photo


@router.get("/{plant_id}", response_model=List[schemas.PhotoOut])
def list_photos(
    plant_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    plant = db.query(models.Plant).filter(
        models.Plant.id == plant_id, models.Plant.owner_id == current_user.id
    ).first()
    if not plant:
        raise HTTPException(404, "Tanaman tidak ditemukan")

    return db.query(models.Photo).filter(models.Photo.plant_id == plant_id).order_by(
        models.Photo.uploaded_at.desc()
    ).all()


@router.delete("/{photo_id}")
def delete_photo(
    photo_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    photo = db.query(models.Photo).join(models.Plant).filter(
        models.Photo.id == photo_id,
        models.Plant.owner_id == current_user.id
    ).first()
    if not photo:
        raise HTTPException(404, "Foto tidak ditemukan")

    # Hapus file fisik jika ada
    if photo.file_path and os.path.exists(photo.file_path):
        try:
            os.remove(photo.file_path)
        except OSError:
            pass

    # Hapus deteksi terkait jika ada
    if photo.detection:
        db.delete(photo.detection)

    db.delete(photo)
    db.commit()
    return {"status": "ok", "message": "Foto berhasil dihapus"}
