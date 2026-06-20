"use client";

interface Props {
  value: number;  // 0-1
  size?: number;
  strokeWidth?: number;
  label?: string;
  sublabel?: string;
}

function colorForRate(rate: number): string {
  if (rate >= 0.75) return "#10b981";
  if (rate >= 0.60) return "#3b82f6";
  if (rate >= 0.45) return "#f59e0b";
  return "#f87171";
}

export default function CircularProgress({ value, size = 100, strokeWidth = 8, label, sublabel }: Props) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - value * circumference;
  const color = colorForRate(value);

  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke="#1e293b" strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke={color} strokeWidth={strokeWidth}
          strokeDasharray={circumference} strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 0.8s ease" }}
        />
      </svg>
      <div style={{
        position: "absolute", inset: 0, display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
      }}>
        {label && <span style={{ fontSize: size < 90 ? "0.9rem" : "1.1rem", fontWeight: 800, color }}>{label}</span>}
        {sublabel && <span style={{ fontSize: "0.65rem", color: "#64748b", marginTop: 1 }}>{sublabel}</span>}
      </div>
    </div>
  );
}
