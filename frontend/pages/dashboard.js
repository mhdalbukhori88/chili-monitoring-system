import { useEffect, useState } from "react";
import Link from "next/link";
import Head from "next/head";
import Sidebar from "../components/Sidebar";
import { getDashboard, getPlants } from "../lib/api";
import { useAuth } from "../lib/useAuth";
import {
  IconPlant,
  IconCamera,
  IconAlert,
  IconRuler,
  IconThermometer,
  IconDroplet,
  IconChat,
  IconCpu,
  IconArrowRight,
  IconPlus,
} from "../components/Icons";

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [plants, setPlants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const loadData = () => {
    setLoading(true);
    setError(false);
    Promise.all([getDashboard(), getPlants()])
      .then(([dashRes, plantRes]) => {
        setStats(dashRes.data);
        setPlants(plantRes.data);
      })
      .catch((err) => {
        console.error("Gagal memuat data dashboard:", err);
        setError(true);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    loadData();
  }, []);

  const displayName = user?.full_name || user?.username || "Pengguna";

  return (
    <div className="layout">
      <Head>
        <title>Dashboard Pemantauan - Chili Monitor Platform</title>
      </Head>
      <Sidebar />
      <main className="main">
        {/* Header Halaman */}
        <div className="page-header">
          <div className="page-title-group">
            <h2>Dashboard Pemantauan Tanaman</h2>
            <p className="page-subtitle">
              Sistem terintegrasi analisis visual CNN multi-head, peramalan LSTM 14 hari, dan telemetri mikroklimat
            </p>
          </div>
          <div className="header-badges">
            <span className="badge badge-success">
              <span className="status-dot"></span> Sistem Operasional: Normal
            </span>
            <span className="badge badge-purple" style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
              <IconCpu size={14} /> AI Engine Online
            </span>
          </div>
        </div>

        {/* Welcome Hero Banner */}
        <div className="welcome-banner">
          <div className="welcome-content">
            <h3>Selamat Datang kembali, {displayName}</h3>
            <p>
              Pantau kondisi fisiologis, deteksi dini penyakit daun dan hama, perkembangan fase buah, serta proyeksi pertumbuhan tanaman cabai Anda secara real-time.
            </p>
          </div>
          <div className="welcome-actions">
            <Link href="/plants">
              <button style={{ background: "white", color: "#064e3b", fontWeight: 700, display: "inline-flex", alignItems: "center", gap: "8px" }}>
                <IconPlant size={16} />
                <span>Kelola Tanaman</span>
              </button>
            </Link>
          </div>
        </div>

        {loading ? (
          <div className="card" style={{ textAlign: "center", padding: "50px 20px" }}>
            <p style={{ color: "var(--text-secondary)", fontWeight: 600 }}>Memuat statistik dan telemetri kebun cabai Anda...</p>
          </div>
        ) : error ? (
          <div className="card" style={{ textAlign: "center", padding: "40px 20px" }}>
            <div style={{ color: "var(--danger)", display: "flex", justifyContent: "center", marginBottom: "12px" }}>
              <IconAlert size={36} />
            </div>
            <p style={{ color: "var(--danger)", fontWeight: 700, fontSize: "16px" }}>Kendala Memuat Data Dashboard</p>
            <p style={{ fontSize: "13px", color: "var(--text-muted)", marginTop: "6px" }}>
              Tidak dapat mengambil data dari backend. Periksa koneksi server atau coba lagi.
            </p>
            <button onClick={loadData} style={{ marginTop: "16px" }}>
              Muat Ulang
            </button>
          </div>
        ) : stats ? (
          <>
            {/* Unresolved Alerts Notice Banner */}
            {stats.total_alerts_unresolved > 0 && (
              <div style={{
                background: "linear-gradient(90deg, #fef2f2 0%, #fff1f2 100%)",
                border: "1px solid #fecaca",
                borderLeft: "4px solid #ef4444",
                borderRadius: "var(--radius-lg)",
                padding: "14px 20px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "20px",
                flexWrap: "wrap",
                gap: "12px",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <span style={{ color: "#ef4444", display: "flex" }}><IconAlert size={22} /></span>
                  <div>
                    <div style={{ fontWeight: 700, color: "#991b1b", fontSize: "14px" }}>
                      Terdapat {stats.total_alerts_unresolved} Peringatan Anomali Aktif yang Memerlukan Tindakan
                    </div>
                    <div style={{ fontSize: "12.5px", color: "#b91c1c" }}>
                      Sistem mendeteksi mikroklimat ekstrem atau indikasi kelainan pada tanaman cabai Anda.
                    </div>
                  </div>
                </div>
                <Link href="/alerts">
                  <button style={{ background: "#dc2626", padding: "6px 14px", fontSize: "12px", display: "inline-flex", alignItems: "center", gap: "6px" }}>
                    <span>Tinjau Peringatan</span>
                    <IconArrowRight size={14} />
                  </button>
                </Link>
              </div>
            )}

            {/* Onboarding State if No Plants */}
            {stats.total_plants === 0 ? (
              <div className="card" style={{ borderLeft: "4px solid var(--primary-500)", padding: "32px" }}>
                <div style={{ maxWidth: "680px" }}>
                  <span className="badge badge-success" style={{ marginBottom: "12px" }}>
                    Langkah Awal Memulai
                  </span>
                  <h3 style={{ fontSize: "20px", fontWeight: 800, color: "var(--text-primary)", marginBottom: "8px" }}>
                    Daftarkan Tanaman Cabai Pertama Anda
                  </h3>
                  <p style={{ fontSize: "14px", color: "var(--text-secondary)", lineHeight: 1.6, marginBottom: "20px" }}>
                    Anda belum memiliki tanaman terdaftar. Mulai dengan mendaftarkan varietas dan lokasi tanaman cabai Anda. Setelah terdaftar, Anda dapat mengunggah foto daun untuk deteksi penyakit otomatis menggunakan model CNN serta memantau sensor kelembapan tanah.
                  </p>
                  <Link href="/plants">
                    <button style={{ padding: "12px 24px", fontSize: "14px", display: "inline-flex", alignItems: "center", gap: "8px" }}>
                      <IconPlus size={16} />
                      <span>Daftarkan Tanaman Pertama Sekarang</span>
                    </button>
                  </Link>
                </div>
              </div>
            ) : (
              <div className="stats-grid">
                {/* Stat 1: Total Tanaman */}
                <div className="stat-card">
                  <div className="stat-header">
                    <div>
                      <div className="stat-label">Total Tanaman Aktif</div>
                      <div className="stat-value">{stats.total_plants}</div>
                    </div>
                    <div className="stat-icon green">
                      <IconPlant size={22} />
                    </div>
                  </div>
                  <div className="stat-footer">
                    <span className="stat-trend">Terpantau aktif</span>
                    <Link href="/plants" style={{ color: "var(--primary-600)", textDecoration: "none", fontWeight: 600 }}>
                      Lihat daftar &rarr;
                    </Link>
                  </div>
                </div>

                {/* Stat 2: Foto Terdeteksi CNN */}
                <div className="stat-card">
                  <div className="stat-header">
                    <div>
                      <div className="stat-label">Foto Teranalisis CNN</div>
                      <div className="stat-value">{stats.total_photos}</div>
                    </div>
                    <div className="stat-icon blue">
                      <IconCamera size={22} />
                    </div>
                  </div>
                  <div className="stat-footer">
                    <span className="stat-trend">MobileNetV3 Multi-Head</span>
                    <span>Tersimpan</span>
                  </div>
                </div>

                {/* Stat 3: Peringatan / Alert */}
                <div className="stat-card">
                  <div className="stat-header">
                    <div>
                      <div className="stat-label">Peringatan Anomali</div>
                      <div className="stat-value" style={{ color: stats.total_alerts_unresolved > 0 ? "var(--danger)" : "var(--success)" }}>
                        {stats.total_alerts_unresolved}
                      </div>
                    </div>
                    <div className={`stat-icon ${stats.total_alerts_unresolved > 0 ? "red" : "green"}`}>
                      <IconAlert size={22} />
                    </div>
                  </div>
                  <div className="stat-footer">
                    <span>{stats.total_alerts_unresolved > 0 ? "Perlu perhatian" : "Kondisi optimal"}</span>
                    <Link href="/alerts" style={{ color: "var(--primary-600)", textDecoration: "none", fontWeight: 600 }}>
                      Tinjau &rarr;
                    </Link>
                  </div>
                </div>

                {/* Stat 4: Rata-rata Tinggi Tanaman */}
                <div className="stat-card">
                  <div className="stat-header">
                    <div>
                      <div className="stat-label">Rata-rata Tinggi Tanaman</div>
                      <div className="stat-value">
                        {stats.avg_height_cm !== null ? `${stats.avg_height_cm} cm` : "-"}
                      </div>
                    </div>
                    <div className="stat-icon purple">
                      <IconRuler size={22} />
                    </div>
                  </div>
                  <div className="stat-footer">
                    <span className="stat-trend">Histori pertumbuhan</span>
                    <span>Log pengukuran</span>
                  </div>
                </div>

                {/* Stat 5: Rata-rata Suhu */}
                <div className="stat-card">
                  <div className="stat-header">
                    <div>
                      <div className="stat-label">Suhu Lingkungan Rata-rata</div>
                      <div className="stat-value">
                        {stats.avg_temperature_c !== null ? `${stats.avg_temperature_c}°C` : "-"}
                      </div>
                    </div>
                    <div className="stat-icon orange">
                      <IconThermometer size={22} />
                    </div>
                  </div>
                  <div className="stat-footer">
                    <span>Rentang ideal: 18 - 32°C</span>
                    <span className="stat-trend">
                      {stats.avg_temperature_c && (stats.avg_temperature_c < 18 || stats.avg_temperature_c > 32) ? "Periksa Suhu" : "Stabil"}
                    </span>
                  </div>
                </div>

                {/* Stat 6: Rata-rata Kelembapan Tanah */}
                <div className="stat-card">
                  <div className="stat-header">
                    <div>
                      <div className="stat-label">Kelembapan Tanah Rata-rata</div>
                      <div className="stat-value">
                        {stats.avg_soil_moisture_pct !== null ? `${stats.avg_soil_moisture_pct}%` : "-"}
                      </div>
                    </div>
                    <div className="stat-icon cyan">
                      <IconDroplet size={22} />
                    </div>
                  </div>
                  <div className="stat-footer">
                    <span>Rentang ideal: 40 - 85%</span>
                    <span className="stat-trend">
                      {stats.avg_soil_moisture_pct && stats.avg_soil_moisture_pct < 40 ? "Kering" : "Optimal"}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Quick Actions Shortcuts */}
            <div className="card-header" style={{ marginTop: "14px" }}>
              <div className="card-title">Akses Cepat Modul</div>
            </div>
            <div className="quick-grid">
              <Link href="/plants" className="quick-card">
                <div className="quick-icon" style={{ background: "#ecfdf5", color: "#059669" }}>
                  <IconPlant size={22} />
                </div>
                <div className="quick-details">
                  <h4>Manajemen Tanaman &amp; Foto</h4>
                  <p>Unggah foto daun cabai dan pantau riwayat visual</p>
                </div>
              </Link>

              <Link href="/sensors" className="quick-card">
                <div className="quick-icon" style={{ background: "#f0f9ff", color: "#0284c7" }}>
                  <IconThermometer size={22} />
                </div>
                <div className="quick-details">
                  <h4>Telemetri Sensor Lingkungan</h4>
                  <p>Pantau suhu udara, kelembapan, pH tanah, dan cahaya</p>
                </div>
              </Link>

              <Link href="/alerts" className="quick-card">
                <div className="quick-icon" style={{ background: "#fef2f2", color: "#dc2626" }}>
                  <IconAlert size={22} />
                </div>
                <div className="quick-details">
                  <h4>Pusat Peringatan &amp; Anomali</h4>
                  <p>Deteksi dini indikasi penyakit daun dan stres air</p>
                </div>
              </Link>

              <Link href="/chat" className="quick-card">
                <div className="quick-icon" style={{ background: "#f5f3ff", color: "#7c3aed" }}>
                  <IconChat size={22} />
                </div>
                <div className="quick-details">
                  <h4>Asisten Konsultasi Agronomi</h4>
                  <p>Konsultasi diagnosis hama, pupuk, dan perawatan budidaya</p>
                </div>
              </Link>
            </div>

            {/* Model Architecture & Operational Status Card */}
            <div className="card">
              <div className="card-header">
                <div>
                  <div className="card-title">Status Modul Kecerdasan Buatan &amp; Telemetri</div>
                  <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "2px" }}>
                    Layanan inferensi visual, peramalan deret waktu, dan deteksi anomali
                  </p>
                </div>
                <span className="badge badge-success">Operasional Siap Pakai</span>
              </div>
              <div className="detection-grid" style={{ marginTop: 0 }}>
                <div className="detection-chip">
                  <div className="detection-chip-title">Deteksi Kesehatan Daun</div>
                  <div className="detection-chip-value">MobileNetV3 Multi-Head</div>
                  <div className="detection-chip-conf">Klasifikasi: Sehat, Kuning, Keriting, Bercak Daun</div>
                </div>
                <div className="detection-chip">
                  <div className="detection-chip-title">Deteksi Tahap Buah &amp; Bunga</div>
                  <div className="detection-chip-value">Visual Feature Extractor</div>
                  <div className="detection-chip-conf">Fase: Vegetatif, Pembungaan, Buah Hijau, Buah Merah</div>
                </div>
                <div className="detection-chip">
                  <div className="detection-chip-title">Evaluasi Kondisi Fisiologis</div>
                  <div className="detection-chip-value">Multi-Task Classifier</div>
                  <div className="detection-chip-conf">Diagnosa: Sehat, Stres Air, Defisiensi, Hama Penyakit</div>
                </div>
                <div className="detection-chip">
                  <div className="detection-chip-title">Peramalan Pertumbuhan (LSTM)</div>
                  <div className="detection-chip-value">Recurrent Neural Network</div>
                  <div className="detection-chip-conf">Proyeksi Rolling 14 Hari (Tinggi, Daun, Buah)</div>
                </div>
              </div>
            </div>

            {/* Recent Plants Preview */}
            {plants.length > 0 && (
              <div className="card">
                <div className="card-header">
                  <div className="card-title">Tanaman Terdaftar</div>
                  <Link href="/plants" style={{ fontSize: "12.5px", color: "var(--primary-600)", fontWeight: 700, textDecoration: "none" }}>
                    Kelola Semua Tanaman &rarr;
                  </Link>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "14px" }}>
                  {plants.slice(0, 3).map((p) => (
                    <Link
                      key={p.id}
                      href={`/plants/${p.id}`}
                      style={{
                        textDecoration: "none",
                        color: "inherit",
                        display: "block",
                        padding: "16px",
                        borderRadius: "var(--radius-lg)",
                        border: "1px solid var(--border-light)",
                        background: "#fafafa",
                        transition: "all 0.2s ease",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                        <div style={{ fontSize: "15px", fontWeight: 700, color: "var(--text-primary)" }}>
                          {p.name}
                        </div>
                        <span className="badge badge-purple" style={{ fontSize: "11px" }}>
                          {p.variety || "Umum"}
                        </span>
                      </div>
                      <div style={{ fontSize: "12.5px", color: "var(--text-secondary)", marginBottom: "4px" }}>
                        Lokasi: {p.location || "Belum Ditentukan"}
                      </div>
                      <div style={{ fontSize: "11.5px", color: "var(--text-muted)" }}>
                        Ditanam: {new Date(p.planted_at).toLocaleDateString("id-ID", { dateStyle: "medium" })}
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : null}
      </main>
    </div>
  );
}
