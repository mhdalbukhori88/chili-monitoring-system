"""Script untuk inisialisasi akun administrator produksi."""
import sys
import argparse
from app.database import Base, engine, SessionLocal
from app import models
from app.auth import hash_password


def create_admin(username: str, email: str, password: str, full_name: str = "Administrator"):
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        user = db.query(models.User).filter(
            (models.User.username == username) | (models.User.email == email)
        ).first()
        if user:
            print(f"[INFO] Pengguna dengan username '{username}' atau email '{email}' sudah ada (ID: {user.id}).")
            return

        user = models.User(
            username=username,
            email=email,
            hashed_password=hash_password(password),
            full_name=full_name,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        print(f"[SUKSES] Akun administrator berhasil dibuat: {username} ({email})")
    finally:
        db.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Buat akun administrator produksi.")
    parser.add_argument("--username", default="admin", help="Username administrator")
    parser.add_argument("--email", default="admin@chili-monitor.id", help="Email administrator")
    parser.add_argument("--password", default="AdminSecure2026!", help="Password administrator")
    parser.add_argument("--name", default="Administrator Sistem", help="Nama lengkap administrator")
    args = parser.parse_args()

    create_admin(args.username, args.email, args.password, args.name)
