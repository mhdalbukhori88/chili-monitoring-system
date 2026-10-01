import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import Head from "next/head";
import Sidebar from "../components/Sidebar";
import {
  getPlants,
  getAllAlerts,
  resolveAlert,
  resolveAllAlerts,
  testExternalNotification,
} from "../lib/api";
import {
  IconAlert,
  IconShield,
  IconCheck,
  IconRefresh,
  IconPlant,
  IconSearch,
  IconBell,
  IconSend,
} from "../components/Icons";

export default function Alerts() {
  const [plants, setPlants] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [resolvingId, setResolvingId] = useState(null);
  const [resolvingAll, setResolvingAll] = useState(false);
  const [statusFilter, setStatusFilter] = useState("unresolved"); // 'all' | 'unresolved' | 'resolved'
  const [severityFilter, setSeverityFilter] = useState("all"); // 'all' | 'critical' | 'warning' | 'info'
  const [selectedPlantFilter, setSelectedPlantFilter] = useState("all");

  // External Notification & Integration States
  const [extBotToken, setExtBotToken] = useState("");
  const [extChatId, setExtChatId] = useState("");
  const [extWebhookUrl, setExtWebhookUrl] = useState("");
  const [extMessage, setExtMessage] = useState(
    "⚠️ [SIMULASI] Mikroklimat Kritis: Suhu mencapai 38.5°C & Kelembaban Tanah 28% pada Tanaman Cabai Rawit #1."
  );
  const [testingNotification, setTestingNotification] = useState(false);
  const [testResult, setTestResult] = useState(null);

  const loadData = () => {
    setLoading(true);
    Promise.all([getPlants(), getAllAlerts(false)])
      .then(([plantsRes, alertsRes]) => {
        setPlants(plantsRes.data);
        setAlerts(alertsRes.data);
      })
      .catch((err) => console.error("Gagal memuat alert:", err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleResolve = async (alertId) => {
    setResolvingId(alertId);
    try {
      await resolveAlert(alertId);
      setAlerts((prev) =>
        prev.map((a) => (a.id === alertId ? { ...a, is_resolved: true } : a))
      );
    } catch (err) {
      alert("Gagal menyelesaikan alert: " + (err.response?.data?.detail || err.message));
    } finally {
      setResolvingId(null);
    }
  };

  const handleResolveAll = async () => {
    if (confirm("Tandai seluruh peringatan yang sedang aktif sebagai selesai?")) {
      setResolvingAll(true);
      try {
        await resolveAllAlerts();
        setAlerts((prev) => prev.map((a) => ({ ...a, is_resolved: true })));
      } catch (err) {
        alert("Gagal menyelesaikan peringatan.");
      } finally {
        setResolvingAll(false);
      }
    }
  };

  const handleTestExternal = async (e) => {
    if (e) e.preventDefault();
    setTestingNotification(true);
    setTestResult(null);

    try {
      const res = await testExternalNotification({
        bot_token: extBotToken.trim() || null,
        chat_id: extChatId.trim() || null,
        webhook_url: extWebhookUrl.trim() || null,
        message: extMessage.trim(),
      });

      setTestResult({
        success: res.data.telegram_sent || res.data.webhook_sent,
        data: res.data,
      });

      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("chili-toast", {
            detail: {
              id: Date.now(),
              title:
                res.data.telegram_sent || res.data.webhook_sent
                  ? "Uji Notifikasi Eksternal Terkirim!"
                  : "Status Uji Notifikasi",
              message: res.data.message,
              severity:
                res.data.telegram_sent || res.data.webhook_sent ? "info" : "warning",
              source: "external_test",
            },
          })
        );
      }
    } catch (err) {
      const errMsg =
        err.response?.data?.detail || err.message || "Gagal mengirim uji notifikasi eksternal";
      setTestResult({
        success: false,
        error: errMsg,
      });

      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("chili-toast", {
            detail: {
              id: Date.now(),
              title: "Gagal Mengirim Notifikasi Eksternal",
              message: errMsg,
              severity: "critical",
              source: "system",
            },
          })
        );
      }
    } finally {
      setTestingNotification(false);
    }
  };

  const handleSimulateToast = () => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("chili-toast", {
          detail: {
            id: Date.now(),
            title: "Peringatan Mikroklimat Kritis! (Simulasi Toast)",
            message:
              "Suhu 38.5°C melampaui batas aman maksimal (35°C) pada Tanaman Cabai Rawit #1.",
            severity: "critical",
            source: "sensor",
          },
        })
      );
    }
  };

  // Create plant map for quick lookup
  const plantMap = useMemo(() => {
    const map = {};
    for (const p of plants) {
      map[p.id] = p;
    }
    return map;
  }, [plants]);

  const filteredAlerts = useMemo(() => {
    return alerts.filter((a) => {
      if (statusFilter === "unresolved" && a.is_resolved) return false;
      if (statusFilter === "resolved" && !a.is_resolved) return false;
      if (severityFilter !== "all" && a.severity !== severityFilter) return false;
      if (selectedPlantFilter !== "all" && a.plant_id !== Number(selectedPlantFilter)) return false;
      return true;
    });
  }, [alerts, statusFilter, severityFilter, selectedPlantFilter]);

  const unresolvedCount = alerts.filter((a) => !a.is_resolved).length;
  const criticalCount = alerts.filter((a) => !a.is_resolved && a.severity === "critical").length;

  return (
    <div className="layout">
      <Head>
        <title>Pusat Notifikasi &amp; Anomali - Chili Monitor Platform</title>
      </Head>
      <Sidebar />
      <main className="main">
        <div className="page-header">
          <div className="page-title-group">
            <h2>Pusat Notifikasi dan Anomali Tanaman</h2>
            <p className="page-subtitle">
              Peringatan otomatis saat mikroklimat melampaui batas toleransi atau model CNN mendeteksi kelainan fisiologis
            </p>
          </div>
          <div className="header-badges">
            <span className={`badge ${unresolvedCount > 0 ? "badge-danger" : "badge-success"}`}>
              {unresolvedCount > 0 ? `${unresolvedCount} Peringatan Aktif` : "Kondisi Aman"}
            </span>
            {criticalCount > 0 && (
              <span className="badge badge-danger">
                {criticalCount} Kritis
              </span>
            )}
            {unresolvedCount > 0 && (
              <button
                onClick={handleResolveAll}
                disabled={resolvingAll}
                style={{ padding: "6px 14px", fontSize: "12px", display: "inline-flex", alignItems: "center", gap: "6px" }}
              >
                <IconCheck size={14} />
                <span>{resolvingAll ? "Menyelesaikan..." : "Selesaikan Semua"}</span>
              </button>
            )}
            <button
              onClick={loadData}
              className="btn-outline"
              style={{ padding: "6px 12px", fontSize: "12px", display: "inline-flex", alignItems: "center", gap: "6px" }}
            >
              <IconRefresh size={13} />
              <span>Segarkan</span>
            </button>
          </div>
        </div>

        {/* Filter Controls Card */}
        <div className="card" style={{ padding: "14px 20px", marginBottom: "20px", display: "flex", gap: "14px", alignItems: "center", flexWrap: "wrap" }}>
          {/* Status Tabs */}
          <div style={{ display: "flex", background: "#f1f5f9", padding: "3px", borderRadius: "var(--radius-md)" }}>
            <button
              type="button"
              onClick={() => setStatusFilter("unresolved")}
              style={{
                background: statusFilter === "unresolved" ? "#ffffff" : "transparent",
                color: statusFilter === "unresolved" ? "var(--primary-700)" : "var(--text-secondary)",
                boxShadow: statusFilter === "unresolved" ? "var(--shadow-xs)" : "none",
                padding: "6px 12px",
                fontSize: "12px",
                borderRadius: "var(--radius-sm)",
                fontWeight: 600,
              }}
            >
              Belum Selesai ({unresolvedCount})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("all")}
              style={{
                background: statusFilter === "all" ? "#ffffff" : "transparent",
                color: statusFilter === "all" ? "var(--primary-700)" : "var(--text-secondary)",
                boxShadow: statusFilter === "all" ? "var(--shadow-xs)" : "none",
                padding: "6px 12px",
                fontSize: "12px",
                borderRadius: "var(--radius-sm)",
                fontWeight: 600,
              }}
            >
              Semua ({alerts.length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("resolved")}
              style={{
                background: statusFilter === "resolved" ? "#ffffff" : "transparent",
                color: statusFilter === "resolved" ? "var(--primary-700)" : "var(--text-secondary)",
                boxShadow: statusFilter === "resolved" ? "var(--shadow-xs)" : "none",
                padding: "6px 12px",
                fontSize: "12px",
                borderRadius: "var(--radius-sm)",
                fontWeight: 600,
              }}
            >
              Riwayat Selesai ({alerts.length - unresolvedCount})
            </button>
          </div>

          {/* Plant Filter */}
          {plants.length > 0 && (
            <select
              value={selectedPlantFilter}
              onChange={(e) => setSelectedPlantFilter(e.target.value)}
              style={{ fontSize: "12.5px", padding: "6px 12px" }}
            >
              <option value="all">Semua Tanaman</option>
              {plants.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          )}

          {/* Severity Filter */}
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            style={{ fontSize: "12.5px", padding: "6px 12px" }}
          >
            <option value="all">Semua Tingkat Keparahan</option>
            <option value="critical">Hanya Kritis (Critical)</option>
            <option value="warning">Peringatan (Warning)</option>
            <option value="info">Informasi (Info)</option>
          </select>

          <span style={{ fontSize: "12px", color: "var(--text-muted)", marginLeft: "auto" }}>
            Menampilkan {filteredAlerts.length} dari {alerts.length} notifikasi
          </span>
        </div>

        {/* Content Area */}
        {loading ? (
          <div className="card" style={{ textAlign: "center", padding: "50px 20px" }}>
            <p style={{ color: "var(--text-muted)" }}>Memeriksa riwayat peringatan dan anomali...</p>
          </div>
        ) : filteredAlerts.length === 0 ? (
          <div className="card" style={{ textAlign: "center", padding: "48px 24px" }}>
            <div style={{ color: "var(--primary-600)", display: "flex", justifyContent: "center", marginBottom: "14px" }}>
              <IconShield size={44} />
            </div>
            <h3 style={{ fontSize: "18px", fontWeight: 700, marginBottom: "6px" }}>
              {statusFilter === "unresolved" ? "Semua Tanaman Dalam Kondisi Aman" : "Tidak Ada Notifikasi"}
            </h3>
            <p style={{ fontSize: "13.5px", color: "var(--text-muted)", maxWidth: "460px", margin: "0 auto" }}>
              {statusFilter === "unresolved"
                ? "Tidak ada anomali mikroklimat atau peringatan penyakit daun yang belum diselesaikan pada kriteria filter saat ini."
                : "Tidak ditemukan catatan peringatan yang sesuai dengan filter yang Anda tentukan."}
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {filteredAlerts.map((a) => {
              const plant = plantMap[a.plant_id];
              const isCritical = a.severity === "critical";
              const isResolving = resolvingId === a.id;

              return (
                <div
                  key={a.id}
                  className={`card ${isCritical ? "alert-critical" : "alert-warning"}`}
                  style={{
                    padding: "16px 20px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: "14px",
                    opacity: a.is_resolved ? 0.75 : 1,
                  }}
                >
                  <div style={{ display: "flex", gap: "14px", alignItems: "flex-start", flex: 1, minWidth: "280px" }}>
                    <div style={{ marginTop: "2px", color: isCritical ? "var(--danger)" : "var(--warning)" }}>
                      <IconAlert size={22} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px", flexWrap: "wrap" }}>
                        <span className={`badge ${isCritical ? "badge-danger" : "badge-warning"}`} style={{ fontSize: "11px" }}>
                          {a.severity.toUpperCase()}
                        </span>
                        <span className="badge badge-info" style={{ fontSize: "11px" }}>
                          Sumber: {a.source === "sensor" ? "Sensor Telemetri" : "Deteksi Visual CNN"}
                        </span>
                        {plant && (
                          <Link href={`/plants/${plant.id}`} style={{ textDecoration: "none" }}>
                            <span className="badge badge-purple" style={{ fontSize: "11px", cursor: "pointer" }}>
                              Tanaman: {plant.name}
                            </span>
                          </Link>
                        )}
                        {a.is_resolved && (
                          <span className="badge badge-success" style={{ fontSize: "11px" }}>
                            ✓ Telah Diselesaikan
                          </span>
                        )}
                      </div>

                      <div style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-primary)", marginBottom: "4px" }}>
                        {a.message}
                      </div>

                      <div style={{ fontSize: "11.5px", color: "var(--text-muted)" }}>
                        Waktu Deteksi: {new Date(a.created_at).toLocaleString("id-ID", {
                          dateStyle: "long",
                          timeStyle: "short",
                        })}
                      </div>
                    </div>
                  </div>

                  {!a.is_resolved ? (
                    <button
                      onClick={() => handleResolve(a.id)}
                      disabled={isResolving}
                      style={{
                        fontSize: "12.5px",
                        padding: "8px 16px",
                        borderRadius: "var(--radius-md)",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                      }}
                    >
                      <IconCheck size={14} />
                      <span>{isResolving ? "Menyelesaikan..." : "Tandai Selesai"}</span>
                    </button>
                  ) : (
                    <span style={{ fontSize: "12px", color: "var(--primary-700)", fontWeight: 600 }}>
                      Selesai
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* External Notification & Dispatcher Hub Card */}
        <div
          className="card"
          style={{
            marginTop: "32px",
            padding: "24px 28px",
            border: "1px solid var(--border-color)",
            background: "linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              flexWrap: "wrap",
              gap: "14px",
              marginBottom: "18px",
            }}
          >
            <div>
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  color: "var(--primary-700)",
                  fontWeight: 700,
                  fontSize: "16px",
                  marginBottom: "4px",
                }}
              >
                <IconBell size={20} />
                <span>Integrasi Notifikasi Eksternal (Telegram Bot &amp; Webhook)</span>
              </div>
              <p
                style={{
                  fontSize: "13px",
                  color: "var(--text-secondary)",
                  margin: 0,
                  maxWidth: "680px",
                }}
              >
                Hubungkan kanal eksternal untuk menerima sinyal anomali seketika saat sensor mikroklimat atau sistem CNN mendeteksi kondisi gawat darurat pada tanaman cabai.
              </p>
            </div>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              <span className="badge badge-purple" style={{ fontSize: "11px" }}>
                Auto-Broadcast Telemetri
              </span>
              <span className="badge badge-info" style={{ fontSize: "11px" }}>
                Telegram Bot API
              </span>
              <span className="badge badge-warning" style={{ fontSize: "11px" }}>
                Webhook / Discord / Slack
              </span>
            </div>
          </div>

          <form onSubmit={handleTestExternal}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                gap: "16px",
                marginBottom: "18px",
              }}
            >
              {/* Telegram Section */}
              <div
                style={{
                  background: "#ffffff",
                  padding: "16px",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--border-color)",
                }}
              >
                <h4
                  style={{
                    fontSize: "13.5px",
                    fontWeight: 700,
                    marginBottom: "12px",
                    color: "var(--text-primary)",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  <span>✈️</span> Konfigurasi Telegram Bot
                </h4>
                <div style={{ marginBottom: "10px" }}>
                  <label
                    style={{
                      display: "block",
                      fontSize: "11.5px",
                      fontWeight: 600,
                      color: "var(--text-secondary)",
                      marginBottom: "4px",
                    }}
                  >
                    Bot Token (Opsional jika sudah di-set di .env backend)
                  </label>
                  <input
                    type="password"
                    placeholder="Contoh: 123456789:ABCdefGhIJKlmNoPQRstuv..."
                    value={extBotToken}
                    onChange={(e) => setExtBotToken(e.target.value)}
                    style={{ width: "100%", fontSize: "12px", padding: "8px 10px" }}
                  />
                </div>
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "11.5px",
                      fontWeight: 600,
                      color: "var(--text-secondary)",
                      marginBottom: "4px",
                    }}
                  >
                    Chat ID / Group ID Penerima
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: -100123456789 atau ID Akun Telegram"
                    value={extChatId}
                    onChange={(e) => setExtChatId(e.target.value)}
                    style={{ width: "100%", fontSize: "12px", padding: "8px 10px" }}
                  />
                </div>
              </div>

              {/* Webhook Section */}
              <div
                style={{
                  background: "#ffffff",
                  padding: "16px",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--border-color)",
                }}
              >
                <h4
                  style={{
                    fontSize: "13.5px",
                    fontWeight: 700,
                    marginBottom: "12px",
                    color: "var(--text-primary)",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  <span>🔗</span> HTTP Webhook Endpoint
                </h4>
                <div style={{ marginBottom: "10px" }}>
                  <label
                    style={{
                      display: "block",
                      fontSize: "11.5px",
                      fontWeight: 600,
                      color: "var(--text-secondary)",
                      marginBottom: "4px",
                    }}
                  >
                    Webhook URL (Discord / Slack / Endpoint Server)
                  </label>
                  <input
                    type="url"
                    placeholder="https://discord.com/api/webhooks/... atau https://hooks.slack.com/..."
                    value={extWebhookUrl}
                    onChange={(e) => setExtWebhookUrl(e.target.value)}
                    style={{ width: "100%", fontSize: "12px", padding: "8px 10px" }}
                  />
                </div>
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "11.5px",
                      fontWeight: 600,
                      color: "var(--text-secondary)",
                      marginBottom: "4px",
                    }}
                  >
                    Pesan Simulasi Notifikasi
                  </label>
                  <input
                    type="text"
                    value={extMessage}
                    onChange={(e) => setExtMessage(e.target.value)}
                    style={{ width: "100%", fontSize: "12px", padding: "8px 10px" }}
                  />
                </div>
              </div>
            </div>

            {/* Test result feedback banner */}
            {testResult && (
              <div
                style={{
                  marginBottom: "16px",
                  padding: "12px 16px",
                  borderRadius: "var(--radius-md)",
                  background: testResult.success ? "#f0fdf4" : "#fef2f2",
                  border: `1px solid ${testResult.success ? "#bbf7d0" : "#fecaca"}`,
                  fontSize: "12.5px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    marginBottom: "6px",
                  }}
                >
                  <span
                    className={`badge ${testResult.success ? "badge-success" : "badge-danger"}`}
                    style={{ fontSize: "11px" }}
                  >
                    {testResult.success ? "Berhasil Dikirim" : "Belum Berhasil"}
                  </span>
                  <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>
                    {testResult.data?.message || testResult.error}
                  </span>
                </div>
                {testResult.data && (
                  <div
                    style={{
                      display: "flex",
                      gap: "12px",
                      fontSize: "11.5px",
                      color: "var(--text-secondary)",
                      marginTop: "4px",
                    }}
                  >
                    <span>
                      Telegram:{" "}
                      <strong>
                        {testResult.data.telegram_sent ? "✓ Terkirim" : "— Dilewati / Tidak aktif"}
                      </strong>
                    </span>
                    <span>•</span>
                    <span>
                      Webhook:{" "}
                      <strong>
                        {testResult.data.webhook_sent ? "✓ Terkirim" : "— Dilewati / Tidak aktif"}
                      </strong>
                    </span>
                  </div>
                )}
              </div>
            )}

            <div
              style={{
                display: "flex",
                gap: "10px",
                flexWrap: "wrap",
                alignItems: "center",
              }}
            >
              <button
                type="submit"
                disabled={testingNotification}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "7px",
                  fontSize: "12.5px",
                  padding: "8px 18px",
                }}
              >
                <IconSend size={15} />
                <span>
                  {testingNotification
                    ? "Mengirimkan Sinyal Uji Coba..."
                    : "Kirim Uji Coba Notifikasi Eksternal"}
                </span>
              </button>

              <button
                type="button"
                onClick={handleSimulateToast}
                className="btn-outline"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "7px",
                  fontSize: "12.5px",
                  padding: "8px 16px",
                }}
              >
                <IconBell size={15} />
                <span>Simulasikan Toast Alert di Layar</span>
              </button>

              <span
                style={{
                  fontSize: "11.5px",
                  color: "var(--text-muted)",
                  marginLeft: "auto",
                }}
              >
                *Notifikasi di sistem otomatis terpicu bila pembacaan sensor berada di luar rentang aman mikroklimat.
              </span>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
