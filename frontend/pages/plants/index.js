import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import Head from "next/head";
import Sidebar from "../../components/Sidebar";
import { getPlants, createPlant, deletePlant, updatePlant } from "../../lib/api";
import {
  IconPlant,
  IconPlus,
  IconEdit,
  IconTrash,
  IconAlert,
  IconSearch,
  IconArrowRight,
  IconClose,
} from "../../components/Icons";

export default function Plants() {
  const [plants, setPlants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Create form state
  const [name, setName] = useState("");
  const [variety, setVariety] = useState("");
  const [location, setLocation] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // Edit form state
  const [editingPlant, setEditingPlant] = useState(null);
  const [editName, setEditName] = useState("");
  const [editVariety, setEditVariety] = useState("");
  const [editLocation, setEditLocation] = useState("");
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState("");

  const loadPlants = () => {
    setLoading(true);
    getPlants()
      .then((res) => setPlants(res.data))
      .catch((err) => console.error("Gagal memuat tanaman:", err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadPlants();
  }, []);

  const handleCreatePlant = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg("Nama tanaman wajib diisi.");
      return;
    }
    setSubmitting(true);
    setErrorMsg("");
    try {
      await createPlant({
        name: name.trim(),
        variety: variety.trim() || undefined,
        location: location.trim() || undefined,
      });
      setName("");
      setVariety("");
      setLocation("");
      setShowModal(false);
      loadPlants();
    } catch (err) {
      setErrorMsg("Gagal menambahkan tanaman: " + (err.response?.data?.detail || err.message));
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenEdit = (p) => {
    setEditingPlant(p);
    setEditName(p.name);
    setEditVariety(p.variety || "");
    setEditLocation(p.location || "");
    setEditError("");
  };

  const handleUpdatePlant = async (e) => {
    e.preventDefault();
    if (!editName.trim()) {
      setEditError("Nama tanaman wajib diisi.");
      return;
    }
    setEditSubmitting(true);
    setEditError("");
    try {
      await updatePlant(editingPlant.id, {
        name: editName.trim(),
        variety: editVariety.trim() || null,
        location: editLocation.trim() || null,
      });
      setEditingPlant(null);
      loadPlants();
    } catch (err) {
      setEditError("Gagal memperbarui tanaman: " + (err.response?.data?.detail || err.message));
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleDeletePlant = async (id, plantName) => {
    if (confirm(`Apakah Anda yakin ingin menghapus tanaman "${plantName}"? Seluruh foto dan telemetri terkait akan ikut terhapus.`)) {
      try {
        await deletePlant(id);
        setPlants((prev) => prev.filter((p) => p.id !== id));
      } catch (err) {
        alert("Gagal menghapus tanaman: " + (err.response?.data?.detail || err.message));
      }
    }
  };

  const filteredPlants = useMemo(() => {
    if (!searchQuery.trim()) return plants;
    const q = searchQuery.toLowerCase();
    return plants.filter((p) =>
      p.name.toLowerCase().includes(q) ||
      (p.variety && p.variety.toLowerCase().includes(q)) ||
      (p.location && p.location.toLowerCase().includes(q))
    );
  }, [plants, searchQuery]);

  return (
    <div className="layout">
      <Head>
        <title>Daftar Tanaman - Chili Monitor Platform</title>
      </Head>
      <Sidebar />
      <main className="main">
        <div className="page-header">
          <div className="page-title-group">
            <h2>Manajemen Tanaman Cabai</h2>
            <p className="page-subtitle">Daftar tanaman yang dimonitoring secara berkala via kamera dan sensor telemetri</p>
          </div>
          <div className="header-badges">
            <span className="badge badge-success">
              {plants.length} Tanaman Terdaftar
            </span>
            <button onClick={() => setShowModal(true)} style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
              <IconPlus size={16} />
              <span>Tambah Tanaman</span>
            </button>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="card" style={{ padding: "14px 20px", display: "flex", gap: "12px", alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: "240px", display: "flex", alignItems: "center", position: "relative" }}>
            <span style={{ position: "absolute", left: "12px", color: "var(--text-muted)", display: "flex", alignItems: "center" }}>
              <IconSearch size={16} />
            </span>
            <input
              type="text"
              placeholder="Cari nama tanaman, varietas, atau lokasi..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ width: "100%", paddingLeft: "36px" }}
            />
          </div>
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="btn-outline"
              style={{ padding: "8px 14px", fontSize: "12.5px" }}
            >
              Reset Filter
            </button>
          )}
          <span style={{ fontSize: "12.5px", color: "var(--text-muted)" }}>
            Menampilkan {filteredPlants.length} dari {plants.length} tanaman
          </span>
        </div>

        {/* Modal Tambah Tanaman */}
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
            zIndex: 999,
            padding: "20px",
          }}>
            <div style={{
              background: "#ffffff",
              borderRadius: "var(--radius-xl)",
              width: "100%",
              maxWidth: "460px",
              padding: "28px",
              boxShadow: "0 20px 25px -5px rgba(0,0,0,0.3)",
              border: "1px solid var(--border-light)",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px" }}>
                <h3 style={{ fontSize: "18px", fontWeight: 800, color: "var(--text-primary)" }}>
                  Tambah Tanaman Baru
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

              <form onSubmit={handleCreatePlant} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "6px" }}>
                    Nama Tanaman / Tag <span style={{ color: "var(--danger)" }}>*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: Cabai Rawit Merah #1"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
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
                    placeholder="Contoh: Rawit Hiyung, Bara, Bhaskara, Keriting..."
                    value={variety}
                    onChange={(e) => setVariety(e.target.value)}
                    style={{ width: "100%" }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "6px" }}>
                    Lokasi Penanaman
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: Greenhouse Barat - Bedengan 2, Pot Teras..."
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    style={{ width: "100%" }}
                  />
                </div>

                <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
                  <button type="submit" disabled={submitting} style={{ flex: 1 }}>
                    {submitting ? "Menyimpan Data..." : "Simpan Tanaman"}
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

        {/* Modal Edit Tanaman */}
        {editingPlant && (
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
            zIndex: 999,
            padding: "20px",
          }}>
            <div style={{
              background: "#ffffff",
              borderRadius: "var(--radius-xl)",
              width: "100%",
              maxWidth: "460px",
              padding: "28px",
              boxShadow: "0 20px 25px -5px rgba(0,0,0,0.3)",
              border: "1px solid var(--border-light)",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px" }}>
                <h3 style={{ fontSize: "18px", fontWeight: 800, color: "var(--text-primary)" }}>
                  Edit Data Tanaman
                </h3>
                <button
                  type="button"
                  onClick={() => setEditingPlant(null)}
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
                    onClick={() => setEditingPlant(null)}
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

        {/* Daftar Tanaman Cards */}
        {loading ? (
          <div className="card" style={{ textAlign: "center", padding: "50px 20px" }}>
            <p style={{ color: "var(--text-muted)" }}>Memuat daftar tanaman...</p>
          </div>
        ) : filteredPlants.length > 0 ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "20px" }}>
            {filteredPlants.map((p) => (
              <div className="card" key={p.id} style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
                    <div style={{
                      width: "46px",
                      height: "46px",
                      borderRadius: "var(--radius-lg)",
                      background: "#ecfdf5",
                      color: "#059669",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}>
                      <IconPlant size={24} />
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <button
                        onClick={() => handleOpenEdit(p)}
                        title="Edit Data Tanaman"
                        className="btn-outline"
                        style={{ padding: "5px 10px", fontSize: "12px", display: "inline-flex", alignItems: "center", gap: "4px" }}
                      >
                        <IconEdit size={13} />
                        <span>Edit</span>
                      </button>
                      <button
                        onClick={() => handleDeletePlant(p.id, p.name)}
                        title="Hapus Tanaman"
                        style={{
                          background: "#fee2e2",
                          color: "#b91c1c",
                          border: "1px solid #fca5a5",
                          fontSize: "12px",
                          cursor: "pointer",
                          padding: "5px 10px",
                          boxShadow: "none",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                        }}
                      >
                        <IconTrash size={13} />
                        <span>Hapus</span>
                      </button>
                    </div>
                  </div>

                  <h3 style={{ fontSize: "18px", fontWeight: 800, marginBottom: "8px", color: "var(--text-primary)" }}>
                    {p.name}
                  </h3>

                  <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "14px" }}>
                    <span className="badge badge-purple" style={{ fontSize: "11.5px" }}>
                      Varietas: {p.variety || "Umum"}
                    </span>
                    <span className="badge badge-info" style={{ fontSize: "11.5px" }}>
                      Lokasi: {p.location || "Kebun"}
                    </span>
                    <span className="badge badge-success" style={{ fontSize: "11.5px" }}>
                      Hari ke-{Math.floor((Date.now() - new Date(p.planted_at).getTime()) / (1000 * 60 * 60 * 24))}
                    </span>
                  </div>

                  <p style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "16px" }}>
                    Mulai Ditanam: {new Date(p.planted_at).toLocaleDateString("id-ID", { dateStyle: "long" })}
                  </p>
                </div>

                <div style={{ display: "flex", gap: "8px", marginTop: "12px" }}>
                  <Link href={`/plants/${p.id}`} style={{ flex: 1, textDecoration: "none" }}>
                    <button style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span>Buka Monitor &amp; Deteksi</span>
                      <IconArrowRight size={16} />
                    </button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : plants.length === 0 ? (
          <div className="card" style={{ textAlign: "center", padding: "48px 24px" }}>
            <div style={{ color: "#059669", display: "flex", justifyContent: "center", marginBottom: "14px" }}>
              <IconPlant size={44} />
            </div>
            <h3 style={{ fontSize: "18px", fontWeight: 700, marginBottom: "6px" }}>Belum Ada Tanaman Terdaftar</h3>
            <p style={{ fontSize: "13.5px", color: "var(--text-muted)", maxWidth: "440px", margin: "0 auto 20px auto", lineHeight: 1.5 }}>
              Mulai kelola kebun cabai Anda dengan mendaftarkan tanaman pertama. Anda dapat mengunggah foto daun, memantau telemetri mikroklimat, dan mendeteksi anomali.
            </p>
            <button onClick={() => setShowModal(true)} style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
              <IconPlus size={16} />
              <span>Tambah Tanaman Pertama Sekarang</span>
            </button>
          </div>
        ) : (
          <div className="card" style={{ textAlign: "center", padding: "40px 20px" }}>
            <p style={{ color: "var(--text-muted)" }}>Tidak ada tanaman yang cocok dengan pencarian &quot;{searchQuery}&quot;.</p>
            <button onClick={() => setSearchQuery("")} className="btn-outline" style={{ marginTop: "12px" }}>
              Reset Pencarian
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
