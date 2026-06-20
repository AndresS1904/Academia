"use client";

interface Props {
  values: number[];  // 0-1
  width?: number;
  height?: number;
  color?: string;
}

export default function MiniSparkline({ values, width = 80, height = 28, color = "#3b82f6" }: Props) {
  if (values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 0.01;
  const pad = 2;
  const w = width - pad * 2;
  const h = height - pad * 2;

  const points = values.map((v, i) => {
    const x = pad + (i / (values.length - 1)) * w;
    const y = pad + (1 - (v - min) / range) * h;
    return `${x},${y}`;
  }).join(" ");

  const trend = values[values.length - 1] - values[0];
  const lineColor = trend > 0.02 ? "#10b981" : trend < -0.02 ? "#f87171" : color;

  return (
    <svg width={width} height={height} style={{ overflow: "visible" }}>
      <polyline
        points={points}
        fill="none"
        stroke={lineColor}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle
        cx={+points.split(" ").pop()!.split(",")[0]}
        cy={+points.split(" ").pop()!.split(",")[1]}
        r={2.5}
        fill={lineColor}
      />
    </svg>
  );
}
