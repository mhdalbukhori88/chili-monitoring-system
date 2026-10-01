import { useState, useRef, useEffect } from "react";
import Head from "next/head";
import Sidebar from "../components/Sidebar";
import { sendChatMessage, getPlants, getChatHistory, clearChatHistory } from "../lib/api";
import { IconChat, IconCpu, IconArrowRight, IconTrash, IconRefresh, IconPlant } from "../components/Icons";

const DEFAULT_GREETING = {
  role: "assistant",
  content:
    "Halo, saya asisten agronomi presisi. Anda dapat menanyakan seputar teknik budidaya, rekomendasi dosis pupuk NPK dan kalsium, penanganan penyakit daun (seperti bercak antraknosa atau keriting virus), serta parameter mikroklimat ideal tanaman cabai Anda.",
};

function FormattedContent({ text }) {
  if (!text) return null;
  // Parse lines for markdown bold and bullet points
  const lines = text.split("\n");
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
      {lines.map((line, idx) => {
        if (!line.trim()) return <div key={idx} style={{ height: "4px" }} />;
        const isBullet = line.trim().startsWith("- ") || line.trim().startsWith("* ");
        const isNumbered = /^\d+\.\s/.test(line.trim());
        const cleanLine = isBullet ? line.trim().substring(2) : line;

        // Render bold text parts
        const parts = cleanLine.split(/(\*\*.*?\*\*)/g);
        const rendered = parts.map((part, pIdx) => {
          if (part.startsWith("**") && part.endsWith("**")) {
            return (
              <strong key={pIdx} style={{ color: "var(--text-primary)", fontWeight: 700 }}>
                {part.slice(2, -2)}
              </strong>
            );
          }
          return part;
        });

        if (isBullet) {
          return (
            <div key={idx} style={{ display: "flex", alignItems: "flex-start", gap: "8px", paddingLeft: "4px" }}>
              <span style={{ color: "#059669", fontWeight: 700, fontSize: "14px" }}>•</span>
              <span style={{ flex: 1, fontSize: "13.5px", lineHeight: 1.5 }}>{rendered}</span>
            </div>
          );
        }
        if (isNumbered) {
          return (
            <div key={idx} style={{ display: "flex", alignItems: "flex-start", gap: "8px", paddingLeft: "4px" }}>
              <span style={{ color: "#059669", fontWeight: 700, fontSize: "13px" }}>{line.trim().match(/^\d+\./)[0]}</span>
              <span style={{ flex: 1, fontSize: "13.5px", lineHeight: 1.5 }}>{rendered}</span>
            </div>
          );
        }
        return (
          <p key={idx} style={{ fontSize: "13.5px", lineHeight: 1.5, margin: 0 }}>
            {rendered}
          </p>
        );
      })}
    </div>
  );
}

