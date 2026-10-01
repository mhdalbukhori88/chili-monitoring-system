from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app import models, schemas
from app.auth import get_current_user

router = APIRouter()


@router.get("/", response_model=List[schemas.AlertOut])
def list_user_alerts(
    unresolved_only: bool = False,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    q = db.query(models.Alert).join(models.Plant).filter(models.Plant.owner_id == current_user.id)
    if unresolved_only:
        q = q.filter(models.Alert.is_resolved == False)  # noqa: E712
    return q.order_by(models.Alert.created_at.desc()).all()


@router.get("/{plant_id}", response_model=List[schemas.AlertOut])
def list_alerts(
    plant_id: int,
    unresolved_only: bool = False,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    plant = db.query(models.Plant).filter(
        models.Plant.id == plant_id, models.Plant.owner_id == current_user.id
    ).first()
    if not plant:
        raise HTTPException(status_code=404, detail="Tanaman tidak ditemukan")

    q = db.query(models.Alert).filter(models.Alert.plant_id == plant_id)
    if unresolved_only:
        q = q.filter(models.Alert.is_resolved == False)  # noqa: E712
    return q.order_by(models.Alert.created_at.desc()).all()


@router.post("/{alert_id}/resolve", response_model=schemas.AlertOut)
def resolve_alert(
    alert_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    alert = db.query(models.Alert).join(models.Plant).filter(
        models.Alert.id == alert_id,
        models.Plant.owner_id == current_user.id
    ).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert tidak ditemukan")
    alert.is_resolved = True
    db.commit()
    db.refresh(alert)
    return alert


@router.post("/resolve-all")
def resolve_all_alerts(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    user_plants = db.query(models.Plant.id).filter(models.Plant.owner_id == current_user.id).all()
    plant_ids = [p[0] for p in user_plants]
    if not plant_ids:
        return {"status": "ok", "resolved_count": 0}

    count = (
        db.query(models.Alert)
        .filter(models.Alert.plant_id.in_(plant_ids), models.Alert.is_resolved == False)  # noqa: E712
        .update({models.Alert.is_resolved: True}, synchronize_session=False)
    )
    db.commit()
    return {"status": "ok", "resolved_count": count}


@router.post("/test-notification", response_model=schemas.ExternalAlertTestResponse)
def test_external_notification(
    payload: schemas.ExternalAlertTestRequest,
    current_user: models.User = Depends(get_current_user),
):
    from app.services.anomaly_detection import send_telegram_alert, send_webhook_alert

    msg = payload.message or "Uji Coba: Sistem Notifikasi Peringatan Dini Cabai Terhubung Normal."
    tg_sent = send_telegram_alert(
        f"🔔 *[UJI COBA NOTIFIKASI CABAI]*\n{msg}",
        bot_token=payload.bot_token,
        chat_id=payload.chat_id,
    )
    wh_sent = send_webhook_alert({
        "event": "test_notification",
        "sender": current_user.username,
        "message": msg,
    }, webhook_url=payload.webhook_url)

    status = "ok" if (tg_sent or wh_sent) else "no_active_channel"
    res_msg = "Notifikasi pengujian berhasil terkirim!" if (tg_sent or wh_sent) else "Kredensial Telegram/Webhook belum diisi atau server tujuan tidak dapat dijangkau."

    return schemas.ExternalAlertTestResponse(
        status=status,
        telegram_sent=tg_sent,
        webhook_sent=wh_sent,
        message=res_msg,
    )
