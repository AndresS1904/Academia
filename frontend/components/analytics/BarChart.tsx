"use client";

interface BarItem {
  label: string;
  value: number;  // 0-1
  color?: string;
}

interface Props {
  items: BarItem[];
  showValue?: boolean;
}

function colorForRate(rate: number): string {
  if (rate >= 0.75) return "#10b981";
  if (rate >= 0.60) return "#3b82f6";
  if (rate >= 0.45) return "#f59e0b";
  return "#f87171";
}

export default function BarChart({ items, showValue = true }: Props) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {items.map((item, i) => {
        const pct = Math.round(item.value * 100);
        const color = item.color ?? colorForRate(item.value);
        return (
          <div key={i}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
              <span style={{ fontSize: "0.8rem", color: "#94a3b8", fontWeight: 500 }}>{item.label}</span>
              {showValue && (
                <span style={{ fontSize: "0.8rem", fontWeight: 700, color }}>{pct}%</span>
              )}
            </div>
            <div style={{ background: "#0f172a", borderRadius: 6, height: 8, overflow: "hidden" }}>
              <div style={{
                width: `${pct}%`, height: "100%", borderRadius: 6,
                background: `linear-gradient(90deg, ${color}cc, ${color})`,
                transition: "width 0.6s ease",
              }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