export default function Chat() {
  const [messages, setMessages] = useState([DEFAULT_GREETING]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [plants, setPlants] = useState([]);
  const [selectedPlantId, setSelectedPlantId] = useState("");
  const messagesEndRef = useRef(null);

  useEffect(() => {
    Promise.all([getPlants(), getChatHistory(60)])
      .then(([plantsRes, historyRes]) => {
        setPlants(plantsRes.data);
        if (historyRes.data && historyRes.data.length > 0) {
          setMessages([
            DEFAULT_GREETING,
            ...historyRes.data.map((m) => ({ role: m.role, content: m.content })),
          ]);
        }
      })
      .catch((err) => console.error("Error loading chat context:", err))
      .finally(() => setHistoryLoading(false));
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSend = async (textToSend) => {
    const text = typeof textToSend === "string" ? textToSend : input;
    if (!text.trim() || loading) return;

    const userMsg = { role: "user", content: text.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const plantId = selectedPlantId ? Number(selectedPlantId) : null;
      const res = await sendChatMessage(userMsg.content, plantId);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: res.data.reply },
      ]);
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "Mohon maaf, terjadi kendala saat memproses jawaban agronomi. Pastikan backend aktif dan parameter pertanyaan sesuai.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleClearHistory = async () => {
    if (confirm("Bersihkan seluruh riwayat percakapan Anda dengan asisten agronomi?")) {
      try {
        await clearChatHistory();
        setMessages([DEFAULT_GREETING]);
      } catch (err) {
        alert("Gagal menghapus riwayat percakapan.");
      }
    }
  };

  const quickPrompts = [
    "Berapa suhu dan kelembapan ideal cabai?",
    "Bagaimana mengatasi bercak daun antraknosa?",
    "Cara mengendalikan kutu kebul dan daun keriting?",
    "Rekomendasi nutrisi saat mulai berbunga?",
    "Aturan penyiraman saat cuaca terik?",
  ];

  const selectedPlant = plants.find((p) => p.id === Number(selectedPlantId));

  return (
    <div className="layout">
      <Head>
        <title>Konsultasi Agronomi - Chili Monitor Platform</title>
      </Head>
      <Sidebar />
      <main className="main">
        <div className="page-header">
          <div className="page-title-group">
            <h2>Asisten Konsultasi Agronomi Cabai</h2>
            <p className="page-subtitle">
              Pakar agronomi cerdas untuk diagnosis kesehatan tanaman, strategi pemupukan, dan pengendalian hama
            </p>
          </div>
          <div className="header-badges">
            <span className="badge badge-purple" style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
              <IconCpu size={14} />
              <span>Agronomy Knowledge Engine Aktif</span>
            </span>
            <button
              onClick={handleClearHistory}
              className="btn-outline"
              title="Bersihkan riwayat percakapan"
              style={{ padding: "6px 12px", fontSize: "12px", display: "inline-flex", alignItems: "center", gap: "6px" }}
            >
              <IconTrash size={13} />
              <span>Bersihkan Riwayat</span>
            </button>
          </div>
        </div>

        {/* Plant Context Selector Card */}
        <div className="card" style={{ padding: "14px 18px", marginBottom: "16px", display: "flex", alignItems: "center", gap: "14px", flexWrap: "wrap", borderLeft: "4px solid var(--primary-500)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ color: "var(--primary-600)" }}><IconPlant size={18} /></span>
            <label style={{ fontSize: "13px", fontWeight: 700, color: "var(--text-secondary)" }}>
              Fokus Konteks Tanaman:
            </label>
          </div>
          <select
            value={selectedPlantId}
            onChange={(e) => setSelectedPlantId(e.target.value)}
            style={{ fontSize: "13px", minWidth: "240px", padding: "6px 12px" }}
          >
            <option value="">-- Umum (Konsultasi Semua Tanaman) --</option>
            {plants.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.variety || "Umum"})
              </option>
            ))}
          </select>
          <span style={{ fontSize: "12px", color: "var(--text-muted)", flex: 1 }}>
            {selectedPlant ? (
              <span style={{ color: "var(--primary-700)", fontWeight: 600 }}>
                • Konteks aktif: {selectedPlant.name} ({selectedPlant.location || "Kebun"}). Asisten akan mempertimbangkan sensor dan alert tanaman ini.
              </span>
            ) : (
              "Asisten akan memberikan panduan umum agronomi dan praktik terbaik budidaya cabai."
            )}
          </span>
        </div>

        {/* Quick prompt suggestions */}
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "14px" }}>
          {quickPrompts.map((p, idx) => (
            <button
              key={idx}
              type="button"
              className="btn-outline"
              onClick={() => handleSend(p)}
              style={{
                fontSize: "12px",
                padding: "6px 12px",
                borderRadius: "var(--radius-full)",
                background: "#ffffff",
              }}
            >
              {p}
            </button>
          ))}
        </div>

        {/* Chat Window */}
        <div className="chat-window">
          <div className="chat-messages">
            {historyLoading ? (
              <div style={{ textAlign: "center", padding: "30px", color: "var(--text-muted)", fontSize: "13px" }}>
                Memuat riwayat konsultasi...
              </div>
            ) : (
              messages.map((m, i) => (
                <div
                  key={i}
                  className={`chat-bubble ${
                    m.role === "user" ? "chat-bubble-user" : "chat-bubble-assistant"
                  }`}
                >
                  {m.role === "user" ? (
                    <div style={{ whiteSpace: "pre-wrap", fontSize: "14px" }}>{m.content}</div>
                  ) : (
                    <FormattedContent text={m.content} />
                  )}
                </div>
              ))
            )}
            {loading && (
              <div className="chat-bubble chat-bubble-assistant" style={{ fontStyle: "italic", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "8px" }}>
                <span className="status-dot"></span>
                <span>Asisten agronomi sedang menganalisis dan menyusun rekomendasi...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="chat-input-bar"
          >
            <input
              type="text"
              placeholder="Tanyakan penanganan penyakit, pemupukan, atau kondisi mikroklimat tanaman cabai..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={loading}
              style={{ flex: 1 }}
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "10px 20px" }}
            >
              <span>{loading ? "Mengirim..." : "Kirim"}</span>
              <IconArrowRight size={14} />
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
