# Chili Monitor Platform — Sistem Telemetri & Deteksi Cerdas Budidaya Cabai

Sistem pemantauan pertanian presisi berbasis kecerdasan buatan (*Artificial Intelligence*) dan telemetri *Internet of Things* (IoT) untuk budidaya tanaman cabai skala intensif. Dilengkapi dengan klasifikasi multi-head CNN (*MobileNetV3*), peramalan pertumbuhan deret waktu (*LSTM Recurrent Neural Network*), analisis mikroklimat lingkungan, sistem peringatan dini anomali, serta asisten konsultasi agronomi interaktif.

---

## Arsitektur Sistem

```
┌─────────────────────────────────┐
│     Next.js Web Application     │ (Dashboard, Telemetri, Deteksi Visual, Chat)
└────────────────┬────────────────┘
                 │ (REST API + JWT Bearer Auth)
┌────────────────▼────────────────┐
│      FastAPI Backend Engine     │
├─────────────────────────────────┤
│ • Auth & User Scoping           │
│ • Sensor Anomaly Engine         │
│ • CNN Multi-Head Inference      │ <── MobileNetV3 (Daun, Buah, Kondisi)
│ • LSTM Rolling Forecast         │ <── 14-Day Growth Model
│ • Expert Agronomy Assistant     │
└────────┬───────────────┬────────┘
         │               │
┌────────▼────────┐ ┌────▼────────┐
│ PostgreSQL /    │ │   Storage   │
│ Relational DB   │ │  (/uploads) │
└─────────────────┘ └─────────────┘
```

---

## Fitur Utama

| Modul | Deskripsi | Status |
|---|---|---|
| **Deteksi Visual CNN Multi-Head** | Evaluasi otomatis foto daun/buah: kesehatan daun (*Sehat, Kuning, Keriting, Bercak Daun*), tahap buah (*Bunga, Buah Hijau, Buah Matang*), dan kondisi umum tanaman (*Sehat, Stres Air, Defisiensi, Hama*). | Aktif (Model Terlatih) |
| **Peramalan Pertumbuhan (LSTM)** | Proyeksi deret waktu 14 hari ke depan untuk estimasi pertambahan tinggi tanaman (cm), akumulasi jumlah daun, dan buah. | Aktif (Model Terlatih) |
| **Telemetri Mikroklimat IoT** | Pencatatan suhu udara (°C), kelembapan udara (%), kelembapan tanah (%), pH tanah, dan intensitas cahaya (lux) via REST API mikrokontroler (ESP32 / Arduino / RPi). | Siap Pakai |
| **Sistem Peringatan Dini & Anomali** | Notifikasi otomatis jika mikroklimat keluar batas ideal atau model visual mendeteksi indikasi serangan hama / defisiensi nutrisi. | Aktif |
| **Asisten Konsultasi Agronomi** | Layanan konsultasi agronomi responsif terhadap keluhan hama, dosis pemupukan, dan panduan perawatan berbasis konteks tanaman. | Aktif |
| **Multi-Tenant & Keamanan Akun** | Autentikasi JWT terenkripsi dengan isolasi kepemilikan data antar pengguna (data tanaman & sensor tiap petani terpisah aman). | Terisolasi |

---

## Panduan Menjalankan Sistem

### Opsi 1: Menjalankan Cepat dengan Docker Compose (Rekomendasi Produksi)

Seluruh stack (Database PostgreSQL, Backend FastAPI, dan Frontend Next.js) dapat dijalankan hanya dengan satu perintah:

```bash
# 1. Clone repositori & masuk ke direktori
git clone <url-repo>
cd chili-monitoring-system

# 2. Jalankan seluruh container
docker compose up -d --build
```

Setelah proses selesai:
- **Frontend Web:** Buka di browser `http://localhost:3000`
- **Backend API Docs:** Buka di browser `http://localhost:8000/docs`
- **Health Check:** `http://localhost:8000/health`

---

### Opsi 2: Menjalankan Secara Manual (Development Lokal)

#### 1. Setup Backend (FastAPI)

```bash
cd backend

# Buat virtual environment (opsional tapi disarankan)
python -m venv venv
venv\Scripts\activate       # Windows
# source venv/bin/activate  # Linux/macOS

# Install dependencies
pip install -r requirements.txt

# Buat file konfigurasi .env dari template
copy .env.example .env

# Inisialisasi akun administrator pertama (opsional)
python create_admin.py --username admin --password "PasswordKuat2026!" --email "admin@kebun.id"

# Jalankan server FastAPI
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

#### 2. Setup Frontend (Next.js)

Buka terminal baru:

```bash
cd frontend

# Install node modules
npm install

# Buat konfigurasi environment
copy .env.example .env.local

# Jalankan dev server
npm run dev
```

Aplikasi web dapat diakses di `http://localhost:3000`.

---

## Integrasi Hardware Sensor IoT (ESP32 / Arduino / Python)

Mikrokontroler dapat mengirimkan pembacaan sensor ke backend dengan format JSON berikut:

- **Metode:** `POST`
- **URL:** `http://<IP_BACKEND>:8000/sensors/`
- **Headers:**
  - `Content-Type: application/json`
  - `Authorization: Bearer <TOKEN_JWT_PENGGUNA>`
- **Request Body:**
```json
{
  "plant_id": 1,
  "temperature_c": 28.5,
  "humidity_pct": 74.0,
  "soil_moisture_pct": 65.0,
  "soil_ph": 6.4,
  "light_lux": 18500.0
}
```

---

## Struktur Repositori

```
chili-monitoring-system/
├── backend/
│   ├── app/
│   │   ├── ml/                 # Inferensi dan pipeline model (CNN, LSTM)
│   │   ├── models_data/        # Bobot model terlatih (cnn_model.pt, lstm_model.pt)
│   │   ├── routers/            # Endpoint modular (auth, plants, photos, sensors, dsb)
│   │   ├── services/           # Logika deteksi anomali & rules
│   │   ├── auth.py             # Enkripsi bcrypt & verifikasi JWT
│   │   ├── config.py           # Manajemen env via Pydantic
│   │   ├── database.py         # SQLAlchemy Engine & Session
│   │   ├── models.py           # Skema tabel database ORM
│   │   └── schemas.py          # Validasi request & response API
│   ├── create_admin.py         # Script CLI pembuatan akun admin produksi
│   ├── Dockerfile              # Docker image backend Python 3.11
│   ├── main.py                 # Entry point aplikasi FastAPI
│   └── requirements.txt
├── frontend/
│   ├── components/             # Reusable UI (Sidebar, GrowthChart, PhotoUpload, Icons)
│   ├── lib/                    # API Axios wrapper & hook useAuth
│   ├── pages/                  # Halaman dashboard, tanaman, telemetri, alert, chat
│   ├── styles/                 # Desain sistem & styling CSS modern
│   └── Dockerfile              # Docker multi-stage build produksi Next.js
├── docker-compose.yml          # Konfigurasi orkestrasi PostgreSQL + Backend + Frontend
└── README.md
```

---

## Keamanan dan Praktik Produksi

1. **JWT Secret:** Selalu ganti nilai `JWT_SECRET` pada file `.env` di lingkungan produksi menggunakan kunci acak yang panjang (`openssl rand -hex 32`).
2. **CORS:** Atur `allow_origins` pada `backend/main.py` ke domain frontend produksi Anda.
3. **Volume Persisten:** Direktori `uploads/` dan file model ML dipetakan ke volume Docker persisten agar data foto dan hasil training tidak hilang saat kontainer diperbarui.
