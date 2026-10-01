"""AI Chat Assistant - menjawab pertanyaan seputar budidaya cabai,
memakai konteks data tanaman (sensor, deteksi, alert) milik user."""
from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from anthropic import Anthropic

from app.database import get_db
from app import models, schemas
from app.auth import get_current_user
from app.config import settings

router = APIRouter()
client = Anthropic(api_key=settings.ANTHROPIC_API_KEY) if settings.ANTHROPIC_API_KEY else None


def build_context(db: Session, plant_id: int | None, user_id: int | None = None) -> str:
    if not plant_id:
        return "Tidak ada konteks tanaman spesifik."
    q = db.query(models.Plant).filter(models.Plant.id == plant_id)
    if user_id:
        q = q.filter(models.Plant.owner_id == user_id)
    plant = q.first()
    if not plant:
        return "Tanaman tidak ditemukan atau tidak memiliki akses."

    last_sensor = db.query(models.SensorReading).filter(
        models.SensorReading.plant_id == plant_id
    ).order_by(models.SensorReading.recorded_at.desc()).first()

    last_alert = db.query(models.Alert).filter(
        models.Alert.plant_id == plant_id, models.Alert.is_resolved == False  # noqa: E712
    ).order_by(models.Alert.created_at.desc()).first()

    last_photo = db.query(models.Photo).filter(
        models.Photo.plant_id == plant_id
    ).order_by(models.Photo.uploaded_at.desc()).first()

    ctx = f"Tanaman: {plant.name} ({plant.variety or 'varietas tidak diketahui'}).\n"
    if last_sensor:
        ctx += (
            f"Sensor terakhir: suhu {last_sensor.temperature_c}°C, "
            f"kelembapan udara {last_sensor.humidity_pct}%, "
            f"kelembapan tanah {last_sensor.soil_moisture_pct}%, "
            f"pH tanah {last_sensor.soil_ph}.\n"
        )
    if last_photo and last_photo.detection:
        d = last_photo.detection
        ctx += (
            f"Deteksi foto CNN terakhir: daun '{d.leaf_health_label or 'normal'}', "
            f"tahap buah '{d.fruit_stage_label or 'vegetatif'}', kondisi '{d.condition_label or 'normal'}'.\n"
        )
    if last_alert:
        ctx += f"Alert aktif: [{last_alert.severity}] {last_alert.message}\n"
    return ctx


