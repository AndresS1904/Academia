"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import SchoolAdminSidebar from "@/components/school-admin/SchoolAdminSidebar";
import BarChart from "@/components/analytics/BarChart";
import MiniSparkline from "@/components/analytics/MiniSparkline";

interface AreaAvg { area: string; accuracyRate: number; total: number }
interface RiskCounts { BAJO: number; MEDIO: number; ALTO: number; CRITICO: number }
interface StudentRow {
  userId: string; name: string; avgAccuracy: number;
  predictedIcfes: number; level: string; riskLevel: string; totalAttempts: number;
}
interface AtRiskRow { userId: string; name: string; avgAccuracy: number; riskLevel: string; trend: string }
interface WeekPoint { week: string; avgAccuracy: number; count: number }

interface SchoolDashboard {
  totalStudents: number;
  avgAccuracy: number;
  avgPredictedIcfes: number;
  areaAverages: AreaAvg[];
  riskCounts: RiskCounts;
  topStudents: StudentRow[];
  atRiskStudents: AtRiskRow[];
  schoolEvolution: WeekPoint[];
}

const LEVEL_COLORS: Record<string, string> = {
  BAJO: "#f87171", MEDIO_BAJO: "#fb923c", MEDIO: "#f59e0b",
  MEDIO_ALTO: "#34d399", ALTO: "#10b981",
};
const RISK_COLORS: Record<string, string> = { BAJO: "#10b981", MEDIO: "#f59e0b", ALTO: "#f87171", CRITICO: "#dc2626" };
const TREND_ICONS: Record<string, string> = { MEJORANDO: "↗", ESTANCADO: "→", RETROCEDIENDO: "↘", INSUFICIENTE_DATA: "—" };

