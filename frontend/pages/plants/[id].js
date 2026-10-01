import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import Head from "next/head";
import Sidebar from "../../components/Sidebar";
import GrowthChart from "../../components/GrowthChart";
import PhotoUpload from "../../components/PhotoUpload";
import {
  getPlant,
  updatePlant,
  deletePlant,
  getGrowth,
  createGrowthRecord,
  deleteGrowthRecord,
  getPredictions,
  generatePredictions,
  getPhotos,
  deletePhoto,
  getSensors,
  createSensorReading,
  getAlerts,
  resolveAlert,
  API_URL,
} from "../../lib/api";
import {
  IconPlant,
  IconEdit,
  IconTrash,
  IconPlus,
  IconClose,
  IconAlert,
  IconCamera,
  IconClock,
  IconArrowLeft,
  IconCheck,
  IconThermometer,
  IconDroplet,
  IconFlask,
  IconSun,
  IconTrendUp,
  IconShield,
  IconPrinter,
} from "../../components/Icons";

export default function PlantDetail() {
  const router = useRouter();
  const { id } = router.query;

  // Active Tab: 'overview' | 'visual' | 'growth'
  const [activeTab, setActiveTab] = useState("overview");

  const [plant, setPlant] = useState(null);
  const [growth, setGrowth] = useState([]);
  const [predictions, setPredictions] = useState([]);
  const [photos, setPhotos] = useState([]);
  const [sensors, setSensors] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [predicting, setPredicting] = useState(false);
  const [lastDetection, setLastDetection] = useState(null);

  // Edit Plant Modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editName, setEditName] = useState("");
  const [editVariety, setEditVariety] = useState("");
  const [editLocation, setEditLocation] = useState("");
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState("");

  // Modal Growth Record
  const [showGrowthModal, setShowGrowthModal] = useState(false);
  const [heightCm, setHeightCm] = useState("");
  const [leafCount, setLeafCount] = useState("");
  const [fruitCount, setFruitCount] = useState("");
  const [growthSubmitting, setGrowthSubmitting] = useState(false);
  const [growthError, setGrowthError] = useState("");

  // Modal Sensor Manual
  const [showSensorModal, setShowSensorModal] = useState(false);
  const [sensorTemp, setSensorTemp] = useState("");
  const [sensorHumidity, setSensorHumidity] = useState("");
  const [sensorMoisture, setSensorMoisture] = useState("");
  const [sensorPh, setSensorPh] = useState("");
  const [sensorLight, setSensorLight] = useState("");
  const [sensorSubmitting, setSensorSubmitting] = useState(false);
  const [sensorError, setSensorError] = useState("");

  // Active Photo Inspection Modal
  const [inspectPhoto, setInspectPhoto] = useState(null);

  const refreshData = () => {
    if (!id) return;
    setLoading(true);
    Promise.all([
      getPlant(id),
      getGrowth(id),
      getPhotos(id),
      getSensors(id),
      getAlerts(id, true),
      getPredictions(id).catch(() => ({ data: [] })),
    ])
      .then(([plantRes, growthRes, photosRes, sensorsRes, alertsRes, predRes]) => {
        setPlant(plantRes.data);
        setEditName(plantRes.data.name || "");
        setEditVariety(plantRes.data.variety || "");
        setEditLocation(plantRes.data.location || "");

        setGrowth(growthRes.data);
        if (predRes?.data?.length > 0) {
          setPredictions(predRes.data);
        }
        setPhotos(photosRes.data);
        if (photosRes.data.length > 0 && photosRes.data[0].detection) {
          setLastDetection(photosRes.data[0].detection);
        }

        setSensors(sensorsRes.data);
        setAlerts(alertsRes.data);
      })
      .catch((err) => {
        console.error("Gagal memuat detail tanaman:", err);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    refreshData();
  }, [id]);

  const handleUpdatePlant = async (e) => {
    e.preventDefault();
    if (!editName.trim()) {
      setEditError("Nama tanaman wajib diisi.");
      return;
    }
    setEditSubmitting(true);
    setEditError("");
    try {
      const res = await updatePlant(id, {
        name: editName.trim(),
        variety: editVariety.trim() || null,
        location: editLocation.trim() || null,
      });
      setPlant(res.data);
      setShowEditModal(false);
    } catch (err) {
      setEditError("Gagal memperbarui data: " + (err.response?.data?.detail || err.message));
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleDeletePlant = async () => {
    if (confirm(`Apakah Anda yakin ingin menghapus tanaman "${plant?.name}" beserta seluruh histori foto dan telemetrinya?`)) {
      try {
        await deletePlant(id);
        router.push("/plants");
      } catch (err) {
        alert("Gagal menghapus tanaman: " + (err.response?.data?.detail || err.message));
      }
    }
  };

  const handleCreateGrowth = async (e) => {
    e.preventDefault();
    if (!heightCm || !leafCount || fruitCount === "") {
      setGrowthError("Semua bidang pengukuran wajib diisi.");
      return;
    }
    setGrowthSubmitting(true);
    setGrowthError("");
    try {
      await createGrowthRecord(id, {
        height_cm: parseFloat(heightCm),
        leaf_count: parseInt(leafCount, 10),
        fruit_count: parseInt(fruitCount, 10),
      });
      setHeightCm("");
      setLeafCount("");
      setFruitCount("");
      setShowGrowthModal(false);
      getGrowth(id).then((res) => setGrowth(res.data));
    } catch (err) {
      setGrowthError("Gagal mencatat pertumbuhan: " + (err.response?.data?.detail || err.message));
    } finally {
      setGrowthSubmitting(false);
    }
  };

  const handleDeleteGrowth = async (recordId) => {
    if (confirm("Hapus catatan pertumbuhan ini?")) {
      try {
        await deleteGrowthRecord(recordId);
        setGrowth((prev) => prev.filter((g) => g.id !== recordId));
      } catch (err) {
        alert("Gagal menghapus data: " + (err.response?.data?.detail || err.message));
      }
    }
  };

  const handleCreateSensor = async (e) => {
    e.preventDefault();
    if (!sensorTemp || !sensorHumidity || !sensorMoisture || !sensorPh || !sensorLight) {
      setSensorError("Semua nilai sensor wajib diisi.");
      return;
    }
    setSensorSubmitting(true);
    setSensorError("");
    try {
      await createSensorReading({
        plant_id: Number(id),
        temperature_c: parseFloat(sensorTemp),
        humidity_pct: parseFloat(sensorHumidity),
        soil_moisture_pct: parseFloat(sensorMoisture),
        soil_ph: parseFloat(sensorPh),
        light_lux: parseFloat(sensorLight),
      });
      setSensorTemp("");
      setSensorHumidity("");
      setSensorMoisture("");
      setSensorPh("");
      setSensorLight("");
      setShowSensorModal(false);
      refreshData();
    } catch (err) {
      setSensorError("Gagal menyimpan sensor: " + (err.response?.data?.detail || err.message));
    } finally {
      setSensorSubmitting(false);
    }
  };

  const handleResolveAlert = async (alertId) => {
    try {
      await resolveAlert(alertId);
      setAlerts((prev) => prev.filter((a) => a.id !== alertId));
    } catch (err) {
      alert("Gagal menyelesaikan alert: " + (err.response?.data?.detail || err.message));
    }
  };

  const handleDeletePhoto = async (photoId) => {
    if (confirm("Apakah Anda yakin ingin menghapus foto dan hasil analisis ini?")) {
      try {
        await deletePhoto(photoId);
        setInspectPhoto(null);
        refreshData();
      } catch (err) {
        alert("Gagal menghapus foto: " + (err.response?.data?.detail || err.message));
      }
    }
  };

  const handlePredict = async () => {
    if (growth.length === 0) {
      alert("Harap catat minimal 1 data pengukuran pertumbuhan sebelum menjalankan prediksi LSTM.");
      return;
    }
    setPredicting(true);
    try {
      const res = await generatePredictions(id, 14);
      setPredictions(res.data);
    } catch (err) {
      alert("Gagal melakukan prediksi: " + (err.response?.data?.detail || err.message));
    } finally {
      setPredicting(false);
    }
  };

  const getConditionColor = (label) => {
    if (!label) return "badge-info";
    const l = label.toLowerCase();
    if (l.includes("sehat")) return "badge-success";
    if (l.includes("defisiensi") || l.includes("stres")) return "badge-warning";
    return "badge-danger";
  };

  const getPhotoUrl = (p) => {
    if (p.photo_url) {
      return `${API_URL}${p.photo_url}`;
    }
    const cleanFilename = (p.file_path || "").replace(/\\/g, "/").split("/").pop();
    return `${API_URL}/uploads/${cleanFilename}`;
  };

  // Plant age in days
  const plantAgeDays = useMemo(() => {
    if (!plant?.planted_at) return null;
    const diffTime = Math.abs(new Date() - new Date(plant.planted_at));
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  }, [plant]);

  const latestSensor = sensors.length > 0 ? sensors[0] : null;

  return (
    <div className="layout">
      <Head>
        <title>{plant ? `${plant.name} - Detail Pemantauan` : "Detail Tanaman Cabai"}</title>
      </Head>
      <Sidebar />
      <main className="main">
        {/* Navigation Breadcrumb */}
        <div style={{ marginBottom: "16px" }}>
          <Link
            href="/plants"
            style={{
              color: "var(--primary-600)",
              textDecoration: "none",
              fontSize: "13px",
              fontWeight: 700,
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <IconArrowLeft size={14} />
            <span>Kembali ke Daftar Tanaman</span>
          </Link>
        </div>

        {/* Official Printable Header (Visible only when Printing or Saving as PDF) */}
        <div className="print-only" style={{ marginBottom: "20px" }}>
          <div className="print-header">
            <div>
              <div style={{ fontSize: "10.5pt", fontWeight: 700, color: "#047857", letterSpacing: "1px", textTransform: "uppercase" }}>
                Kementerian / Balai Pertanian Presisi — Chili Monitor Platform
              </div>
              <h1 className="print-title">LEMBAR LAPORAN KESEHATAN &amp; PROYEKSI PERTUMBUHAN TANAMAN CABAI</h1>
              <p style={{ fontSize: "9pt", color: "#64748b" }}>
                Dokumen Resmi Pemantauan Berbasis Telemetri IoT &amp; Klasifikasi Kecerdasan Buatan (CNN-LSTM)
              </p>
            </div>
            <div style={{ textAlign: "right", fontSize: "9pt", color: "#475569" }}>
              <div><strong>Tanggal Laporan:</strong> {new Date().toLocaleDateString("id-ID", { dateStyle: "long" })}</div>
              <div><strong>Waktu Cetak:</strong> {new Date().toLocaleTimeString("id-ID", { timeStyle: "short" })} WIB</div>
            </div>
          </div>

          <div className="print-meta-grid">
            <div>
              <span style={{ fontSize: "8.5pt", color: "#64748b", display: "block" }}>Nama Tanaman:</span>
              <strong style={{ fontSize: "11pt", color: "#0f172a" }}>{plant?.name || "-"}</strong>
            </div>
            <div>
              <span style={{ fontSize: "8.5pt", color: "#64748b", display: "block" }}>Varietas Cabai:</span>
              <strong style={{ fontSize: "11pt", color: "#0f172a" }}>{plant?.variety || "Standar"}</strong>
            </div>
            <div>
              <span style={{ fontSize: "8.5pt", color: "#64748b", display: "block" }}>Umur Budidaya:</span>
              <strong style={{ fontSize: "11pt", color: "#059669" }}>{plantAgeDays !== null ? `${plantAgeDays} HST (Hari)` : "-"}</strong>
            </div>
            <div>
              <span style={{ fontSize: "8.5pt", color: "#64748b", display: "block" }}>Lokasi Kebun:</span>
              <strong style={{ fontSize: "11pt", color: "#0f172a" }}>{plant?.location || "Greenhouse Utama"}</strong>
            </div>
          </div>
        </div>

        {/* Page Header */}
        <div className="page-header">
          <div className="page-title-group">
            <h2>{plant ? plant.name : `Memuat Tanaman #${id || ""}`}</h2>
            <div style={{ display: "flex", gap: "8px", marginTop: "6px", alignItems: "center", flexWrap: "wrap" }}>
              <span className="badge badge-purple">
                Varietas: {plant?.variety || "Umum"}
              </span>
              {plant?.location && (
                <span className="badge badge-info">
                  Lokasi: {plant.location}
                </span>
              )}
              {plantAgeDays !== null && (
                <span className="badge badge-success">
                  Hari ke-{plantAgeDays} setelah tanam
                </span>
              )}
              {alerts.length > 0 ? (
                <span className="badge badge-danger">
                  {alerts.length} Peringatan Aktif
                </span>
              ) : (
                <span className="badge badge-success">
                  Kondisi Normal
                </span>
              )}
            </div>
          </div>

          <div className="header-badges">
            <button
              onClick={() => window.print()}
              className="btn-outline"
              style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
              title="Cetak atau simpan laporan lengkap tanaman ini ke PDF"
            >
              <IconPrinter size={14} />
              <span>Cetak Laporan PDF</span>
            </button>
            <button
              onClick={() => setShowEditModal(true)}
              className="btn-outline"
              style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
            >
              <IconEdit size={14} />
              <span>Edit Tanaman</span>
            </button>
            <button
              onClick={handleDeletePlant}
              style={{
                background: "#fee2e2",
                color: "#b91c1c",
                border: "1px solid #fca5a5",
                boxShadow: "none",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <IconTrash size={14} />
              <span>Hapus Tanaman</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="tabs-nav">
          <button
            type="button"
            className={`tab-btn ${activeTab === "overview" ? "active" : ""}`}
            onClick={() => setActiveTab("overview")}
          >
            <IconPlant size={16} />
            <span>Ikhtisar &amp; Telemetri Sensor</span>
          </button>
          <button
            type="button"
            className={`tab-btn ${activeTab === "visual" ? "active" : ""}`}
            onClick={() => setActiveTab("visual")}
          >
            <IconCamera size={16} />
            <span>Deteksi Visual &amp; Kamera ({photos.length})</span>
          </button>
          <button
            type="button"
            className={`tab-btn ${activeTab === "growth" ? "active" : ""}`}
            onClick={() => setActiveTab("growth")}
          >
            <IconTrendUp size={16} />
            <span>Pertumbuhan &amp; Prediksi LSTM ({growth.length})</span>
          </button>
        </div>

        {/* TAB 1: IKHTISAR & TELEMETRI SENSOR */}
        {activeTab === "overview" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            {/* Live Telemetry Sensor Cards */}
            <div className="card">
              <div className="card-header">
                <div>
                  <div className="card-title">Telemetri Lingkungan Terkini</div>
                  <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "2px" }}>
                    Pembacaan sensor IoT mikroklimat tanah dan udara untuk tanaman ini
                  </p>
                </div>
                <div style={{ display: "flex", gap: "10px" }}>
                  <button
                    onClick={() => setShowSensorModal(true)}
                    style={{ fontSize: "12px", padding: "6px 12px", display: "inline-flex", alignItems: "center", gap: "6px" }}
                  >
                    <IconPlus size={14} />
                    <span>Catat Sensor Baru</span>
                  </button>
                  <Link href="/sensors">
                    <button className="btn-outline" style={{ fontSize: "12px", padding: "6px 12px" }}>
                      Buka Modul Telemetri &rarr;
                    </button>
                  </Link>
                </div>
              </div>

              {latestSensor ? (
                <div className="telemetry-grid" style={{ marginBottom: 0 }}>
                  <div className="telemetry-card">
                    <div className="telemetry-head">
                      <span className="telemetry-title">Suhu Udara</span>
                      <span style={{ color: "#f97316" }}><IconThermometer size={18} /></span>
                    </div>
                    <div className="telemetry-val">
                      {latestSensor.temperature_c}
                      <span className="telemetry-unit">°C</span>
                    </div>
                    <div className="telemetry-status" style={{ color: latestSensor.temperature_c >= 24 && latestSensor.temperature_c <= 28 ? "var(--success)" : "var(--warning)" }}>
                      • {latestSensor.temperature_c >= 24 && latestSensor.temperature_c <= 28 ? "Suhu Ideal" : "Toleransi"}
                    </div>
                  </div>

                  <div className="telemetry-card">
                    <div className="telemetry-head">
                      <span className="telemetry-title">Kelembapan Udara</span>
                      <span style={{ color: "#0ea5e9" }}><IconDroplet size={18} /></span>
                    </div>
                    <div className="telemetry-val">
                      {latestSensor.humidity_pct}
                      <span className="telemetry-unit">%</span>
                    </div>
                    <div className="telemetry-status" style={{ color: latestSensor.humidity_pct >= 60 && latestSensor.humidity_pct <= 80 ? "var(--success)" : "var(--warning)" }}>
                      • {latestSensor.humidity_pct >= 60 && latestSensor.humidity_pct <= 80 ? "Kelembapan Optimal" : "Perhatian"}
                    </div>
                  </div>

                  <div className="telemetry-card">
                    <div className="telemetry-head">
                      <span className="telemetry-title">Kelembapan Tanah</span>
                      <span style={{ color: "#10b981" }}><IconDroplet size={18} /></span>
                    </div>
                    <div className="telemetry-val">
                      {latestSensor.soil_moisture_pct}
                      <span className="telemetry-unit">%</span>
                    </div>
                    <div className="telemetry-status" style={{ color: latestSensor.soil_moisture_pct >= 60 && latestSensor.soil_moisture_pct <= 75 ? "var(--success)" : "var(--primary-600)" }}>
                      • {latestSensor.soil_moisture_pct >= 60 && latestSensor.soil_moisture_pct <= 75 ? "Kapasitas Lapang" : "Lembap Cukup"}
                    </div>
                  </div>

                  <div className="telemetry-card">
                    <div className="telemetry-head">
                      <span className="telemetry-title">Tingkat pH Tanah</span>
                      <span style={{ color: "#8b5cf6" }}><IconFlask size={18} /></span>
                    </div>
                    <div className="telemetry-val">
                      {latestSensor.soil_ph}
                      <span className="telemetry-unit">pH</span>
                    </div>
                    <div className="telemetry-status" style={{ color: latestSensor.soil_ph >= 6.0 && latestSensor.soil_ph <= 6.8 ? "var(--success)" : "var(--warning)" }}>
                      • {latestSensor.soil_ph >= 6.0 && latestSensor.soil_ph <= 6.8 ? "pH Optimal Nutrisi" : "Perlu Penyesuaian"}
                    </div>
                  </div>

                  <div className="telemetry-card">
                    <div className="telemetry-head">
                      <span className="telemetry-title">Intensitas Cahaya</span>
                      <span style={{ color: "#eab308" }}><IconSun size={18} /></span>
                    </div>
                    <div className="telemetry-val">
                      {latestSensor.light_lux ? latestSensor.light_lux.toLocaleString("id-ID") : "-"}
                      <span className="telemetry-unit">Lux</span>
                    </div>
                    <div className="telemetry-status" style={{ color: "var(--text-muted)" }}>
                      • Terakhir: {new Date(latestSensor.recorded_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: "center", padding: "30px 10px", color: "var(--text-muted)" }}>
                  <p style={{ fontSize: "13.5px", marginBottom: "12px" }}>
                    Belum ada rekaman sensor telemetri untuk tanaman ini.
                  </p>
                  <button
                    onClick={() => setShowSensorModal(true)}
                    style={{ fontSize: "12px", display: "inline-flex", alignItems: "center", gap: "6px" }}
                  >
                    <IconPlus size={14} />
                    <span>Catat Parameter Sensor Sekarang</span>
                  </button>
                </div>
              )}
            </div>

            {/* Active Plant Alerts Widget */}
            <div className="card">
              <div className="card-header">
                <div>
                  <div className="card-title">Peringatan Anomali Aktif</div>
                  <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "2px" }}>
                    Notifikasi kritis atau peringatan mikroklimat dan indikasi penyakit pada tanaman ini
                  </p>
                </div>
                <span className={`badge ${alerts.length > 0 ? "badge-danger" : "badge-success"}`}>
                  {alerts.length > 0 ? `${alerts.length} Peringatan Perlu Perhatian` : "Kondisi Aman"}
                </span>
              </div>

              {alerts.length === 0 ? (
                <div style={{
                  padding: "16px 20px",
                  background: "var(--success-bg)",
                  border: "1px solid var(--success-border)",
                  borderRadius: "var(--radius-md)",
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  color: "var(--primary-800)",
                  fontSize: "13px",
                }}>
                  <IconShield size={20} />
                  <span>Tidak ada peringatan anomali. Tanaman ini dalam kondisi fisiologis sehat dan mikroklimat stabil.</span>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {alerts.map((a) => (
                    <div
                      key={a.id}
                      className={`card ${a.severity === "critical" ? "alert-critical" : "alert-warning"}`}
                      style={{
                        padding: "14px 18px",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        flexWrap: "wrap",
                        gap: "12px",
                      }}
                    >
                      <div style={{ display: "flex", gap: "12px", alignItems: "flex-start", flex: 1, minWidth: "260px" }}>
                        <div style={{ marginTop: "2px", color: a.severity === "critical" ? "var(--danger)" : "var(--warning)" }}>
                          <IconAlert size={20} />
                        </div>
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                            <span className={`badge ${a.severity === "critical" ? "badge-danger" : "badge-warning"}`} style={{ fontSize: "10.5px" }}>
                              {a.severity.toUpperCase()}
                            </span>
                            <span className="badge badge-info" style={{ fontSize: "10.5px" }}>
                              Sumber: {a.source === "sensor" ? "Sensor IoT" : "Visual CNN"}
                            </span>
                          </div>
                          <div style={{ fontSize: "13.5px", fontWeight: 700, color: "var(--text-primary)" }}>
                            {a.message}
                          </div>
                          <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "2px" }}>
                            Waktu: {new Date(a.created_at).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })}
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => handleResolveAlert(a.id)}
                        style={{
                          fontSize: "12px",
                          padding: "6px 14px",
                          borderRadius: "var(--radius-md)",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "6px",
                        }}
                      >
                        <IconCheck size={13} />
                        <span>Selesaikan</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Quick Actions & AI Diagnosis Link */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "16px" }}>
              <div
                className="card"
                style={{ cursor: "pointer", borderLeft: "4px solid var(--primary-500)" }}
                onClick={() => setActiveTab("visual")}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <div style={{
                    width: "42px",
                    height: "42px",
                    borderRadius: "var(--radius-lg)",
                    background: "#ecfdf5",
                    color: "#059669",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}>
                    <IconCamera size={22} />
                  </div>
                  <div>
                    <h4 style={{ fontSize: "14px", fontWeight: 800, color: "var(--text-primary)" }}>
                      Unggah Foto &amp; Deteksi CNN
                    </h4>
                    <p style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                      Evaluasi otomatis kesehatan daun, bercak, dan tahap buah
                    </p>
                  </div>
                </div>
              </div>

              <div
                className="card"
                style={{ cursor: "pointer", borderLeft: "4px solid #8b5cf6" }}
                onClick={() => setActiveTab("growth")}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <div style={{
                    width: "42px",
                    height: "42px",
                    borderRadius: "var(--radius-lg)",
                    background: "#f5f3ff",
                    color: "#7c3aed",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}>
                    <IconTrendUp size={22} />
                  </div>
                  <div>
                    <h4 style={{ fontSize: "14px", fontWeight: 800, color: "var(--text-primary)" }}>
                      Prediksi Pertumbuhan LSTM
                    </h4>
                    <p style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                      Proyeksi tinggi tanaman, daun, dan buah 14 hari ke depan
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: DETEKSI VISUAL & KAMERA */}
        {activeTab === "visual" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            {/* Upload & CNN Inference Dropzone */}
            <PhotoUpload
              plantId={id}
              onResult={(data) => {
                if (data?.detection) {
                  setLastDetection(data.detection);
                }
                refreshData();
              }}
            />

            {/* Live CNN Detection Result Card */}
            {lastDetection && (
              <div className="card" style={{ borderLeft: "4px solid var(--primary-500)" }}>
                <div className="card-header">
                  <div>
                    <div className="card-title">Hasil Deteksi CNN Multi-Head Terkini</div>
                    <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "2px" }}>
                      Analisis visual komprehensif menggunakan model MobileNetV3 Multi-Head
                    </p>
                  </div>
                  <span className="badge badge-success" style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                    <IconCheck size={13} />
                    <span>Terverifikasi Model CNN</span>
                  </span>
                </div>

                <div className="detection-grid">
                  {/* Chip 1: Plant Object */}
                  <div className="detection-chip">
                    <div className="detection-chip-title">Deteksi Objek Tanaman</div>
                    <div className="detection-chip-value" style={{ color: lastDetection.plant_detected ? "var(--primary-700)" : "var(--danger)" }}>
                      {lastDetection.plant_detected ? "Tanaman Terdeteksi" : "Bukan Tanaman"}
                    </div>
                    <div className="detection-chip-conf">
                      Keyakinan: {(lastDetection.plant_confidence * 100).toFixed(1)}%
                    </div>
                  </div>

                  {/* Chip 2: Leaf Health */}
                  <div className="detection-chip">
                    <div className="detection-chip-title">Kesehatan Daun</div>
                    <div className="detection-chip-value">
                      <span className={`badge ${getConditionColor(lastDetection.leaf_health_label)}`}>
                        {lastDetection.leaf_health_label ? lastDetection.leaf_health_label.replace(/_/g, " ").toUpperCase() : "NORMAL"}
                      </span>
                    </div>
                    <div className="detection-chip-conf">
                      Keyakinan: {(((lastDetection.leaf_confidence ?? 0) * 100)).toFixed(1)}%
                    </div>
                  </div>

                  {/* Chip 3: Fruit Stage */}
                  <div className="detection-chip">
                    <div className="detection-chip-title">Tahap Perkembangan Buah</div>
                    <div className="detection-chip-value">
                      <span className="badge badge-info">
                        {lastDetection.fruit_stage_label ? lastDetection.fruit_stage_label.replace(/_/g, " ").toUpperCase() : "VEGETATIF"}
                      </span>
                    </div>
                    <div className="detection-chip-conf">
                      Keyakinan: {(((lastDetection.fruit_confidence ?? 0) * 100)).toFixed(1)}%
                    </div>
                  </div>

                  {/* Chip 4: Overall Condition */}
                  <div className="detection-chip">
                    <div className="detection-chip-title">Kondisi Fisiologis</div>
                    <div className="detection-chip-value">
                      <span className={`badge ${getConditionColor(lastDetection.condition_label)}`}>
                        {lastDetection.condition_label ? lastDetection.condition_label.replace(/_/g, " ").toUpperCase() : "NORMAL"}
                      </span>
                    </div>
                    <div className="detection-chip-conf">
                      Keyakinan: {(lastDetection.condition_confidence * 100).toFixed(1)}%
                    </div>
                  </div>
                </div>

                {(lastDetection.leaf_count_estimate > 0 || lastDetection.fruit_count_estimate > 0) && (
                  <div style={{ display: "flex", gap: "20px", marginTop: "16px", paddingTop: "14px", borderTop: "1px solid var(--border-light)" }}>
                    <span style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
                      Estimasi Daun: <strong>{lastDetection.leaf_count_estimate}</strong> helai
                    </span>
                    <span style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
                      Estimasi Buah: <strong>{lastDetection.fruit_count_estimate}</strong> buah
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Uploaded Photos Gallery Section */}
            <div className="card">
              <div className="card-header">
                <div>
                  <div className="card-title">Galeri Riwayat Foto &amp; Deteksi</div>
                  <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "2px" }}>
                    Arsip foto daun dan buah yang telah dianalisis untuk tanaman ini
                  </p>
                </div>
                <span className="badge badge-info">{photos.length} Foto Tersimpan</span>
              </div>

              {photos.length === 0 ? (
                <div style={{ textAlign: "center", padding: "34px 10px", color: "var(--text-muted)" }}>
                  <div style={{ color: "var(--text-muted)", display: "flex", justifyContent: "center", marginBottom: "8px" }}>
                    <IconCamera size={34} />
                  </div>
                  <p style={{ fontSize: "13px" }}>Belum ada arsip foto untuk tanaman ini. Gunakan panel di atas untuk mengunggah foto.</p>
                </div>
              ) : (
                <div style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
                  gap: "14px",
                  marginTop: "8px",
                }}>
                  {photos.map((p) => {
                    const imgUrl = getPhotoUrl(p);
                    const dt = p.detection;
                    return (
                      <div
                        key={p.id}
                        onClick={() => setInspectPhoto(p)}
                        style={{
                          borderRadius: "var(--radius-lg)",
                          border: "1px solid var(--border-light)",
                          overflow: "hidden",
                          background: "#ffffff",
                          cursor: "pointer",
                          boxShadow: "var(--shadow-sm)",
                          transition: "transform 0.15s ease, box-shadow 0.15s ease",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = "translateY(-3px)";
                          e.currentTarget.style.boxShadow = "var(--shadow-md)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = "translateY(0)";
                          e.currentTarget.style.boxShadow = "var(--shadow-sm)";
                        }}
                      >
                        <div style={{ width: "100%", height: "130px", background: "#f1f5f9", position: "relative" }}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={imgUrl}
                            alt="Foto Cabai"
                            style={{ width: "100%", height: "100%", objectFit: "cover" }}
                            onError={(e) => {
                              e.target.style.display = "none";
                            }}
                          />
                        </div>
                        <div style={{ padding: "10px" }}>
                          <div style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "6px", display: "flex", alignItems: "center", gap: "4px" }}>
                            <IconClock size={11} />
                            <span>{new Date(p.uploaded_at).toLocaleString("id-ID", { dateStyle: "short", timeStyle: "short" })}</span>
                          </div>
                          {dt ? (
                            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                              <span className={`badge ${getConditionColor(dt.leaf_health_label)}`} style={{ fontSize: "11px" }}>
                                Daun: {dt.leaf_health_label || "Normal"}
                              </span>
                              {dt.fruit_stage_label && (
                                <span className="badge badge-info" style={{ fontSize: "10.5px" }}>
                                  Buah: {dt.fruit_stage_label}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>Tanpa data inferensi</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: PERTUMBUHAN & PREDIKSI LSTM */}
        {activeTab === "growth" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            {/* Unified Growth Chart Card */}
            <div className="card">
              <div className="card-header">
                <div>
                  <div className="card-title">Grafik Pertumbuhan &amp; Proyeksi LSTM (14 Hari)</div>
                  <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "2px" }}>
                    Garis solid menunjukkan pengukuran aktual; garis putus-putus menunjukkan proyeksi deret waktu model LSTM
                  </p>
                </div>
                <div style={{ display: "flex", gap: "10px" }}>
                  <button
                    onClick={handlePredict}
                    disabled={predicting || growth.length === 0}
                    style={{
                      background: "linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)",
                      fontSize: "12px",
                      padding: "6px 14px",
                    }}
                  >
                    {predicting ? "Menjalankan Model LSTM..." : "Jalankan Proyeksi 14 Hari"}
                  </button>
                  <button
                    onClick={() => setShowGrowthModal(true)}
                    style={{ padding: "6px 12px", fontSize: "12px", display: "inline-flex", alignItems: "center", gap: "4px" }}
                  >
                    <IconPlus size={14} />
                    <span>Catat Pengukuran</span>
                  </button>
                </div>
              </div>

              <GrowthChart data={growth} predictions={predictions} />
            </div>

            {/* LSTM 14-Day Forecast Cards */}
            {predictions.length > 0 && (
              <div className="card" style={{ borderLeft: "4px solid #8b5cf6" }}>
                <div className="card-header">
                  <div>
                    <div className="card-title">Rincian Proyeksi 14 Hari ke Depan</div>
                    <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "2px" }}>
                      Estimasi pertumbuhan tinggi tanaman, jumlah daun, dan buah
                    </p>
                  </div>
                  <span className="badge badge-purple">Model LSTM Siap Panen</span>
                </div>

                <div className="forecast-grid">
                  {predictions.map((p, i) => (
                    <div className="forecast-item" key={i}>
                      <div className="forecast-day">Hari +{i + 1}</div>
                      <div className="forecast-metric">
                        <span>Tinggi:</span>
                        <strong>{p.predicted_height_cm} cm</strong>
                      </div>
                      <div className="forecast-metric">
                        <span>Daun:</span>
                        <strong>{p.predicted_leaf_count} helai</strong>
                      </div>
                      <div className="forecast-metric">
                        <span>Buah:</span>
                        <strong>{p.predicted_fruit_count} buah</strong>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Growth Records Table */}
            <div className="card">
              <div className="card-header">
                <div>
                  <div className="card-title">Tabel Riwayat Pengukuran Pertumbuhan</div>
                  <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "2px" }}>
                    Daftar log pengukuran fisik berkala yang dimasukkan oleh petani
                  </p>
                </div>
                <span className="badge badge-info">{growth.length} Catatan Data</span>
              </div>

              {growth.length === 0 ? (
                <div style={{ textAlign: "center", padding: "30px", color: "var(--text-muted)", fontSize: "13px" }}>
                  Belum ada log pertumbuhan. Klik &quot;Catat Pengukuran&quot; di atas untuk memasukkan data pertama.
                </div>
              ) : (
                <div className="table-container">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Tanggal Catatan</th>
                        <th>Tinggi Tanaman</th>
                        <th>Jumlah Daun</th>
                        <th>Jumlah Buah</th>
                        <th style={{ textAlign: "right" }}>Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {growth.map((g) => (
                        <tr key={g.id}>
                          <td style={{ fontWeight: 600 }}>
                            {new Date(g.date).toLocaleDateString("id-ID", { dateStyle: "long" })}
                          </td>
                          <td>
                            <strong style={{ color: "var(--primary-700)" }}>{g.height_cm} cm</strong>
                          </td>
                          <td>{g.leaf_count} helai</td>
                          <td>{g.fruit_count} buah</td>
                          <td style={{ textAlign: "right" }}>
                            <button
                              type="button"
                              onClick={() => handleDeleteGrowth(g.id)}
                              style={{
                                background: "transparent",
                                color: "var(--danger)",
                                border: "none",
                                boxShadow: "none",
                                padding: "4px 8px",
                                cursor: "pointer",
                              }}
                              title="Hapus baris ini"
                            >
                              <IconTrash size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Modal Edit Tanaman */}
        {showEditModal && (
          <div style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            backgroundColor: "rgba(15, 23, 42, 0.65)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "20px",
          }}>
            <div style={{
              background: "#ffffff",
              borderRadius: "var(--radius-xl)",
              width: "100%",
              maxWidth: "440px",
              padding: "28px",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.35)",
              border: "1px solid var(--border-light)",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px" }}>
                <h3 style={{ fontSize: "18px", fontWeight: 800, color: "var(--text-primary)" }}>
                  Edit Data Tanaman
                </h3>
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  style={{ background: "transparent", color: "var(--text-muted)", fontSize: "18px", padding: "4px 8px", boxShadow: "none" }}
                >
                  <IconClose size={18} />
                </button>
              </div>

              {editError && (
                <div style={{
                  background: "var(--danger-bg)",
                  color: "var(--danger)",
                  padding: "10px 12px",
                  borderRadius: "var(--radius-md)",
                  fontSize: "12px",
                  marginBottom: "14px",
                  fontWeight: 600,
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}>
                  <IconAlert size={16} />
                  <span>{editError}</span>
                </div>
              )}

              <form onSubmit={handleUpdatePlant} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "6px" }}>
                    Nama Tanaman / Tag <span style={{ color: "var(--danger)" }}>*</span>
                  </label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    style={{ width: "100%" }}
                    required
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "6px" }}>
                    Varietas Tanaman
                  </label>
                  <input
                    type="text"
                    value={editVariety}
                    onChange={(e) => setEditVariety(e.target.value)}
                    style={{ width: "100%" }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "6px" }}>
                    Lokasi Penanaman
                  </label>
                  <input
                    type="text"
                    value={editLocation}
                    onChange={(e) => setEditLocation(e.target.value)}
                    style={{ width: "100%" }}
                  />
                </div>

                <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
                  <button type="submit" disabled={editSubmitting} style={{ flex: 1 }}>
                    {editSubmitting ? "Menyimpan Perubahan..." : "Simpan Perubahan"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowEditModal(false)}
                    className="btn-outline"
                    disabled={editSubmitting}
                  >
                    Batal
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal Catat Pertumbuhan */}
        {showGrowthModal && (
          <div style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            backgroundColor: "rgba(15, 23, 42, 0.65)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "20px",
          }}>
            <div style={{
              background: "#ffffff",
              borderRadius: "var(--radius-xl)",
              width: "100%",
              maxWidth: "440px",
              padding: "28px",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.35)",
              border: "1px solid var(--border-light)",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px" }}>
                <h3 style={{ fontSize: "18px", fontWeight: 800, color: "var(--text-primary)" }}>
                  Catat Log Pertumbuhan
                </h3>
                <button
                  type="button"
                  onClick={() => setShowGrowthModal(false)}
                  style={{ background: "transparent", color: "var(--text-muted)", fontSize: "18px", padding: "4px 8px", boxShadow: "none" }}
                >
                  <IconClose size={18} />
                </button>
              </div>

              {growthError && (
                <div style={{
                  background: "var(--danger-bg)",
                  color: "var(--danger)",
                  padding: "10px 12px",
                  borderRadius: "var(--radius-md)",
                  fontSize: "12px",
                  marginBottom: "14px",
                  fontWeight: 600,
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}>
                  <IconAlert size={16} />
                  <span>{growthError}</span>
                </div>
              )}

              <form onSubmit={handleCreateGrowth} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "6px" }}>
                    Tinggi Tanaman (cm) <span style={{ color: "var(--danger)" }}>*</span>
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    placeholder="Contoh: 38.5"
                    value={heightCm}
                    onChange={(e) => setHeightCm(e.target.value)}
                    style={{ width: "100%" }}
                    required
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "6px" }}>
                    Jumlah Daun (helai) <span style={{ color: "var(--danger)" }}>*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="Contoh: 50"
                    value={leafCount}
                    onChange={(e) => setLeafCount(e.target.value)}
                    style={{ width: "100%" }}
                    required
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "6px" }}>
                    Jumlah Buah Cabai (buah) <span style={{ color: "var(--danger)" }}>*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="Contoh: 14"
                    value={fruitCount}
                    onChange={(e) => setFruitCount(e.target.value)}
                    style={{ width: "100%" }}
                    required
                  />
                </div>

                <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
                  <button type="submit" disabled={growthSubmitting} style={{ flex: 1 }}>
                    {growthSubmitting ? "Menyimpan Data..." : "Simpan Catatan"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowGrowthModal(false)}
                    className="btn-outline"
                    disabled={growthSubmitting}
                  >
                    Batal
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal Catat Sensor Lingkungan */}
        {showSensorModal && (
          <div style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            backgroundColor: "rgba(15, 23, 42, 0.65)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "20px",
          }}>
            <div style={{
              background: "#ffffff",
              borderRadius: "var(--radius-xl)",
              width: "100%",
              maxWidth: "460px",
              padding: "28px",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.35)",
              border: "1px solid var(--border-light)",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px" }}>
                <h3 style={{ fontSize: "18px", fontWeight: 800, color: "var(--text-primary)" }}>
                  Catat Parameter Sensor Tanaman
                </h3>
                <button
                  type="button"
                  onClick={() => setShowSensorModal(false)}
                  style={{ background: "transparent", color: "var(--text-muted)", fontSize: "18px", padding: "4px 8px", boxShadow: "none" }}
                >
                  <IconClose size={18} />
                </button>
              </div>

              {sensorError && (
                <div style={{
                  background: "var(--danger-bg)",
                  color: "var(--danger)",
                  padding: "10px 12px",
                  borderRadius: "var(--radius-md)",
                  fontSize: "12px",
                  marginBottom: "14px",
                  fontWeight: 600,
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}>
                  <IconAlert size={16} />
                  <span>{sensorError}</span>
                </div>
              )}

              <form onSubmit={handleCreateSensor} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "4px" }}>
                      Suhu (°C) <span style={{ color: "var(--danger)" }}>*</span>
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      placeholder="Misal: 28.2"
                      value={sensorTemp}
                      onChange={(e) => setSensorTemp(e.target.value)}
                      style={{ width: "100%" }}
                      required
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "4px" }}>
                      Kelembapan Udara (%) <span style={{ color: "var(--danger)" }}>*</span>
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      placeholder="Misal: 74"
                      value={sensorHumidity}
                      onChange={(e) => setSensorHumidity(e.target.value)}
                      style={{ width: "100%" }}
                      required
                    />
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "4px" }}>
                      Kelembapan Tanah (%) <span style={{ color: "var(--danger)" }}>*</span>
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      placeholder="Misal: 68"
                      value={sensorMoisture}
                      onChange={(e) => setSensorMoisture(e.target.value)}
                      style={{ width: "100%" }}
                      required
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "4px" }}>
                      pH Tanah <span style={{ color: "var(--danger)" }}>*</span>
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      placeholder="Misal: 6.4"
                      value={sensorPh}
                      onChange={(e) => setSensorPh(e.target.value)}
                      style={{ width: "100%" }}
                      required
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "4px" }}>
                    Intensitas Cahaya (Lux) <span style={{ color: "var(--danger)" }}>*</span>
                  </label>
                  <input
                    type="number"
                    step="1"
                    placeholder="Misal: 18500"
                    value={sensorLight}
                    onChange={(e) => setSensorLight(e.target.value)}
                    style={{ width: "100%" }}
                    required
                  />
                </div>

                <div style={{ display: "flex", gap: "10px", marginTop: "8px" }}>
                  <button type="submit" disabled={sensorSubmitting} style={{ flex: 1 }}>
                    {sensorSubmitting ? "Menyimpan Data..." : "Simpan Pembacaan"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowSensorModal(false)}
                    className="btn-outline"
                    disabled={sensorSubmitting}
                  >
                    Batal
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal Inspeksi Foto Detail */}
        {inspectPhoto && (
          <div style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            backgroundColor: "rgba(15, 23, 42, 0.75)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "20px",
          }}>
            <div style={{
              background: "#ffffff",
              borderRadius: "var(--radius-xl)",
              width: "100%",
              maxWidth: "540px",
              padding: "24px",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.4)",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
                <div>
                  <h3 style={{ fontSize: "17px", fontWeight: 800, color: "var(--text-primary)" }}>
                    Rincian Analisis Foto CNN
                  </h3>
                  <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                    Diunggah: {new Date(inspectPhoto.uploaded_at).toLocaleString("id-ID", { dateStyle: "long", timeStyle: "short" })}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setInspectPhoto(null)}
                  style={{ background: "transparent", color: "var(--text-muted)", fontSize: "18px", padding: "4px 8px", boxShadow: "none" }}
                >
                  <IconClose size={18} />
                </button>
              </div>

              <div style={{
                width: "100%",
                height: "260px",
                background: "#0f172a",
                borderRadius: "var(--radius-lg)",
                overflow: "hidden",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: "16px",
              }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={getPhotoUrl(inspectPhoto)}
                  alt="Detail Foto"
                  style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }}
                />
              </div>

              {inspectPhoto.detection ? (
                <div style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "10px",
                  fontSize: "12.5px",
                  background: "#f8fafc",
                  padding: "14px",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--border-light)",
                }}>
                  <div>
                    <span style={{ color: "var(--text-muted)", display: "block" }}>Kesehatan Daun:</span>
                    <strong style={{ color: "var(--text-primary)" }}>
                      {inspectPhoto.detection.leaf_health_label || "Normal"} ({(((inspectPhoto.detection.leaf_confidence ?? 0) * 100)).toFixed(1)}%)
                    </strong>
                  </div>
                  <div>
                    <span style={{ color: "var(--text-muted)", display: "block" }}>Tahap Buah:</span>
                    <strong style={{ color: "var(--text-primary)" }}>
                      {inspectPhoto.detection.fruit_stage_label || "Tidak ada"} ({(((inspectPhoto.detection.fruit_confidence ?? 0) * 100)).toFixed(1)}%)
                    </strong>
                  </div>
                  <div>
                    <span style={{ color: "var(--text-muted)", display: "block" }}>Kondisi Keseluruhan:</span>
                    <strong style={{ color: "var(--text-primary)" }}>
                      {inspectPhoto.detection.condition_label || "Normal"} ({(((inspectPhoto.detection.condition_confidence ?? 0) * 100)).toFixed(1)}%)
                    </strong>
                  </div>
                  <div>
                    <span style={{ color: "var(--text-muted)", display: "block" }}>Deteksi Tanaman:</span>
                    <strong style={{ color: inspectPhoto.detection.plant_detected ? "var(--primary-600)" : "var(--danger)" }}>
                      {inspectPhoto.detection.plant_detected ? "Valid Tanaman" : "Bukan Tanaman"} ({(inspectPhoto.detection.plant_confidence * 100).toFixed(1)}%)
                    </strong>
                  </div>
                </div>
              ) : (
                <p style={{ fontSize: "13px", color: "var(--text-muted)" }}>Data deteksi tidak tersedia untuk foto ini.</p>
              )}

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "18px" }}>
                <button
                  type="button"
                  onClick={() => handleDeletePhoto(inspectPhoto.id)}
                  style={{ background: "#fee2e2", color: "#b91c1c", border: "1px solid #fca5a5", fontSize: "12.5px", display: "inline-flex", alignItems: "center", gap: "6px" }}
                >
                  <IconTrash size={14} />
                  <span>Hapus Foto Ini</span>
                </button>
                <button
                  type="button"
                  onClick={() => setInspectPhoto(null)}
                  className="btn-outline"
                  style={{ fontSize: "12.5px" }}
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Printable Signature & Validation Block */}
        <div className="print-only">
          <div className="print-signatures">
            <div style={{ textAlign: "center" }}>
              <p style={{ fontSize: "9pt", color: "#64748b", marginBottom: "4px" }}>Petugas Agronomis Lapangan,</p>
              <div className="print-sign-box">
                ( .................................................. )<br />
                <span style={{ fontSize: "8pt", fontWeight: "normal", color: "#64748b" }}>NIP / ID Agronomis</span>
              </div>
            </div>
            <div style={{ textAlign: "center" }}>
              <p style={{ fontSize: "9pt", color: "#64748b", marginBottom: "4px" }}>Pemilik / Pengelola Kebun,</p>
              <div className="print-sign-box">
                ( .................................................. )<br />
                <span style={{ fontSize: "8pt", fontWeight: "normal", color: "#64748b" }}>Nama &amp; Tanda Tangan</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
