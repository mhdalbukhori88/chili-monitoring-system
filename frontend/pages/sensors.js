import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import Head from "next/head";
import Sidebar from "../components/Sidebar";
import {
  getPlants,
  getSensors,
  createSensorReading,
  deleteSensorReading,
  API_URL,
} from "../lib/api";
import {
  IconThermometer,
  IconDroplet,
  IconPlant,
  IconFlask,
  IconSun,
  IconPlus,
  IconClose,
  IconAlert,
  IconDownload,
  IconRefresh,
  IconTrash,
} from "../components/Icons";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

export default function Sensors() {
  const [plants, setPlants] = useState([]);
  const [selectedPlantId, setSelectedPlantId] = useState(null);
  const [readings, setReadings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeChartTab, setActiveChartTab] = useState("temp_humidity"); // 'temp_humidity' | 'soil' | 'light'
  const [timeframe, setTimeframe] = useState("all"); // 'all' | '24h' | '7d'

  // Manual Reading Modal
  const [showModal, setShowModal] = useState(false);
  const [temp, setTemp] = useState("");
  const [humidity, setHumidity] = useState("");
  const [soilMoisture, setSoilMoisture] = useState("");
  const [soilPh, setSoilPh] = useState("");
  const [lightLux, setLightLux] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Guide Toggle
  const [showGuide, setShowGuide] = useState(false);

  const loadPlantsAndSensors = () => {
    setLoading(true);
    getPlants()
      .then((res) => {
        setPlants(res.data);
        if (res.data.length && !selectedPlantId) {
          setSelectedPlantId(res.data[0].id);
        }
      })
      .catch((err) => console.error("Gagal memuat tanaman:", err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadPlantsAndSensors();
  }, []);

  useEffect(() => {
    if (selectedPlantId) {
      getSensors(selectedPlantId)
        .then((res) => setReadings(res.data))
        .catch((err) => console.error("Gagal memuat sensor:", err));
    } else {
      setReadings([]);
    }
  }, [selectedPlantId]);

  const handleAddReading = async (e) => {
    e.preventDefault();
    if (!selectedPlantId) {
      setErrorMsg("Pilih tanaman terlebih dahulu.");
      return;
    }
    if (!temp || !humidity || !soilMoisture || !soilPh || !lightLux) {
      setErrorMsg("Semua parameter sensor wajib diisi.");
      return;
    }
    setSubmitting(true);
    setErrorMsg("");
    try {
      await createSensorReading({
        plant_id: selectedPlantId,
        temperature_c: parseFloat(temp),
        humidity_pct: parseFloat(humidity),
        soil_moisture_pct: parseFloat(soilMoisture),
        soil_ph: parseFloat(soilPh),
        light_lux: parseFloat(lightLux),
      });
      setTemp("");
      setHumidity("");
      setSoilMoisture("");
      setSoilPh("");
      setLightLux("");
      setShowModal(false);
      getSensors(selectedPlantId).then((res) => setReadings(res.data));
    } catch (err) {
      setErrorMsg("Gagal menyimpan pembacaan: " + (err.response?.data?.detail || err.message));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteReading = async (readingId) => {
    if (confirm("Hapus data pembacaan sensor ini?")) {
      try {
        await deleteSensorReading(readingId);
        setReadings((prev) => prev.filter((r) => r.id !== readingId));
      } catch (err) {
        alert("Gagal menghapus data sensor: " + (err.response?.data?.detail || err.message));
      }
    }
  };

  const handleExportCSV = () => {
    if (readings.length === 0) {
      alert("Tidak ada data sensor untuk diekspor.");
      return;
    }
    const selectedPlant = plants.find((p) => p.id === selectedPlantId);
    const plantName = selectedPlant?.name || `Tanaman_${selectedPlantId}`;
    const headers = ["ID", "Waktu", "Suhu (°C)", "Kelembapan Udara (%)", "Kelembapan Tanah (%)", "pH Tanah", "Intensitas Cahaya (Lux)"];
    const rows = readings.map((r) => [
      r.id,
      `"${new Date(r.recorded_at).toISOString()}"`,
      r.temperature_c,
      r.humidity_pct,
      r.soil_moisture_pct,
      r.soil_ph,
      r.light_lux,
    ]);

    const csvContent = [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `telemetri_${plantName.replace(/\s+/g, "_")}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filtered readings based on timeframe
  const filteredReadings = useMemo(() => {
    if (timeframe === "all") return readings;
    const now = new Date().getTime();
    const thresholdHours = timeframe === "24h" ? 24 : timeframe === "7d" ? 168 : 720;
    return readings.filter((r) => {
      const recTime = new Date(r.recorded_at).getTime();
      return (now - recTime) / (1000 * 60 * 60) <= thresholdHours;
    });
  }, [readings, timeframe]);

  // Formatted chart data (ascending order)
  const chartData = useMemo(() => {
    return [...filteredReadings].reverse().map((r) => ({
      ...r,
      timeLabel: new Date(r.recorded_at).toLocaleString("id-ID", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
    }));
  }, [filteredReadings]);

  const latestReading = readings.length > 0 ? readings[0] : null;
  const selectedPlant = plants.find((p) => p.id === selectedPlantId);

  // Agronomic assessment helpers
  const getTempStatus = (t) => {
    if (t === null || t === undefined) return { label: "Tidak Ada Data", color: "var(--text-muted)" };
    if (t >= 24 && t <= 28) return { label: "Optimal (24-28°C)", color: "var(--success)" };
    if (t >= 18 && t <= 32) return { label: "Toleransi Wajar (18-32°C)", color: "var(--warning)" };
    return { label: t > 32 ? "Terlalu Panas (>32°C)" : "Terlalu Dingin (<18°C)", color: "var(--danger)" };
  };

  const getHumidityStatus = (h) => {
    if (h === null || h === undefined) return { label: "Tidak Ada Data", color: "var(--text-muted)" };
    if (h >= 60 && h <= 80) return { label: "Optimal (60-80%)", color: "var(--success)" };
    if (h > 80) return { label: "Terlalu Lembap (>80%) - Rawan Jamur", color: "var(--warning)" };
    return { label: "Kering (<60%)", color: "var(--warning)" };
  };

  const getSoilMoistureStatus = (sm) => {
    if (sm === null || sm === undefined) return { label: "Tidak Ada Data", color: "var(--text-muted)" };
    if (sm >= 60 && sm <= 75) return { label: "Lembap Optimal (60-75%)", color: "var(--success)" };
    if (sm < 50) return { label: "Kering (<50%) - Butuh Irigasi", color: "var(--danger)" };
    if (sm > 80) return { label: "Tergenang Air (>80%)", color: "var(--warning)" };
    return { label: "Cukup Baik", color: "var(--primary-600)" };
  };

  const getPhStatus = (ph) => {
    if (ph === null || ph === undefined) return { label: "Tidak Ada Data", color: "var(--text-muted)" };
    if (ph >= 6.0 && ph <= 6.8) return { label: "Optimal (6.0 - 6.8)", color: "var(--success)" };
    if (ph < 6.0) return { label: "Terlalu Asam (<6.0)", color: "var(--warning)" };
    return { label: "Terlalu Basa (>6.8)", color: "var(--warning)" };
  };

  return (
    <div className="layout">
      <Head>
        <title>Telemetri Sensor Lingkungan - Chili Monitor Platform</title>
      </Head>
      <Sidebar />
      <main className="main">
        <div className="page-header">
          <div className="page-title-group">
            <h2>Telemetri Sensor Lingkungan IoT</h2>
            <p className="page-subtitle">
              Monitoring parameter mikroklimat tanah dan udara di sekitar tanaman cabai secara real-time
            </p>
          </div>
          <div className="header-badges">
            <button
              onClick={() => setShowModal(true)}
              disabled={plants.length === 0}
              style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
            >
              <IconPlus size={14} />
              <span>Catat Sensor Manual</span>
            </button>
            <button
              onClick={handleExportCSV}
              disabled={readings.length === 0}
              className="btn-outline"
              style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
              title="Unduh data sensor dalam format CSV"
            >
              <IconDownload size={14} />
              <span>Ekspor CSV</span>
            </button>
            <button
              onClick={() => setShowGuide(!showGuide)}
              className="btn-outline"
              style={{ fontSize: "12px", padding: "6px 12px" }}
            >
              {showGuide ? "Tutup Panduan IoT" : "Panduan Integrasi IoT"}
            </button>
          </div>
        </div>

        {/* IoT Hardware Integration Guide Dropdown */}
        {showGuide && (
          <div className="card" style={{ borderLeft: "4px solid var(--info)", background: "#f0f9ff", marginBottom: "20px" }}>
            <h4 style={{ fontSize: "15px", fontWeight: 800, color: "#0369a1", marginBottom: "8px" }}>
              Panduan Kirim Data Telemetri via Hardware (ESP32 / Arduino / RPi / Python)
            </h4>
            <p style={{ fontSize: "13px", color: "#0c4a6e", marginBottom: "12px" }}>
              Kirimkan HTTP POST request dari mikrokontroler dengan header <code>Authorization: Bearer &lt;TOKEN_JWT&gt;</code> ke endpoint:
            </p>
            <pre style={{
              background: "#0f172a",
              color: "#38bdf8",
              padding: "14px",
              borderRadius: "var(--radius-md)",
              fontSize: "12px",
              fontFamily: "monospace",
              overflowX: "auto",
            }}>
{`POST ${API_URL}/sensors/
Content-Type: application/json
Authorization: Bearer <TOKEN_PENGGUNA>

{
  "plant_id": ${selectedPlantId || 1},
  "temperature_c": 28.5,
  "humidity_pct": 74.0,
  "soil_moisture_pct": 65.0,
  "soil_ph": 6.4,
  "light_lux": 18500.0
}`}
            </pre>
          </div>
        )}

        {/* Plant Selector Bar */}
        {plants.length > 0 && (
          <div className="card" style={{ padding: "14px 20px", marginBottom: "20px", display: "flex", gap: "14px", alignItems: "center", flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ color: "var(--primary-600)" }}><IconPlant size={18} /></span>
              <label style={{ fontSize: "13px", fontWeight: 700, color: "var(--text-secondary)" }}>
                Pilih Tanaman Terpantau:
              </label>
            </div>
            <select
              value={selectedPlantId || ""}
              onChange={(e) => setSelectedPlantId(Number(e.target.value))}
              style={{ fontSize: "13px", minWidth: "240px", padding: "6px 12px" }}
            >
              {plants.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.variety || "Umum"})
                </option>
              ))}
            </select>
            {selectedPlant && (
              <span style={{ fontSize: "12.5px", color: "var(--text-muted)" }}>
                Lokasi: <strong>{selectedPlant.location || "Kebun"}</strong> • Total {readings.length} pembacaan
              </span>
            )}
            <div style={{ marginLeft: "auto", display: "flex", gap: "6px" }}>
              <button
                type="button"
                onClick={() => setTimeframe("all")}
                style={{
                  background: timeframe === "all" ? "var(--primary-600)" : "transparent",
                  color: timeframe === "all" ? "#ffffff" : "var(--text-secondary)",
                  padding: "4px 10px",
                  fontSize: "11.5px",
                  borderRadius: "var(--radius-sm)",
                  boxShadow: "none",
                }}
              >
                Semua
              </button>
              <button
                type="button"
                onClick={() => setTimeframe("7d")}
                style={{
                  background: timeframe === "7d" ? "var(--primary-600)" : "transparent",
                  color: timeframe === "7d" ? "#ffffff" : "var(--text-secondary)",
                  padding: "4px 10px",
                  fontSize: "11.5px",
                  borderRadius: "var(--radius-sm)",
                  boxShadow: "none",
                }}
              >
                7 Hari Terakhir
              </button>
              <button
                type="button"
                onClick={() => setTimeframe("24h")}
                style={{
                  background: timeframe === "24h" ? "var(--primary-600)" : "transparent",
                  color: timeframe === "24h" ? "#ffffff" : "var(--text-secondary)",
                  padding: "4px 10px",
                  fontSize: "11.5px",
                  borderRadius: "var(--radius-sm)",
                  boxShadow: "none",
                }}
              >
                24 Jam Terakhir
              </button>
            </div>
          </div>
        )}

        {/* Live Metric Cards Grid */}
        {latestReading && (
          <div className="telemetry-grid">
            {/* Card 1: Suhu Udara */}
            <div className="telemetry-card">
              <div className="telemetry-head">
                <span className="telemetry-title">Suhu Udara</span>
                <span style={{ color: "#f97316" }}><IconThermometer size={20} /></span>
              </div>
              <div>
                <div className="telemetry-val">
                  {latestReading.temperature_c}
                  <span className="telemetry-unit">°C</span>
                </div>
                <div className="telemetry-status" style={{ color: getTempStatus(latestReading.temperature_c).color }}>
                  • {getTempStatus(latestReading.temperature_c).label}
                </div>
              </div>
            </div>

            {/* Card 2: Kelembapan Udara */}
            <div className="telemetry-card">
              <div className="telemetry-head">
                <span className="telemetry-title">Kelembapan Udara</span>
                <span style={{ color: "#0ea5e9" }}><IconDroplet size={20} /></span>
              </div>
              <div>
                <div className="telemetry-val">
                  {latestReading.humidity_pct}
                  <span className="telemetry-unit">%</span>
                </div>
                <div className="telemetry-status" style={{ color: getHumidityStatus(latestReading.humidity_pct).color }}>
                  • {getHumidityStatus(latestReading.humidity_pct).label}
                </div>
              </div>
            </div>

            {/* Card 3: Kelembapan Tanah */}
            <div className="telemetry-card">
              <div className="telemetry-head">
                <span className="telemetry-title">Kelembapan Tanah</span>
                <span style={{ color: "#10b981" }}><IconDroplet size={20} /></span>
              </div>
              <div>
                <div className="telemetry-val">
                  {latestReading.soil_moisture_pct}
                  <span className="telemetry-unit">%</span>
                </div>
                <div className="telemetry-status" style={{ color: getSoilMoistureStatus(latestReading.soil_moisture_pct).color }}>
                  • {getSoilMoistureStatus(latestReading.soil_moisture_pct).label}
                </div>
              </div>
            </div>

            {/* Card 4: pH Tanah */}
            <div className="telemetry-card">
              <div className="telemetry-head">
                <span className="telemetry-title">Tingkat pH Tanah</span>
                <span style={{ color: "#8b5cf6" }}><IconFlask size={20} /></span>
              </div>
              <div>
                <div className="telemetry-val">
                  {latestReading.soil_ph}
                  <span className="telemetry-unit">pH</span>
                </div>
                <div className="telemetry-status" style={{ color: getPhStatus(latestReading.soil_ph).color }}>
                  • {getPhStatus(latestReading.soil_ph).label}
                </div>
              </div>
            </div>

            {/* Card 5: Intensitas Cahaya */}
            <div className="telemetry-card">
              <div className="telemetry-head">
                <span className="telemetry-title">Intensitas Cahaya</span>
                <span style={{ color: "#eab308" }}><IconSun size={20} /></span>
              </div>
              <div>
                <div className="telemetry-val">
                  {latestReading.light_lux?.toLocaleString("id-ID")}
                  <span className="telemetry-unit">Lux</span>
                </div>
                <div className="telemetry-status" style={{ color: "var(--text-muted)" }}>
                  • Pembacaan Sensor LDR
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Telemetry Interactive Trend Chart */}
        <div className="card" style={{ marginBottom: "24px" }}>
          <div className="card-header">
            <div>
              <div className="card-title">Grafik Tren Telemetri Mikroklimat</div>
              <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "2px" }}>
                Fluktuasi data parameter lingkungan historis dari sensor telemetri
              </p>
            </div>
            <div style={{ display: "flex", gap: "6px" }}>
              <button
                type="button"
                onClick={() => setActiveChartTab("temp_humidity")}
                style={{
                  background: activeChartTab === "temp_humidity" ? "var(--primary-600)" : "transparent",
                  color: activeChartTab === "temp_humidity" ? "#ffffff" : "var(--text-secondary)",
                  border: "1px solid var(--border-light)",
                  padding: "6px 12px",
                  fontSize: "12px",
                  boxShadow: "none",
                }}
              >
                Suhu &amp; Kelembapan Udara
              </button>
              <button
                type="button"
                onClick={() => setActiveChartTab("soil")}
                style={{
                  background: activeChartTab === "soil" ? "var(--primary-600)" : "transparent",
                  color: activeChartTab === "soil" ? "#ffffff" : "var(--text-secondary)",
                  border: "1px solid var(--border-light)",
                  padding: "6px 12px",
                  fontSize: "12px",
                  boxShadow: "none",
                }}
              >
                Kelembapan &amp; pH Tanah
              </button>
              <button
                type="button"
                onClick={() => setActiveChartTab("light")}
                style={{
                  background: activeChartTab === "light" ? "var(--primary-600)" : "transparent",
                  color: activeChartTab === "light" ? "#ffffff" : "var(--text-secondary)",
                  border: "1px solid var(--border-light)",
                  padding: "6px 12px",
                  fontSize: "12px",
                  boxShadow: "none",
                }}
              >
                Intensitas Cahaya
              </button>
            </div>
          </div>

          {chartData.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px", color: "var(--text-muted)", fontSize: "13px" }}>
              Belum ada rekaman sensor untuk tanaman ini pada rentang waktu terpilih.
            </div>
          ) : (
            <div style={{ width: "100%", height: 320 }}>
              <ResponsiveContainer width="100%" height="100%">
                {activeChartTab === "temp_humidity" ? (
                  <LineChart data={chartData} margin={{ top: 10, right: 20, left: -10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="timeLabel" tick={{ fontSize: 11, fill: "#64748b" }} />
                    <YAxis yAxisId="left" tick={{ fontSize: 11, fill: "#64748b" }} unit="°C" />
                    <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: "#64748b" }} unit="%" />
                    <Tooltip />
                    <Legend verticalAlign="top" align="right" wrapperStyle={{ paddingBottom: 10 }} />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="temperature_c"
                      name="Suhu Udara (°C)"
                      stroke="#f97316"
                      strokeWidth={2.5}
                      dot={{ r: 3 }}
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="humidity_pct"
                      name="Kelembapan Udara (%)"
                      stroke="#0ea5e9"
                      strokeWidth={2.5}
                      dot={{ r: 3 }}
                    />
                  </LineChart>
                ) : activeChartTab === "soil" ? (
                  <LineChart data={chartData} margin={{ top: 10, right: 20, left: -10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="timeLabel" tick={{ fontSize: 11, fill: "#64748b" }} />
                    <YAxis yAxisId="left" tick={{ fontSize: 11, fill: "#64748b" }} unit="%" />
                    <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: "#64748b" }} unit=" pH" />
                    <Tooltip />
                    <Legend verticalAlign="top" align="right" wrapperStyle={{ paddingBottom: 10 }} />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="soil_moisture_pct"
                      name="Kelembapan Tanah (%)"
                      stroke="#10b981"
                      strokeWidth={2.5}
                      dot={{ r: 3 }}
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="soil_ph"
                      name="pH Tanah"
                      stroke="#8b5cf6"
                      strokeWidth={2.5}
                      dot={{ r: 3 }}
                    />
                  </LineChart>
                ) : (
                  <LineChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="timeLabel" tick={{ fontSize: 11, fill: "#64748b" }} />
                    <YAxis tick={{ fontSize: 11, fill: "#64748b" }} unit=" lx" />
                    <Tooltip />
                    <Legend verticalAlign="top" align="right" wrapperStyle={{ paddingBottom: 10 }} />
                    <Line
                      type="monotone"
                      dataKey="light_lux"
                      name="Intensitas Cahaya (Lux)"
                      stroke="#eab308"
                      strokeWidth={2.5}
                      dot={{ r: 3 }}
                    />
                  </LineChart>
                )}
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Telemetry Data Log Table */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Tabel Riwayat Pembacaan Telemetri</div>
              <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "2px" }}>
                Arsip lengkap data mikroklimat yang tercatat dari sensor IoT
              </p>
            </div>
            <span className="badge badge-info">{readings.length} Log Data</span>
          </div>

          {readings.length === 0 ? (
            <div style={{ textAlign: "center", padding: "30px", color: "var(--text-muted)", fontSize: "13px" }}>
              Belum ada riwayat telemetri. Tambahkan pembacaan manual atau kirim data via hardware IoT.
            </div>
          ) : (
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Waktu Pembacaan</th>
                    <th>Suhu Udara</th>
                    <th>Kelembapan Udara</th>
                    <th>Kelembapan Tanah</th>
                    <th>pH Tanah</th>
                    <th>Intensitas Cahaya</th>
                    <th style={{ textAlign: "right" }}>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {readings.slice(0, 50).map((r) => (
                    <tr key={r.id}>
                      <td style={{ fontWeight: 600 }}>
                        {new Date(r.recorded_at).toLocaleString("id-ID", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </td>
                      <td>
                        <strong style={{ color: "#f97316" }}>{r.temperature_c}°C</strong>
                      </td>
                      <td>
                        <strong style={{ color: "#0ea5e9" }}>{r.humidity_pct}%</strong>
                      </td>
                      <td>
                        <strong style={{ color: "#10b981" }}>{r.soil_moisture_pct}%</strong>
                      </td>
                      <td>
                        <strong style={{ color: "#8b5cf6" }}>{r.soil_ph}</strong>
                      </td>
                      <td>
                        <span style={{ color: "#ca8a04", fontFamily: "monospace" }}>
                          {r.light_lux ? r.light_lux.toLocaleString("id-ID") : "-"} Lux
                        </span>
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <button
                          type="button"
                          onClick={() => handleDeleteReading(r.id)}
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

        {/* Modal Catat Sensor Manual */}
        {showModal && (
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
                  Catat Parameter Sensor Manual
                </h3>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  style={{ background: "transparent", color: "var(--text-muted)", fontSize: "18px", padding: "4px 8px", boxShadow: "none" }}
                >
                  <IconClose size={18} />
                </button>
              </div>

              {errorMsg && (
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
                  <span>{errorMsg}</span>
                </div>
              )}

              <form onSubmit={handleAddReading} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "4px" }}>
                    Tanaman Sasaran <span style={{ color: "var(--danger)" }}>*</span>
                  </label>
                  <select
                    value={selectedPlantId || ""}
                    onChange={(e) => setSelectedPlantId(Number(e.target.value))}
                    style={{ width: "100%" }}
                    required
                  >
                    {plants.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.variety || "Umum"})
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "4px" }}>
                      Suhu (°C) <span style={{ color: "var(--danger)" }}>*</span>
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      placeholder="Misal: 28.5"
                      value={temp}
                      onChange={(e) => setTemp(e.target.value)}
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
                      placeholder="Misal: 72"
                      value={humidity}
                      onChange={(e) => setHumidity(e.target.value)}
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
                      placeholder="Misal: 65"
                      value={soilMoisture}
                      onChange={(e) => setSoilMoisture(e.target.value)}
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
                      value={soilPh}
                      onChange={(e) => setSoilPh(e.target.value)}
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
                    value={lightLux}
                    onChange={(e) => setLightLux(e.target.value)}
                    style={{ width: "100%" }}
                    required
                  />
                </div>

                <div style={{ display: "flex", gap: "10px", marginTop: "8px" }}>
                  <button type="submit" disabled={submitting} style={{ flex: 1 }}>
                    {submitting ? "Menyimpan Data..." : "Simpan Pembacaan"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="btn-outline"
                    disabled={submitting}
                  >
                    Batal
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