export default function SchoolAdminAnaliticaPage() {
  const { user } = useAuth();
  const [data, setData] = useState<SchoolDashboard | null>(null);
  const [fetching, setFetching] = useState(true);
  const [tab, setTab] = useState<"overview" | "areas" | "estudiantes" | "riesgo">("overview");

  useEffect(() => {
    if (!user) return;
    api.get<SchoolDashboard>("/analytics/school")
      .then(setData)
      .finally(() => setFetching(false));
  }, [user]);

  const CARD = { background: "#fff", borderRadius: 16, border: "1px solid #e2eaf7", padding: 24, boxShadow: "0 2px 8px rgba(0,74,173,0.06)" } as const;

  return (
    <div style={{ minHeight: "100vh", background: "#f0f4ff" }}>
      <SchoolAdminSidebar />
      <main style={{ marginLeft: 260, padding: "32px 36px", minHeight: "100vh", boxSizing: "border-box" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
          <div>
            <h1 style={{ fontSize: "1.5rem", fontWeight: 800, color: "#1e293b", margin: 0 }}>Analítica Institucional</h1>
            <p style={{ color: "#64748b", fontSize: "0.875rem", margin: "4px 0 0" }}>
              Rendimiento académico de tu institución
            </p>
          </div>
        </div>

        {fetching ? (
          <div style={{ textAlign: "center", padding: "64px 24px", color: "#64748b" }}>⏳ Calculando analítica…</div>
        ) : !data || data.totalStudents === 0 ? (
          <div style={{ ...CARD, textAlign: "center", padding: "64px 24px" }}>
            <div style={{ fontSize: "2.5rem", marginBottom: 12 }}>📊</div>
            <h3 style={{ color: "#1e293b", marginBottom: 8 }}>Sin datos de analítica</h3>
            <p style={{ color: "#64748b" }}>Los datos aparecerán cuando tus estudiantes completen simulacros.</p>
          </div>
        ) : (
          <>
            {/* KPI row */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 16, marginBottom: 24 }}>
              {[
                { label: "Estudiantes con analítica", value: data.totalStudents.toString(), color: "#004aad" },
                { label: "Rendimiento promedio", value: `${Math.round(data.avgAccuracy * 100)}%`, color: "#059669" },
                { label: "Puntaje ICFES prom.", value: Math.round(data.avgPredictedIcfes).toString(), color: "#7c3aed" },
                { label: "En riesgo", value: (data.riskCounts.ALTO + data.riskCounts.CRITICO).toString(), color: "#dc2626" },
                { label: "Riesgo crítico", value: data.riskCounts.CRITICO.toString(), color: "#b91c1c" },
              ].map((kpi, i) => (
                <div key={i} style={{ ...CARD, padding: "18px 20px" }}>
                  <div style={{ fontSize: "0.7rem", color: "#94a3b8", fontWeight: 600, textTransform: "uppercase", marginBottom: 6 }}>{kpi.label}</div>
                  <div style={{ fontSize: "1.8rem", fontWeight: 900, color: kpi.color }}>{kpi.value}</div>
                </div>
              ))}
            </div>

            {/* Risk distribution */}
            <div style={{ ...CARD, marginBottom: 24 }}>
              <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "#475569", marginBottom: 16, textTransform: "uppercase" }}>
                Distribución de riesgo académico
              </div>
              <div style={{ display: "flex", gap: 12 }}>
                {Object.entries(data.riskCounts).map(([risk, count]) => {
                  const total = Object.values(data.riskCounts).reduce((a, b) => a + b, 0);
                  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                  return (
                    <div key={risk} style={{ flex: 1, background: "#f8faff", borderRadius: 10, padding: "12px 16px", textAlign: "center", borderTop: `3px solid ${RISK_COLORS[risk] ?? "#94a3b8"}` }}>
                      <div style={{ fontSize: "1.5rem", fontWeight: 900, color: RISK_COLORS[risk] }}>{count}</div>
                      <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#475569" }}>{risk}</div>
                      <div style={{ fontSize: "0.72rem", color: "#94a3b8" }}>{pct}%</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Tabs */}
            <div style={{ display: "flex", gap: 4, marginBottom: 20 }}>
              {(["overview", "areas", "estudiantes", "riesgo"] as const).map(t => (
                <button key={t} onClick={() => setTab(t)} style={{
                  padding: "8px 16px", borderRadius: 8,
                  background: tab === t ? "#004aad" : "#fff",
                  color: tab === t ? "#fff" : "#64748b",
                  border: `1px solid ${tab === t ? "#004aad" : "#e2eaf7"}`,
                  cursor: "pointer", fontWeight: 600, fontSize: "0.85rem",
                }}>
                  {{ overview: "General", areas: "Por Área", estudiantes: "Ranking", riesgo: "Riesgo" }[t]}
                </button>
              ))}
            </div>

            {/* Overview */}
            {tab === "overview" && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                <div style={CARD}>
                  <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "#475569", marginBottom: 16, textTransform: "uppercase" }}>Evolución semanal</div>
                  {data.schoolEvolution.length < 2 ? (
                    <p style={{ color: "#94a3b8", fontSize: "0.85rem" }}>Insuficiente historial.</p>
                  ) : (
                    <>
                      <SchoolEvolutionChart data={data.schoolEvolution} />
                      <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
                        {data.schoolEvolution.slice(-4).map((w, i) => (
                          <div key={i} style={{ background: "#f8faff", borderRadius: 6, padding: "4px 10px", fontSize: "0.75rem" }}>
                            <span style={{ color: "#475569" }}>{w.week}: </span>
                            <span style={{ fontWeight: 700, color: "#004aad" }}>{Math.round(w.avgAccuracy * 100)}%</span>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
                <div style={CARD}>
                  <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "#475569", marginBottom: 16, textTransform: "uppercase" }}>Áreas más débiles</div>
                  <BarChart
                    items={[...data.areaAverages].sort((a, b) => a.accuracyRate - b.accuracyRate).slice(0, 5).map(a => ({
                      label: a.area,
                      value: a.accuracyRate,
                    }))}
                  />
                </div>
              </div>
            )}

            {/* Areas */}
            {tab === "areas" && (
              <div style={CARD}>
                <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "#475569", marginBottom: 20, textTransform: "uppercase" }}>Rendimiento por área</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                  {data.areaAverages.map((a, i) => (
                    <div key={i} style={{ background: "#f8faff", borderRadius: 12, padding: "16px 18px", borderLeft: `4px solid ${accuracyColor(a.accuracyRate)}` }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                        <div style={{ fontWeight: 700, color: "#1e293b", fontSize: "0.9rem" }}>{a.area}</div>
                        <div style={{ fontWeight: 900, fontSize: "1.1rem", color: accuracyColor(a.accuracyRate) }}>
                          {Math.round(a.accuracyRate * 100)}%
                        </div>
                      </div>
                      <div style={{ background: "#e2eaf7", borderRadius: 6, height: 8 }}>
                        <div style={{ width: `${Math.round(a.accuracyRate * 100)}%`, height: "100%", borderRadius: 6, background: accuracyColor(a.accuracyRate), transition: "width 0.6s" }} />
                      </div>
                      <div style={{ fontSize: "0.72rem", color: "#94a3b8", marginTop: 6 }}>
                        ~ICFES: {Math.round(300 + a.accuracyRate * 200)} · {a.total} respuestas
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Ranking */}
            {tab === "estudiantes" && (
              <div style={CARD}>
                <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "#475569", marginBottom: 20, textTransform: "uppercase" }}>
                  Ranking de estudiantes (top 10)
                </div>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: "#f8faff", borderBottom: "1px solid #e2eaf7" }}>
                      {["#", "Nombre", "Rendimiento", "Pred. ICFES", "Nivel", "Riesgo", "Simulacros", ""].map(h => (
                        <th key={h} style={{ padding: "10px 12px", textAlign: "left", fontSize: "0.76rem", fontWeight: 700, color: "#475569" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.topStudents.map((s, i) => (
                      <tr key={i} style={{ borderBottom: "1px solid #f1f5f9" }}>
                        <td style={{ padding: "10px 12px", color: "#94a3b8", fontWeight: 700 }}>#{i + 1}</td>
                        <td style={{ padding: "10px 12px", fontWeight: 600, color: "#1e293b" }}>{s.name}</td>
                        <td style={{ padding: "10px 12px" }}>
                          <span style={{ fontWeight: 700, color: LEVEL_COLORS[s.level] ?? "#3b82f6" }}>
                            {Math.round(s.avgAccuracy * 100)}%
                          </span>
                        </td>
                        <td style={{ padding: "10px 12px", fontWeight: 700, color: "#7c3aed" }}>{Math.round(s.predictedIcfes)}</td>
                        <td style={{ padding: "10px 12px" }}>
                          <span style={{ padding: "3px 8px", borderRadius: 20, fontSize: "0.72rem", fontWeight: 700, background: `${LEVEL_COLORS[s.level] ?? "#3b82f6"}22`, color: LEVEL_COLORS[s.level] ?? "#3b82f6" }}>
                            {s.level.replace("_", " ")}
                          </span>
                        </td>
                        <td style={{ padding: "10px 12px" }}>
                          <span style={{ padding: "3px 8px", borderRadius: 20, fontSize: "0.72rem", fontWeight: 700, background: `${RISK_COLORS[s.riskLevel] ?? "#94a3b8"}22`, color: RISK_COLORS[s.riskLevel] ?? "#94a3b8" }}>
                            {s.riskLevel}
                          </span>
                        </td>
                        <td style={{ padding: "10px 12px", color: "#94a3b8", fontSize: "0.85rem" }}>{s.totalAttempts}</td>
                        <td style={{ padding: "10px 12px" }}>
                          <Link href={`/school-admin/estudiantes/${s.userId}`} style={{ fontSize: "0.78rem", color: "#004aad", fontWeight: 600, textDecoration: "none" }}>
                            Ver
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Riesgo */}
            {tab === "riesgo" && (
              <div style={CARD}>
                <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "#dc2626", marginBottom: 20, textTransform: "uppercase" }}>
                  ⚠️ Estudiantes en riesgo académico
                </div>
                {data.atRiskStudents.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "40px 0", color: "#64748b" }}>
                    ✅ ¡No hay estudiantes en riesgo alto o crítico!
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {data.atRiskStudents.map((s, i) => (
                      <div key={i} style={{
                        display: "flex", justifyContent: "space-between", alignItems: "center",
                        background: "#fef2f2", borderRadius: 10, padding: "14px 18px",
                        borderLeft: `4px solid ${RISK_COLORS[s.riskLevel] ?? "#f87171"}`,
                      }}>
                        <div>
                          <div style={{ fontWeight: 700, color: "#1e293b" }}>{s.name}</div>
                          <div style={{ fontSize: "0.78rem", color: "#64748b", marginTop: 2 }}>
                            Rendimiento: <strong style={{ color: "#dc2626" }}>{Math.round(s.avgAccuracy * 100)}%</strong>
                            {" · "}Tendencia: <strong style={{ color: "#64748b" }}>{TREND_ICONS[s.trend] ?? "—"} {s.trend.replace("_", " ")}</strong>
                          </div>
                        </div>
                        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                          <span style={{ padding: "4px 10px", borderRadius: 20, fontSize: "0.75rem", fontWeight: 700, background: `${RISK_COLORS[s.riskLevel]}22`, color: RISK_COLORS[s.riskLevel] }}>
                            {s.riskLevel}
                          </span>
                          <Link href={`/school-admin/estudiantes/${s.userId}`} style={{ fontSize: "0.8rem", color: "#004aad", fontWeight: 600, textDecoration: "none" }}>
                            Ver perfil →
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

function accuracyColor(v: number): string {
  if (v >= 0.75) return "#10b981";
  if (v >= 0.60) return "#3b82f6";
  if (v >= 0.45) return "#f59e0b";
  return "#f87171";
}

function SchoolEvolutionChart({ data }: { data: WeekPoint[] }) {
  const W = 400, H = 120;
  const PAD = { top: 8, right: 12, bottom: 24, left: 36 };
  const w = W - PAD.left - PAD.right;
  const h = H - PAD.top - PAD.bottom;
  const vals = data.map(d => d.avgAccuracy);
  const min = Math.max(0, Math.min(...vals) - 0.05);
  const max = Math.min(1, Math.max(...vals) + 0.05);
  const range = max - min || 0.01;

  const points = vals.map((v, i) => [
    PAD.left + (i / Math.max(vals.length - 1, 1)) * w,
    PAD.top + (1 - (v - min) / range) * h,
  ] as [number, number]);

  const pathD = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p[0]},${p[1]}`).join(" ");
  const areaD = [`M ${points[0][0]},${PAD.top + h}`, ...points.map(p => `L ${p[0]},${p[1]}`), `L ${points[points.length - 1][0]},${PAD.top + h}`, "Z"].join(" ");

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: 120 }}>
      <defs>
        <linearGradient id="schoolGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#004aad" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#004aad" stopOpacity="0.02" />
        </linearGradient>
      </defs>
      {[0.25, 0.5, 0.75].map(pct => {
        const y = PAD.top + pct * h;
        const val = max - pct * range;
        return <g key={pct}>
          <line x1={PAD.left} y1={y} x2={PAD.left + w} y2={y} stroke="#e2eaf7" strokeWidth={1} />
          <text x={PAD.left - 4} y={y + 3} textAnchor="end" fontSize={8} fill="#94a3b8">{Math.round(val * 100)}%</text>
        </g>;
      })}
      <path d={areaD} fill="url(#schoolGrad)" />
      <path d={pathD} fill="none" stroke="#004aad" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      {points.map(([x, y], i) => <circle key={i} cx={x} cy={y} r={3} fill="#004aad" />)}
      {data.map((d, i) => {
        const x = PAD.left + (i / Math.max(vals.length - 1, 1)) * w;
        return <text key={i} x={x} y={PAD.top + h + 14} textAnchor="middle" fontSize={8} fill="#94a3b8">{d.week.replace(/\d+-/, "")}</text>;
      })}
    </svg>
  );
}
