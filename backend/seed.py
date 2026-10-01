"""Seed database with an initial demo user and chili plant with growth/sensor data."""
from datetime import datetime, timedelta
from app.database import Base, engine, SessionLocal
from app import models
from app.auth import hash_password

def seed():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        # Check if user exists
        user = db.query(models.User).filter(models.User.username == "admin").first()
        if not user:
            user = models.User(
                username="admin",
                email="admin@chili.local",
                hashed_password=hash_password("admin123"),
                full_name="Petani Cabai Pintar",
            )
            db.add(user)
            db.commit()
            db.refresh(user)
            print(f"Created demo user: admin (password: admin123)")

        # Check if plant exists
        plant = db.query(models.Plant).filter(models.Plant.owner_id == user.id).first()
        if not plant:
            plant = models.Plant(
                owner_id=user.id,
                name="Cabai Rawit Merah #1",
                variety="Rawit Hiyung",
                location="Greenhouse A - Baris 1",
                planted_at=datetime.utcnow() - timedelta(days=30),
            )
            db.add(plant)
            db.commit()
            db.refresh(plant)
            print(f"Created demo plant: {plant.name} (id={plant.id})")

            # Add sample growth records (last 10 days)
            now = datetime.utcnow()
            for i in range(10, 0, -1):
                rec_date = now - timedelta(days=i)
                height = 20.0 + (10 - i) * 3.5
                leaf_count = 15 + (10 - i) * 5
                fruit_count = max(0, (10 - i) * 2 - 4)
                gr = models.GrowthRecord(
                    plant_id=plant.id,
                    date=rec_date,
                    height_cm=round(height, 1),
                    leaf_count=leaf_count,
                    fruit_count=fruit_count,
                    avg_temperature_c=27.5,
                    avg_humidity_pct=72.0,
                    avg_soil_moisture_pct=65.0,
                )
                db.add(gr)

            # Add sample sensor reading
            sr = models.SensorReading(
                plant_id=plant.id,
                temperature_c=28.2,
                humidity_pct=74.5,
                soil_moisture_pct=68.0,
                soil_ph=6.4,
                light_lux=18500.0,
                recorded_at=now,
            )
            db.add(sr)

            # Add sample alert
            alert = models.Alert(
                plant_id=plant.id,
                severity="warning",
                source="sensor",
                message="Suhu siang hari sedikit tinggi: 33°C (ideal 18-32°C)",
                is_resolved=False,
            )
            db.add(alert)
            db.commit()
            print("Seeded growth records, sensor reading, and alert.")
    finally:
        db.close()

if __name__ == "__main__":
    seed()