def agronomy_knowledge_fallback(query: str, context: str) -> str:
    """Mesin pakar agronomi lokal berbasis aturan jika API key eksternal belum dikonfigurasi."""
    q = query.lower()

    prefix = ""
    if context and "Tanaman:" in context:
        lines = [line.strip() for line in context.strip().splitlines() if line.strip()]
        prefix = "**Konteks Data Tanaman Anda:**\n" + "\n".join(f"- {l}" for l in lines) + "\n\n"

    if any(k in q for k in ["suhu", "kelembapan", "iklim", "panas", "cuaca"]):
        body = (
            "**Kondisi Mikroklimat Ideal Tanaman Cabai:**\n"
            "- Suhu Optimal: 24°C - 28°C (toleransi 18°C - 32°C). Suhu >35°C menyebabkan kerontokan bunga.\n"
            "- Kelembapan Udara: 60% - 80%. Kelembapan >90% memicu perkembangan jamur dan antraknosa.\n"
            "- Kelembapan Tanah: 60% - 75% (kapasitas lapang, lembap tapi tidak tergenang air).\n"
            "- pH Tanah Ideal: 6.0 - 6.8 untuk penyerapan nutrisi maksimal."
        )
    elif any(k in q for k in ["bercak", "spot", "antraknosa", "jamur", "bakteri"]):
        body = (
            "**Pengendalian Penyakit Bercak Daun dan Antraknosa Cabai:**\n"
            "1. Sanitasi: Petik dan musnahkan daun atau buah yang terinfeksi agar tidak menular.\n"
            "2. Sirkulasi Udara: Jaga jarak tanam (min. 50-60 cm) dan pangkas tunas air bagian bawah.\n"
            "3. Penyiraman: Hindari menyiram bagian daun secara langsung (gunakan irigasi tetes atau kocor di pangkal batang).\n"
            "4. Fungisida/Bakterisida: Gunakan fungisida tembaga hidroksida atau azoksistrobin jika infeksi meluas."
        )
    elif any(k in q for k in ["keriting", "curl", "virus", "gemini", "bule", "kutu", "thrips", "kutu kebul"]):
        body = (
            "**Pengendalian Daun Keriting dan Virus Kuning Cabai:**\n"
            "- Penyebab Utama: Vektor serangga penghisap (Kutu Kebul *Bemisia tabaci*, Thrips, dan Aphid).\n"
            "- Langkah Pengendalian:\n"
            "  1. Pasang perangkap kuning berperekat (*yellow sticky trap*) di sekitar greenhouse atau bedengan.\n"
            "  2. Semprotkan insektisida berbahan aktif abamektin, imidakloprid, atau pestisida nabati (minyak nimba).\n"
            "  3. Berikan pupuk silika (Si) dan kalium untuk memperkuat dinding sel daun tanaman."
        )
    elif any(k in q for k in ["kuning", "nutrisi", "pupuk", "defisiensi", "klorosis", "npk"]):
        body = (
            "**Manajemen Nutrisi dan Mengatasi Daun Menguning (Klorosis):**\n"
            "- Daun bawah kuning merata: Gejala kekurangan Nitrogen (N). Berikan pupuk NPK seimbang atau kalsium nitrat.\n"
            "- Kuning di antara tulang daun: Gejala kekurangan Magnesium (Mg) atau Besi (Fe). Semprotkan pupuk mikro sulfat (MgSO4 / Fe-EDTA).\n"
            "- Fase Vegetatif: Utamakan N tinggi (NPK 16-16-16 + Asam Amino).\n"
            "- Fase Generatif (Bunga & Buah): Utamakan Kalium dan Fosfat (MKP + Kalsium Boron) untuk mencegah rontok buah."
        )
    elif any(k in q for k in ["bunga", "buah", "rontok", "lebat", "panen"]):
        body = (
            "**Meningkatkan Pembungaan dan Mencegah Kerontokan Buah Cabai:**\n"
            "1. Kurangi pupuk Nitrogen berlebih pada fase pembungaan karena membuat tanaman vegetatif dominan.\n"
            "2. Aplikasikan pupuk MKP (Mono Kalium Phosphat) seminggu sekali secara kocor.\n"
            "3. Tambahkan Kalsium + Boron untuk menguatkan tangkai bunga dan mencegah busuk pantat buah (*blossom end rot*).\n"
            "4. Pastikan kelembapan tanah stabil—kekeringan mendadak saat berbunga menjadi pemicu utama rontok massal."
        )
    elif any(k in q for k in ["air", "siram", "irigasi", "kering", "layu"]):
        body = (
            "**Panduan Manajemen Irigasi dan Penyiraman Tanaman Cabai:**\n"
            "- Siram 1-2 kali sehari pada pagi hari (sebelum terik) atau sore hari.\n"
            "- Hindari genangan air karena akar cabai sangat rentan terhadap busuk akar (*Phytophthora*) dan layu fusarium.\n"
            "- Jika daun layu di siang hari tapi segar kembali di sore hari, cukup basahi media tanam secukupnya tanpa berlebihan."
        )
    else:
        body = (
            "**Rekomendasi Agronomi untuk Tanaman Cabai:**\n"
            "Kondisi lingkungan dan pemantauan sensor saat ini sangat penting dipantau berkala.\n"
            "- Pastikan pH tanah berada di rentang 6.0 - 6.8 dan kelembapan tanah di 60-70%.\n"
            "- Lakukan pemangkasan tunas air di bawah cabang 'Y' agar nutrisi terfokus pada produksi bunga dan buah.\n"
            "- Gunakan fitur *Upload Foto* secara teratur agar model CNN dapat mendeteksi dini jika ada tanda bercak daun atau keriting virus."
        )

    return prefix + body


@router.get("/", response_model=List[schemas.ChatMessageOut])
def get_chat_history(
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    return (
        db.query(models.ChatMessage)
        .filter(models.ChatMessage.user_id == current_user.id)
        .order_by(models.ChatMessage.created_at.asc())
        .limit(limit)
        .all()
    )


@router.delete("/clear")
def clear_chat_history(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    count = db.query(models.ChatMessage).filter(models.ChatMessage.user_id == current_user.id).delete()
    db.commit()
    return {"status": "ok", "message": f"{count} pesan berhasil dibersihkan"}


@router.post("/", response_model=schemas.ChatResponse)
def chat(
    payload: schemas.ChatRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    context = build_context(db, payload.plant_id, user_id=current_user.id)

    if client is None:
        # Gunakan sistem agronomi bawaan cerdas jika ANTHROPIC_API_KEY belum diisi
        reply_text = agronomy_knowledge_fallback(payload.message, context)
    else:
        system_prompt = (
            "Kamu adalah asisten ahli budidaya tanaman cabai (AI Agronomist). Jawab secara profesional, "
            "ringkas, jelas, dan tanpa menggunakan emoji apapun. Gunakan data konteks sensor/deteksi tanaman berikut jika relevan:\n"
            f"{context}"
        )
        try:
            response = client.messages.create(
                model="claude-3-5-sonnet-20241022",
                max_tokens=600,
                system=system_prompt,
                messages=[{"role": "user", "content": payload.message}],
            )
            reply_text = "".join(
                block.text for block in response.content if block.type == "text"
            )
        except Exception as e:
            # Fallback jika terjadi limit kuota atau kesalahan koneksi API
            reply_text = agronomy_knowledge_fallback(payload.message, context)

    db.add(models.ChatMessage(user_id=current_user.id, role="user", content=payload.message))
    db.add(models.ChatMessage(user_id=current_user.id, role="assistant", content=reply_text))
    db.commit()

    return {"reply": reply_text}
