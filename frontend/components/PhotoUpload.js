import { useState, useRef } from "react";
import { uploadPhoto } from "../lib/api";
import { IconCamera, IconUpload, IconCheck } from "./Icons";

export default function PhotoUpload({ plantId, onResult }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setSuccessMsg("");
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result);
      };
      reader.readAsDataURL(selectedFile);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    setSuccessMsg("");
    try {
      const res = await uploadPhoto(plantId, file);
      setSuccessMsg("Foto berhasil dianalisis oleh model CNN Multi-Head.");
      onResult && onResult(res.data);
    } catch (e) {
      alert("Gagal upload foto: " + (e.response?.data?.detail || e.message));
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setFile(null);
    setPreview(null);
    setSuccessMsg("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="card">
      <div className="card-header">
        <div>
          <div className="card-title">Analisis Visual dan Unggah Foto</div>
          <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "2px" }}>
            Unggah foto cabai terkini untuk dideteksi oleh CNN multi-head (daun, buah, kondisi kesehatan)
          </p>
        </div>
        <span className="badge badge-success">CNN MobileNetV3</span>
      </div>

      <div style={{
        border: "2px dashed var(--border-light)",
        borderRadius: "var(--radius-lg)",
        padding: "24px",
        textAlign: "center",
        backgroundColor: preview ? "#f8fafc" : "#fafafa",
        transition: "all 0.2s ease",
      }}>
        {preview ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "12px" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={preview}
              alt="Preview Tanaman"
              style={{
                maxWidth: "260px",
                maxHeight: "180px",
                borderRadius: "var(--radius-md)",
                objectFit: "cover",
                boxShadow: "var(--shadow-md)",
              }}
            />
            <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-secondary)" }}>
              {file?.name} ({(file?.size / 1024).toFixed(1)} KB)
            </div>
          </div>
        ) : (
          <div style={{ cursor: "pointer" }} onClick={() => fileInputRef.current?.click()}>
            <div style={{ color: "var(--text-muted)", display: "flex", justifyContent: "center", marginBottom: "8px" }}>
              <IconCamera size={38} />
            </div>
            <p style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-primary)", marginBottom: "4px" }}>
              Pilih foto atau ambil gambar kamera tanaman
            </p>
            <p style={{ fontSize: "12px", color: "var(--text-muted)" }}>
              Mendukung format JPG, PNG, WEBP hingga 10MB
            </p>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          style={{ display: "none" }}
        />

        <div style={{ display: "flex", justifyContent: "center", gap: "10px", marginTop: "16px" }}>
          {!preview ? (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="btn-outline"
              style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
            >
              <IconUpload size={14} />
              <span>Pilih File Foto</span>
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={handleUpload}
                disabled={loading}
                style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
              >
                <IconCheck size={14} />
                <span>{loading ? "Sedang Menganalisis..." : "Jalankan Deteksi CNN"}</span>
              </button>
              <button
                type="button"
                onClick={handleClear}
                className="btn-outline"
                disabled={loading}
              >
                Ganti Foto
              </button>
            </>
          )}
        </div>

        {successMsg && (
          <div style={{
            marginTop: "12px",
            fontSize: "12.5px",
            fontWeight: 600,
            color: "var(--primary-700)",
            background: "var(--primary-50)",
            padding: "8px 14px",
            borderRadius: "var(--radius-md)",
            display: "inline-block",
          }}>
            {successMsg}
          </div>
        )}
      </div>
    </div>
  );
}
