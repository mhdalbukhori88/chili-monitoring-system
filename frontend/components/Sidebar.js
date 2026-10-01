import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { useAuth } from "../lib/useAuth";
import { updateProfile, changePassword, getAllAlerts } from "../lib/api";
import {
  IconDashboard,
  IconPlant,
  IconThermometer,
  IconAlert,
  IconChat,
  IconLogout,
  IconLogo,
  IconSettings,
  IconClose,
  IconCheck,
} from "./Icons";

export default function Sidebar() {
  const router = useRouter();
  const { user, setUser, logout } = useAuth();
  const [unresolvedAlerts, setUnresolvedAlerts] = useState(0);

  // Settings Modal State
  const [showSettings, setShowSettings] = useState(false);
  const [activeTab, setActiveTab] = useState("profile"); // profile | password
  const [fullName, setFullName] = useState("");
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMsg, setProfileMsg] = useState("");
  const [profileErr, setProfileErr] = useState("");

  // Change Password State
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwdSaving, setPwdSaving] = useState(false);
  const [pwdMsg, setPwdMsg] = useState("");
  const [pwdErr, setPwdErr] = useState("");

  useEffect(() => {
    if (user?.full_name) setFullName(user.full_name);
    getAllAlerts(true)
      .then((res) => setUnresolvedAlerts(res.data.length))
      .catch(() => {});
  }, [user]);

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setProfileSaving(true);
    setProfileMsg("");
    setProfileErr("");
    try {
      const res = await updateProfile({ full_name: fullName.trim() });
      setUser(res.data);
      setProfileMsg("Profil berhasil diperbarui!");
    } catch (err) {
      setProfileErr(err.response?.data?.detail || "Gagal memperbarui profil.");
    } finally {
      setProfileSaving(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setPwdErr("Konfirmasi kata sandi baru tidak cocok.");
      return;
    }
    setPwdSaving(true);
    setPwdMsg("");
    setPwdErr("");
    try {
      await changePassword({ old_password: oldPassword, new_password: newPassword });
      setPwdMsg("Kata sandi berhasil diubah!");
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setPwdErr(err.response?.data?.detail || "Gagal mengubah kata sandi.");
    } finally {
      setPwdSaving(false);
    }
  };

  const navItems = [
    { href: "/dashboard", label: "Dashboard", icon: <IconDashboard size={18} /> },
    { href: "/plants", label: "Tanaman Cabai", icon: <IconPlant size={18} /> },
    { href: "/sensors", label: "Telemetri IoT", icon: <IconThermometer size={18} /> },
    {
      href: "/alerts",
      label: "Peringatan Anomali",
      icon: <IconAlert size={18} />,
      badge: unresolvedAlerts > 0 ? unresolvedAlerts : null,
    },
    { href: "/chat", label: "Asisten Agronomi", icon: <IconChat size={18} /> },
  ];

  const displayName = user?.full_name || user?.username || "Pengguna";
  const initials = (displayName || "P")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <>
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="sidebar-brand-icon">
            <IconLogo size={22} />
          </div>
          <div className="sidebar-brand-info">
            <h3>Chili Monitor</h3>
            <p>Smart AgTech Platform</p>
          </div>
        </div>

        <nav className="sidebar-nav">
          <div className="sidebar-section-title">Navigasi Utama</div>
          {navItems.map((item) => {
            const isActive =
              router.pathname === item.href ||
              (item.href !== "/dashboard" && router.pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={isActive ? "active" : ""}
                style={{ justifyContent: "space-between" }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <span style={{ display: "inline-flex", alignItems: "center" }}>{item.icon}</span>
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span
                    style={{
                      background: "#ef4444",
                      color: "white",
                      fontSize: "11px",
                      fontWeight: 700,
                      padding: "2px 7px",
                      borderRadius: "12px",
                      boxShadow: "0 0 8px rgba(239, 68, 68, 0.5)",
                    }}
                  >
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <div
            className="sidebar-user"
            style={{ cursor: "pointer" }}
            onClick={() => setShowSettings(true)}
            title="Klik untuk membuka pengaturan akun"
          >
            <div className="sidebar-user-avatar">{initials}</div>
            <div className="sidebar-user-details">
              <div className="sidebar-user-name" title={displayName}>
                {displayName}
              </div>
              <div className="sidebar-user-status">
                <span className="status-dot"></span>
                <span>@{user?.username || "petani"}</span>
              </div>
            </div>
            <span style={{ color: "#94a3b8", display: "flex", alignItems: "center" }}>
              <IconSettings size={15} />
            </span>
          </div>
          <button onClick={logout} className="sidebar-logout-btn" title="Keluar dari akun">
            <IconLogout size={16} />
            <span>Keluar</span>
          </button>
        </div>
      </aside>

      {/* Settings & Profile Modal */}
      {showSettings && (
        <div
          style={{
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
          }}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: "var(--radius-xl)",
              width: "100%",
              maxWidth: "480px",
              padding: "28px",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.35)",
              border: "1px solid var(--border-light)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <div>
                <h3 style={{ fontSize: "18px", fontWeight: 800, color: "var(--text-primary)" }}>
                  Pengaturan Akun Petani
                </h3>
                <p style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                  Kelola identitas profil dan keamanan akun Anda
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowSettings(false)}
                style={{ background: "transparent", color: "var(--text-muted)", fontSize: "18px", padding: "4px 8px", boxShadow: "none" }}
              >
                <IconClose size={18} />
              </button>
            </div>

            {/* Sub Tabs */}
            <div style={{ display: "flex", borderBottom: "1px solid var(--border-light)", marginBottom: "18px" }}>
              <button
                type="button"
                onClick={() => { setActiveTab("profile"); setProfileMsg(""); setProfileErr(""); }}
                style={{
                  background: "transparent",
                  boxShadow: "none",
                  borderRadius: 0,
                  color: activeTab === "profile" ? "var(--primary-700)" : "var(--text-secondary)",
                  borderBottom: activeTab === "profile" ? "2px solid var(--primary-600)" : "2px solid transparent",
                  padding: "8px 16px",
                  fontSize: "13px",
                  fontWeight: 600,
                }}
              >
                Profil Akun
              </button>
              <button
                type="button"
                onClick={() => { setActiveTab("password"); setPwdMsg(""); setPwdErr(""); }}
                style={{
                  background: "transparent",
                  boxShadow: "none",
                  borderRadius: 0,
                  color: activeTab === "password" ? "var(--primary-700)" : "var(--text-secondary)",
                  borderBottom: activeTab === "password" ? "2px solid var(--primary-600)" : "2px solid transparent",
                  padding: "8px 16px",
                  fontSize: "13px",
                  fontWeight: 600,
                }}
              >
                Ubah Kata Sandi
              </button>
            </div>

            {activeTab === "profile" && (
              <form onSubmit={handleUpdateProfile} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                {profileMsg && (
                  <div style={{ background: "var(--success-bg)", color: "var(--primary-700)", padding: "10px 12px", borderRadius: "var(--radius-md)", fontSize: "12.5px", fontWeight: 600, display: "flex", alignItems: "center", gap: "6px" }}>
                    <IconCheck size={16} />
                    <span>{profileMsg}</span>
                  </div>
                )}
                {profileErr && (
                  <div style={{ background: "var(--danger-bg)", color: "var(--danger)", padding: "10px 12px", borderRadius: "var(--radius-md)", fontSize: "12.5px", fontWeight: 600 }}>
                    {profileErr}
                  </div>
                )}

                <div>
                  <label style={{ display: "block", fontSize: "12.5px", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "4px" }}>
                    Username (Akun)
                  </label>
                  <input
                    type="text"
                    value={user?.username || ""}
                    disabled
                    style={{ width: "100%", background: "#f8fafc", color: "var(--text-muted)", cursor: "not-allowed" }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "12.5px", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "4px" }}>
                    Alamat Email Terdaftar
                  </label>
                  <input
                    type="email"
                    value={user?.email || ""}
                    disabled
                    style={{ width: "100%", background: "#f8fafc", color: "var(--text-muted)", cursor: "not-allowed" }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "12.5px", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "4px" }}>
                    Nama Lengkap / Nama Kebun
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: Budi Santoso (Kebun Rawit Jaya)"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    style={{ width: "100%" }}
                  />
                </div>

                <div style={{ display: "flex", gap: "10px", marginTop: "8px" }}>
                  <button type="submit" disabled={profileSaving} style={{ flex: 1 }}>
                    {profileSaving ? "Menyimpan..." : "Simpan Profil"}
                  </button>
                  <button type="button" onClick={() => setShowSettings(false)} className="btn-outline">
                    Tutup
                  </button>
                </div>
              </form>
            )}

            {activeTab === "password" && (
              <form onSubmit={handleChangePassword} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                {pwdMsg && (
                  <div style={{ background: "var(--success-bg)", color: "var(--primary-700)", padding: "10px 12px", borderRadius: "var(--radius-md)", fontSize: "12.5px", fontWeight: 600, display: "flex", alignItems: "center", gap: "6px" }}>
                    <IconCheck size={16} />
                    <span>{pwdMsg}</span>
                  </div>
                )}
                {pwdErr && (
                  <div style={{ background: "var(--danger-bg)", color: "var(--danger)", padding: "10px 12px", borderRadius: "var(--radius-md)", fontSize: "12.5px", fontWeight: 600 }}>
                    {pwdErr}
                  </div>
                )}

                <div>
                  <label style={{ display: "block", fontSize: "12.5px", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "4px" }}>
                    Kata Sandi Lama <span style={{ color: "var(--danger)" }}>*</span>
                  </label>
                  <input
                    type="password"
                    placeholder="Masukkan kata sandi saat ini"
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    style={{ width: "100%" }}
                    required
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "12.5px", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "4px" }}>
                    Kata Sandi Baru <span style={{ color: "var(--danger)" }}>*</span>
                  </label>
                  <input
                    type="password"
                    placeholder="Minimal 6 karakter"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    style={{ width: "100%" }}
                    required
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "12.5px", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "4px" }}>
                    Ulangi Kata Sandi Baru <span style={{ color: "var(--danger)" }}>*</span>
                  </label>
                  <input
                    type="password"
                    placeholder="Ketik ulang kata sandi baru"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    style={{ width: "100%" }}
                    required
                  />
                </div>

                <div style={{ display: "flex", gap: "10px", marginTop: "8px" }}>
                  <button type="submit" disabled={pwdSaving} style={{ flex: 1 }}>
                    {pwdSaving ? "Mengubah..." : "Ubah Kata Sandi"}
                  </button>
                  <button type="button" onClick={() => setShowSettings(false)} className="btn-outline">
                    Tutup
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
