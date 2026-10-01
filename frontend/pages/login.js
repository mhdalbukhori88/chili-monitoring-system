import { useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import Head from "next/head";
import { login, getCurrentUser } from "../lib/api";
import { useAuth } from "../lib/useAuth";
import { IconLogo, IconAlert } from "../components/Icons";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { setUser } = useAuth();

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (!username.trim() || !password) {
      setError("Silakan masukkan username dan kata sandi Anda.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const res = await login(username.trim(), password);
      if (typeof window !== "undefined") {
        localStorage.setItem("token", res.data.access_token);
      }
      try {
        const userRes = await getCurrentUser();
        setUser(userRes.data);
      } catch (_) {}

      router.push("/dashboard");
    } catch (err) {
      const detail = err.response?.data?.detail;
      setError(
        typeof detail === "string"
          ? detail
          : "Login gagal. Periksa kembali username dan kata sandi akun Anda."
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
      padding: "24px 20px",
      position: "relative",
      overflow: "hidden",
    }}>
      <Head>
        <title>Masuk - Chili Monitor AI Platform</title>
      </Head>

      {/* Background Decorative Rings */}
      <div style={{
        position: "absolute",
        width: "600px",
        height: "600px",
        borderRadius: "50%",
        background: "radial-gradient(circle, rgba(16, 185, 129, 0.15) 0%, rgba(16, 185, 129, 0) 70%)",
        top: "5%",
        left: "25%",
        pointerEvents: "none",
      }} />

      <div style={{
        width: "100%",
        maxWidth: "420px",
        background: "#ffffff",
        borderRadius: "var(--radius-xl)",
        boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
        padding: "40px 36px",
        position: "relative",
        zIndex: 1,
        border: "1px solid rgba(255, 255, 255, 0.2)",
      }}>
        {/* Brand Header */}
        <div style={{ textAlign: "center", marginBottom: "30px" }}>
          <div style={{
            width: "58px",
            height: "58px",
            background: "linear-gradient(135deg, #059669 0%, #047857 100%)",
            borderRadius: "var(--radius-lg)",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#ffffff",
            boxShadow: "0 8px 16px rgba(5, 150, 105, 0.25)",
            marginBottom: "14px",
          }}>
            <IconLogo size={28} />
          </div>
          <h1 style={{ fontSize: "23px", fontWeight: 800, color: "var(--text-primary)", letterSpacing: "-0.02em" }}>
            Chili Monitor Platform
          </h1>
          <p style={{ fontSize: "13px", color: "var(--text-muted)", marginTop: "6px" }}>
            Sistem Pemantauan Pertumbuhan &amp; Deteksi Penyakit Daun Cabai
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div style={{
            background: "var(--danger-bg)",
            border: "1px solid var(--danger-border)",
            borderRadius: "var(--radius-md)",
            padding: "12px 14px",
            color: "var(--danger)",
            fontSize: "13px",
            fontWeight: 500,
            marginBottom: "20px",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}>
            <IconAlert size={16} />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "6px" }}>
              Username atau Email
            </label>
            <input
              type="text"
              autoComplete="username"
              placeholder="Masukkan username atau email..."
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              style={{ width: "100%" }}
              required
            />
          </div>

          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
              <label style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-secondary)" }}>
                Kata Sandi
              </label>
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  background: "transparent",
                  color: "var(--primary-600)",
                  border: "none",
                  boxShadow: "none",
                  padding: "0",
                  fontSize: "12px",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                {showPassword ? "Sembunyikan" : "Tampilkan"}
              </button>
            </div>
            <input
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              placeholder="Masukkan kata sandi..."
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{ width: "100%" }}
              required
            />
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "2px" }}>
            <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", color: "var(--text-secondary)", cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                style={{ width: "16px", height: "16px", accentColor: "var(--primary-600)" }}
              />
              Ingat sesi login
            </label>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{ width: "100%", padding: "12px", marginTop: "6px", fontSize: "15px", fontWeight: 700 }}
          >
            {loading ? "Memproses Kredensial..." : "Masuk ke Sistem"}
          </button>
        </form>

        {/* Footer Registration Link */}
        <div style={{
          marginTop: "26px",
          paddingTop: "20px",
          borderTop: "1px solid var(--border-light)",
          textAlign: "center",
          fontSize: "13.5px",
          color: "var(--text-secondary)",
        }}>
          Belum memiliki akun pengguna?{" "}
          <Link href="/register" style={{ color: "var(--primary-600)", fontWeight: 700, textDecoration: "none" }}>
            Daftar Akun Baru
          </Link>
        </div>
      </div>
    </div>
  );
}
