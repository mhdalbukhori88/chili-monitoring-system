import { useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import Head from "next/head";
import { register, login, getCurrentUser } from "../lib/api";
import { useAuth } from "../lib/useAuth";
import { IconPlant, IconAlert } from "../components/Icons";

export default function Register() {
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { setUser } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !email.trim() || !password) {
      setError("Semua bidang wajib diisi.");
      return;
    }
    setError("");
    setLoading(true);

    try {
      // 1. Registrasi akun baru
      await register({
        username: username.trim(),
        email: email.trim(),
        password,
        full_name: fullName.trim() || username.trim(),
      });

      // 2. Otomatis login dan simpan token
      const res = await login(username.trim(), password);
      if (typeof window !== "undefined") {
        localStorage.setItem("token", res.data.access_token);
      }
      try {
        const u = await getCurrentUser();
        setUser(u.data);
      } catch (_) {}
      router.push("/dashboard");
    } catch (err) {
      const detail = err.response?.data?.detail;
      setError(
        typeof detail === "string"
          ? detail
          : "Pendaftaran gagal. Pastikan username dan email belum terdaftar."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "radial-gradient(circle at 50% 20%, #064e3b 0%, #022c22 60%, #011710 100%)",
      padding: "20px",
      position: "relative",
      overflow: "hidden",
    }}>
      <Head>
        <title>Daftar Akun Baru - Chili Monitor AI</title>
      </Head>
      {/* Decorative Glow */}
      <div style={{
        position: "absolute",
        width: "500px",
        height: "500px",
        borderRadius: "50%",
        background: "radial-gradient(circle, rgba(16, 185, 129, 0.12) 0%, rgba(16, 185, 129, 0) 70%)",
        top: "10%",
        left: "20%",
        pointerEvents: "none",
      }} />

      <div style={{
        width: "100%",
        maxWidth: "440px",
        background: "#ffffff",
        borderRadius: "var(--radius-xl)",
        boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.45)",
        padding: "36px 32px",
        position: "relative",
        zIndex: 1,
        border: "1px solid rgba(255, 255, 255, 0.2)",
      }}>
        {/* Brand Header */}
        <div style={{ textAlign: "center", marginBottom: "24px" }}>
          <div style={{
            width: "56px",
            height: "56px",
            background: "linear-gradient(135deg, #059669 0%, #047857 100%)",
            borderRadius: "var(--radius-lg)",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#ffffff",
            boxShadow: "0 8px 16px rgba(5, 150, 105, 0.25)",
            marginBottom: "14px",
          }}>
            <IconPlant size={28} />
          </div>
          <h2 style={{ fontSize: "22px", fontWeight: 800, color: "var(--text-primary)", letterSpacing: "-0.02em" }}>
            Daftar Akun Baru
          </h2>
          <p style={{ fontSize: "13px", color: "var(--text-muted)", marginTop: "4px" }}>
            Platform Pemantauan dan Analisis Tanaman Cabai
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div style={{
            background: "var(--danger-bg)",
            border: "1px solid var(--danger-border)",
            borderRadius: "var(--radius-md)",
            padding: "10px 14px",
            color: "var(--danger)",
            fontSize: "12.5px",
            fontWeight: 500,
            marginBottom: "18px",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}>
            <IconAlert size={16} />
            <span>{error}</span>
          </div>
        )}

        {/* Registration Form */}
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "6px" }}>
              Nama Lengkap
            </label>
            <input
              type="text"
              placeholder="Contoh: Budi Santoso"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              style={{ width: "100%" }}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "6px" }}>
              Username <span style={{ color: "var(--danger)" }}>*</span>
            </label>
            <input
              type="text"
              placeholder="Pilih username unik..."
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              style={{ width: "100%" }}
              required
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "6px" }}>
              Alamat Email <span style={{ color: "var(--danger)" }}>*</span>
            </label>
            <input
              type="email"
              placeholder="nama@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{ width: "100%" }}
              required
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "6px" }}>
              Password <span style={{ color: "var(--danger)" }}>*</span>
            </label>
            <input
              type="password"
              placeholder="Minimal 6 karakter..."
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{ width: "100%" }}
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{ width: "100%", padding: "12px", marginTop: "10px", fontSize: "15px" }}
          >
            {loading ? "Mendaftarkan Akun..." : "Buat Akun dan Masuk"}
          </button>
        </form>

        {/* Footer Login Link */}
        <div style={{
          marginTop: "22px",
          paddingTop: "18px",
          borderTop: "1px solid var(--border-light)",
          textAlign: "center",
          fontSize: "13px",
          color: "var(--text-secondary)",
        }}>
          Sudah memiliki akun terdaftar?{" "}
          <Link href="/login" style={{ color: "var(--primary-600)", fontWeight: 700, textDecoration: "none" }}>
            Masuk di sini
          </Link>
        </div>
      </div>
    </div>
  );
}
