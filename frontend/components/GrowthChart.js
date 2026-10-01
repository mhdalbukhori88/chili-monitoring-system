import { useEffect, useState, useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { IconTrendUp } from "./Icons";

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div style={{
        background: "rgba(15, 23, 42, 0.94)",
        color: "#ffffff",
        padding: "10px 14px",
        borderRadius: "8px",
        fontSize: "12px",
        boxShadow: "0 8px 20px rgba(0,0,0,0.25)",
        border: "1px solid rgba(255,255,255,0.1)",
      }}>
        <div style={{ fontWeight: 700, marginBottom: "6px", color: "#94a3b8" }}>
          {label}
        </div>
        {payload.map((entry, index) => {
          if (entry.value === null || entry.value === undefined) return null;
          const isPred = entry.dataKey.startsWith("pred_");
          return (
            <div key={`item-${index}`} style={{ display: "flex", justifyContent: "space-between", gap: "14px", marginBottom: "3px" }}>
              <span style={{ color: entry.color, fontWeight: 600 }}>
                {entry.name} {isPred ? "(Prediksi)" : ""}:
              </span>
              <span style={{ fontWeight: 700, fontFamily: "monospace" }}>
                {entry.value} {entry.dataKey.includes("height") ? "cm" : entry.dataKey.includes("leaf") ? "helai" : "buah"}
              </span>
            </div>
          );
        })}
      </div>
    );
  }
  return null;
};

export default function GrowthChart({ data, predictions = [] }) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const combinedData = useMemo(() => {
    if (!data || data.length === 0) return [];

    // Historical records
    const hist = data.map((item) => ({
      dateLabel: new Date(item.date).toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
      }),
      height_cm: item.height_cm,
      leaf_count: item.leaf_count,
      fruit_count: item.fruit_count,
      pred_height_cm: null,
      pred_leaf_count: null,
      pred_fruit_count: null,
    }));

    if (predictions && predictions.length > 0) {
      // Set the last historical point as the anchor for prediction lines so they connect seamlessly
      const lastHist = hist[hist.length - 1];
      if (lastHist) {
        lastHist.pred_height_cm = lastHist.height_cm;
        lastHist.pred_leaf_count = lastHist.leaf_count;
        lastHist.pred_fruit_count = lastHist.fruit_count;
      }

      // Add forecast points
      predictions.forEach((p, idx) => {
        hist.push({
          dateLabel: `Hari +${idx + 1}`,
          height_cm: null,
          leaf_count: null,
          fruit_count: null,
          pred_height_cm: p.predicted_height_cm,
          pred_leaf_count: p.predicted_leaf_count,
          pred_fruit_count: p.predicted_fruit_count,
        });
      });
    }

    return hist;
  }, [data, predictions]);

  if (!isClient) {
    return (
      <div style={{ height: 320, display: "flex", alignItems: "center", justifyContent: "center", color: "#94a3b8" }}>
        Memuat visualisasi grafik pertumbuhan...
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div style={{ height: 200, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "#94a3b8", gap: "8px" }}>
        <IconTrendUp size={32} />
        <span style={{ fontSize: "13px" }}>Belum ada histori data pengukuran pertumbuhan untuk tanaman ini</span>
      </div>
    );
  }

  const hasPredictions = predictions && predictions.length > 0;

  return (
    <div style={{ width: "100%", height: 340, marginTop: "8px" }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={combinedData} margin={{ top: 10, right: 20, left: -10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
          <XAxis
            dataKey="dateLabel"
            tick={{ fontSize: 11, fill: "#64748b" }}
            axisLine={{ stroke: "#e2e8f0" }}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "#64748b" }}
            axisLine={{ stroke: "#e2e8f0" }}
            tickLine={false}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            verticalAlign="top"
            align="right"
            wrapperStyle={{ paddingBottom: 16, fontSize: 12, fontWeight: 500 }}
          />

          {/* Historical Actual Lines (Solid) */}
          <Line
            type="monotone"
            dataKey="height_cm"
            stroke="#059669"
            strokeWidth={3}
            dot={{ r: 3, fill: "#059669" }}
            activeDot={{ r: 6 }}
            name="Tinggi Aktual (cm)"
            connectNulls={false}
          />
          <Line
            type="monotone"
            dataKey="leaf_count"
            stroke="#0284c7"
            strokeWidth={2.5}
            dot={{ r: 3, fill: "#0284c7" }}
            activeDot={{ r: 5 }}
            name="Daun Aktual (helai)"
            connectNulls={false}
          />
          <Line
            type="monotone"
            dataKey="fruit_count"
            stroke="#e11d48"
            strokeWidth={2.5}
            dot={{ r: 3, fill: "#e11d48" }}
            activeDot={{ r: 5 }}
            name="Buah Aktual (buah)"
            connectNulls={false}
          />

          {/* Predicted LSTM Forecast Lines (Dashed) */}
          {hasPredictions && (
            <>
              <Line
                type="monotone"
                dataKey="pred_height_cm"
                stroke="#8b5cf6"
                strokeWidth={2.5}
                strokeDasharray="5 5"
                dot={{ r: 3, fill: "#8b5cf6" }}
                name="Proyeksi Tinggi (LSTM)"
                connectNulls={true}
              />
              <Line
                type="monotone"
                dataKey="pred_leaf_count"
                stroke="#38bdf8"
                strokeWidth={2}
                strokeDasharray="4 4"
                dot={{ r: 2.5, fill: "#38bdf8" }}
                name="Proyeksi Daun (LSTM)"
                connectNulls={true}
              />
              <Line
                type="monotone"
                dataKey="pred_fruit_count"
                stroke="#fb7185"
                strokeWidth={2}
                strokeDasharray="4 4"
                dot={{ r: 2.5, fill: "#fb7185" }}
                name="Proyeksi Buah (LSTM)"
                connectNulls={true}
              />
            </>
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
