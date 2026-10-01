import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { getAllAlerts } from "../lib/api";
import { IconAlert, IconClose, IconBell, IconCheck } from "./Icons";

const MAX_TOASTS = 2; // At most 2 toasts simultaneously
const TOAST_DURATION = 6000; // 6 seconds auto-dismiss

export default function ToastNotification() {
  const [toasts, setToasts] = useState([]);
  const seenAlertIdsRef = useRef(new Set());
  const initialLoadDoneRef = useRef(false);

  // Helper to remove toast by id
  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Helper to add a toast with auto-dismiss and max queue enforcement
  const addToast = useCallback((toastData) => {
    const id = toastData.id || `toast-${Date.now()}-${Math.random()}`;
    const newToast = {
      ...toastData,
      id,
      createdAt: Date.now(),
    };

    setToasts((prev) => {
      // Avoid duplicate by id
      if (prev.some((t) => t.id === id)) return prev;
      // Keep only latest (MAX_TOASTS - 1) then append newToast
      const trimmed = prev.slice(-(MAX_TOASTS - 1));
      return [...trimmed, newToast];
    });

    // Auto-dismiss after TOAST_DURATION
    setTimeout(() => {
      removeToast(id);
    }, TOAST_DURATION);
  }, [removeToast]);

  // Listen to manual chili-toast events
  useEffect(() => {
    const handleCustomToast = (event) => {
      const detail = event.detail;
      if (!detail) return;

      addToast({
        id: detail.id || `custom-${Date.now()}`,
        title: detail.title || "Pemberitahuan Sistem",
        message: detail.message || "",
        severity: detail.severity || "info",
        link: detail.link || null,
        linkLabel: detail.linkLabel || null,
      });
    };

    window.addEventListener("chili-toast", handleCustomToast);
    return () => window.removeEventListener("chili-toast", handleCustomToast);
  }, [addToast]);

  // Polling for unresolved alerts
  useEffect(() => {
    const checkAlerts = async () => {
      const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
      if (!token) return;

      try {
        const res = await getAllAlerts(true);
        const activeAlerts = res.data || [];

        // On first run: if there are already existing unresolved alerts in database,
        // do NOT spam 4-5 separate toasts! Show ONE aggregated summary toast.
        if (!initialLoadDoneRef.current) {
          initialLoadDoneRef.current = true;
          activeAlerts.forEach((a) => seenAlertIdsRef.current.add(a.id));

          if (activeAlerts.length > 0) {
            const criticalCount = activeAlerts.filter((a) => a.severity === "critical").length;
            addToast({
              id: "aggregated-initial-alert",
              title: `${activeAlerts.length} Peringatan Tanaman Aktif`,
              message: criticalCount > 0 
                ? `${criticalCount} anomali kritis memerlukan tindakan segera.` 
                : "Parameter mikroklimat tanaman di luar rentang ideal.",
              severity: criticalCount > 0 ? "critical" : "warning",
              link: "/alerts",
              linkLabel: "Buka Pusat Notifikasi &rarr;",
            });
          }
          return;
        }

        // Subsequent polls: only notify about genuinely new alerts
        const newAlerts = activeAlerts.filter((a) => !seenAlertIdsRef.current.has(a.id));
        if (newAlerts.length > 0) {
          newAlerts.forEach((a) => {
            seenAlertIdsRef.current.add(a.id);
          });

          // If multiple new alerts arrive simultaneously, show a single consolidated toast
          if (newAlerts.length > 1) {
            addToast({
              id: `batch-${Date.now()}`,
              title: `${newAlerts.length} Anomali Baru Terdeteksi!`,
              message: "Mikroklimat tanaman melampaui batas toleransi.",
              severity: "critical",
              link: "/alerts",
              linkLabel: "Lihat Semua Peringatan &rarr;",
            });
          } else {
            const single = newAlerts[0];
            addToast({
              id: `alert-${single.id}`,
              title: single.severity === "critical" ? "Peringatan Kritis Tanaman!" : "Peringatan Mikroklimat",
              message: single.message,
              severity: single.severity,
              link: single.plant_id ? `/plants/${single.plant_id}` : "/alerts",
              linkLabel: "Tinjau Detail Tanaman &rarr;",
            });
          }
        }
      } catch (_) {}
    };

    checkAlerts();
    const interval = setInterval(checkAlerts, 20000);
    return () => clearInterval(interval);
  }, [addToast]);

  const removeAllToasts = () => {
    setToasts([]);
  };

  if (toasts.length === 0) return null;

  return (
    <aside aria-label="Notifikasi Sistem" className="toast-container no-print">
      {toasts.length > 1 && (
        <div className="toast-header-bar">
          <span className="toast-count-pill">
            <IconBell size={12} />
            <span>{toasts.length} notifikasi</span>
          </span>
          <button
            type="button"
            onClick={removeAllToasts}
            className="toast-dismiss-all-btn"
          >
            Tutup Semua
          </button>
        </div>
      )}

      {toasts.map((toast) => (
        <div key={toast.id} className={`toast-card ${toast.severity || "info"}`}>
          {/* Progress bar countdown line */}
          <div className="toast-progress-bar" />

          <div className="toast-icon-col">
            {toast.severity === "critical" || toast.severity === "warning" ? (
              <IconAlert size={18} />
            ) : toast.severity === "success" ? (
              <IconCheck size={18} />
            ) : (
              <IconBell size={18} />
            )}
          </div>

          <div className="toast-body-col">
            <div className="toast-title-row">
              <span className="toast-title">{toast.title}</span>
              <button
                type="button"
                onClick={() => removeToast(toast.id)}
                className="toast-close-btn"
                title="Tutup notifikasi ini"
                aria-label="Tutup notifikasi"
              >
                <IconClose size={14} />
              </button>
            </div>

            <p className="toast-message">{toast.message}</p>

            {toast.link && (
              <div className="toast-action-row">
                <Link
                  href={toast.link}
                  onClick={() => removeToast(toast.id)}
                  className="toast-action-link"
                >
                  <span dangerouslySetInnerHTML={{ __html: toast.linkLabel || "Tinjau Detail Tanaman &rarr;" }} />
                </Link>
              </div>
            )}
          </div>
        </div>
      ))}
    </aside>
  );
}

