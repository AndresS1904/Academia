"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import Navbar from "@/components/layout/Navbar";
import DashboardSidebar from "@/components/layout/DashboardSidebar";
import BarChart from "@/components/analytics/BarChart";
import CircularProgress from "@/components/analytics/CircularProgress";
import MiniSparkline from "@/components/analytics/MiniSparkline";

interface AreaScore { area: string; correct: number; total: number; accuracyRate: number; avgTimeSec: number }
interface Snapshot {
  attemptId: string; date: string; accuracyRate: number; scaledScore: number;
  predictedScore: number; areaScores: AreaScore[];
}
interface Profile {
  totalAttempts: number; avgAccuracy: number; avgScaledScore: number;
  predictedIcfes: number; level: string; riskLevel: string; trend: string;
  strengths: { type: string; label: string; score: number }[];
  weaknesses: { type: string; label: string; score: number }[];
  areaProfiles: { area: string; accuracyRate: number; attempts: number; trend: string }[];
  competenceProfiles: { area: string; competence: string; accuracyRate: number }[];
}
interface Recommendation {
  id: string; type: string; area?: string; topic?: string; message: string; priority: number;
}
interface Alert { id: string; type: string; message: string; severity: string }

interface DashboardData {
  profile: Profile | null;
  evolution: Snapshot[];
  areaEvolution: Record<string, { date: string; accuracyRate: number }[]>;
  recommendations: Recommendation[];
  alerts: Alert[];
  totalAttempts: number;
}

const LEVEL_COLORS: Record<string, string> = {
  BAJO: "#dc2626", MEDIO_BAJO: "#ea580c", MEDIO: "#d97706",
  MEDIO_ALTO: "#059669", ALTO: "#10b981",
};
const TREND_ICONS: Record<string, string> = {
  MEJORANDO: "↗", ESTANCADO: "→", RETROCEDIENDO: "↘", INSUFICIENTE_DATA: "—",
};
const TREND_COLORS: Record<string, string> = {
  MEJORANDO: "#059669", ESTANCADO: "#d97706", RETROCEDIENDO: "#dc2626", INSUFICIENTE_DATA: "#64748b",
};
const RISK_COLORS: Record<string, string> = { BAJO: "#059669", MEDIO: "#d97706", ALTO: "#dc2626", CRITICO: "#7f1d1d" };

const CARD = { background: "#fff", borderRadius: 16, border: "1px solid #e2eaf7", padding: 24, boxShadow: "0 2px 8px rgba(0,74,173,0.05)" } as const;
const INNER_ROW = { background: "#f8faff", borderRadius: 8, padding: "8px 14px" } as const;

export default function AnaliticaPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [fetching, setFetching] = useState(true);
  const [activeTab, setActiveTab] = useState<"general" | "areas" | "competencias" | "evolucion">("general");
  const [alertsOpen, setAlertsOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    api.get<DashboardData>("/analytics/me")
      .then(setData)
      .finally(() => setFetching(false));
  }, [user]);

  const p = data?.profile;
  const evolution = data?.evolution ?? [];

  if (fetching) return (
    <>
      <Navbar />
      <div className="dashboard-layout">
        <DashboardSidebar />
        <main className="dashboard-main">
          <div className="dashboard-inner" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 300 }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "2rem", marginBottom: 12 }}>📊</div>
              <p style={{ color: "#64748b" }}>Cargando tu analítica…</p>
            </div>
          </div>
        </main>
      </div>
    </>
  );

  if (!p || data?.totalAttempts === 0) return (
    <>
      <Navbar />
      <div className="dashboard-layout">
        <DashboardSidebar />
        <main className="dashboard-main">
          <div className="dashboard-inner" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 300 }}>
            <div style={{ textAlign: "center", maxWidth: 400 }}>
              <div style={{ fontSize: "3rem", marginBottom: 16 }}>📋</div>
              <h2 style={{ fontSize: "1.3rem", fontWeight: 700, marginBottom: 8, color: "#1e293b" }}>Sin datos aún</h2>
              <p style={{ color: "#64748b", marginBottom: 24 }}>Completa al menos un simulacro para ver tu analítica académica.</p>
              <Link href="/dashboard/simulacros" style={{ padding: "12px 24px", background: "#004aad", color: "#fff", borderRadius: 10, textDecoration: "none", fontWeight: 700 }}>
                Ir a mis simulacros
              </Link>
            </div>
          </div>
        </main>
      </div>
    </>
  );

  return (
    <>
      <Navbar />
      <div className="dashboard-layout">
        <DashboardSidebar />
        <main className="dashboard-main">
          <div className="dashboard-inner">

            {/* Page header */}
            <div style={{ marginBottom: 28 }}>
              <h1 style={{ fontSize: "1.5rem", fontWeight: 800, color: "#1e293b", margin: 0 }}>Analítica Académica</h1>
              <p style={{ color: "#64748b", fontSize: "0.875rem", margin: "4px 0 0" }}>
                {p.totalAttempts} simulacro{p.totalAttempts !== 1 ? "s" : ""} completado{p.totalAttempts !== 1 ? "s" : ""}
              </p>
            </div>

            {/* Alerts — compact collapsible */}
            {(data?.alerts ?? []).length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <button
                  onClick={() => setAlertsOpen(o => !o)}
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    width: "100%", padding: "9px 14px",
                    background: "#fef2f2", color: "#dc2626",
                    border: "1px solid #fecaca", borderRadius: alertsOpen ? "10px 10px 0 0" : 10,
                    cursor: "pointer", fontSize: "0.82rem", fontWeight: 600,
                  }}
                >
                  <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    ⚠️
                    <span>{data!.alerts.length} alerta{data!.alerts.length !== 1 ? "s" : ""} activa{data!.alerts.length !== 1 ? "s" : ""}</span>
                    <span style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {data!.alerts.map(a => (
                        <span key={a.id} style={{
                          padding: "1px 8px", borderRadius: 20, fontSize: "0.72rem", fontWeight: 700,
                          background: a.severity === "ALTA" ? "#fee2e2" : a.severity === "MEDIA" ? "#fef3c7" : "#f1f5f9",
                          color: a.severity === "ALTA" ? "#dc2626" : a.severity === "MEDIA" ? "#b45309" : "#475569",
                        }}>
                          {a.type.replace(/_/g, " ")}
                        </span>
                      ))}
                    </span>
                  </span>
                  <span style={{ fontSize: "0.7rem", opacity: 0.7 }}>{alertsOpen ? "▲ ocultar" : "▼ ver"}</span>
                </button>
                {alertsOpen && (
                  <div style={{
                    background: "#fff5f5", border: "1px solid #fecaca", borderTop: "none",
                    borderRadius: "0 0 10px 10px", padding: "8px 0",
                  }}>
                    {data!.alerts.map((alert, i) => (
                      <div key={alert.id} style={{
                        padding: "8px 14px", fontSize: "0.82rem", color: "#dc2626",
                        borderBottom: i < data!.alerts.length - 1 ? "1px solid #fee2e2" : "none",
                        display: "flex", gap: 10, alignItems: "flex-start",
                      }}>
                        <span style={{ opacity: 0.6, flexShrink: 0 }}>·</span>
                        {alert.message}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* KPI Row */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16, marginBottom: 24 }}>
              {[
                {
                  label: "Rendimiento global",
                  value: `${Math.round(p.avgAccuracy * 100)}%`,
                  sub: `Nivel: ${p.level.replace("_", " ")}`,
                  color: LEVEL_COLORS[p.level] ?? "#004aad",
                },
                {
                  label: "Puntaje promedio",
                  value: Math.round(p.avgScaledScore).toString(),
                  sub: "Escala ICFES",
                  color: "#7c3aed",
                },
                {
                  label: "Predicción ICFES",
                  value: Math.round(p.predictedIcfes).toString(),
                  sub: "Estimado actual",
                  color: "#d97706",
                },
                {
                  label: "Tendencia",
                  value: TREND_ICONS[p.trend] ?? "—",
                  sub: p.trend.replace("_", " "),
                  color: TREND_COLORS[p.trend] ?? "#64748b",
                },
                {
                  label: "Riesgo académico",
                  value: p.riskLevel,
                  sub: "Nivel de riesgo",
                  color: RISK_COLORS[p.riskLevel] ?? "#64748b",
                },
              ].map((kpi, i) => (
                <div key={i} style={{ ...CARD, padding: "18px 20px" }}>
                  <div style={{ fontSize: "0.72rem", color: "#64748b", fontWeight: 600, marginBottom: 6, textTransform: "uppercase" }}>{kpi.label}</div>
                  <div style={{ fontSize: "1.6rem", fontWeight: 900, color: kpi.color, lineHeight: 1 }}>{kpi.value}</div>
                  <div style={{ fontSize: "0.75rem", color: "#94a3b8", marginTop: 4 }}>{kpi.sub}</div>
                </div>
              ))}
            </div>

            {/* Prediction detail */}
            <div style={{ ...CARD, marginBottom: 24, display: "flex", gap: 24, alignItems: "center" }}>
              <CircularProgress value={p.avgAccuracy} size={110} label={`${Math.round(p.avgAccuracy * 100)}%`} sublabel="Global" />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#64748b", marginBottom: 12, textTransform: "uppercase" }}>Rendimiento por área (escala 0–100)</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  {(p.areaProfiles ?? []).map((a, i) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", ...INNER_ROW }}>
                      <div>
                        <div style={{ fontSize: "0.8rem", color: "#1e293b", fontWeight: 600 }}>{a.area}</div>
                        <div style={{ fontSize: "0.7rem", color: TREND_COLORS[a.trend] }}>{TREND_ICONS[a.trend]} {a.trend.replace("_", " ")}</div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: "1.1rem", fontWeight: 800, color: LEVEL_COLORS[toLevel(a.accuracyRate)] ?? "#004aad" }}>
                          {scaleToIcfes(a.accuracyRate)}
                        </div>
                        <div style={{ fontSize: "0.7rem", color: "#94a3b8" }}>{Math.round(a.accuracyRate * 100)}% aciertos</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div style={{ display: "flex", gap: 4, marginBottom: 20 }}>
              {(["general", "areas", "competencias", "evolucion"] as const).map(tab => (
                <button key={tab} onClick={() => setActiveTab(tab)} style={{
                  padding: "8px 16px", borderRadius: 8,
                  background: activeTab === tab ? "#004aad" : "#f1f5f9",
                  color: activeTab === tab ? "#fff" : "#475569",
                  border: "none", cursor: "pointer", fontWeight: 600, fontSize: "0.85rem",
                }}>
                  {{ general: "General", areas: "Por Área", competencias: "Competencias", evolucion: "Evolución" }[tab]}
                </button>
              ))}
            </div>

            {/* Tab: General */}
            {activeTab === "general" && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                <div style={CARD}>
                  <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "#059669", marginBottom: 12, textTransform: "uppercase" }}>
                    ✅ Fortalezas
                  </div>
                  {(p.strengths ?? []).length === 0 ? (
                    <p style={{ color: "#94a3b8", fontSize: "0.85rem" }}>Aún sin fortalezas detectadas. ¡Sigue practicando!</p>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {p.strengths.map((s, i) => (
                        <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", ...INNER_ROW }}>
                          <span style={{ fontSize: "0.82rem", color: "#1e293b" }}>{s.label}</span>
                          <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "#059669" }}>{Math.round(s.score * 100)}%</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div style={CARD}>
                  <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "#dc2626", marginBottom: 12, textTransform: "uppercase" }}>
                    ⚠️ Áreas a reforzar
                  </div>
                  {(p.weaknesses ?? []).length === 0 ? (
                    <p style={{ color: "#94a3b8", fontSize: "0.85rem" }}>¡Sin debilidades críticas detectadas!</p>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {p.weaknesses.map((w, i) => (
                        <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", ...INNER_ROW }}>
                          <span style={{ fontSize: "0.82rem", color: "#1e293b" }}>{w.label}</span>
                          <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "#dc2626" }}>{Math.round(w.score * 100)}%</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div style={{ ...CARD, gridColumn: "1 / -1" }}>
                  <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "#7c3aed", marginBottom: 16, textTransform: "uppercase" }}>
                    💡 Recomendaciones
                  </div>
                  {(data?.recommendations ?? []).length === 0 ? (
                    <p style={{ color: "#94a3b8", fontSize: "0.85rem" }}>¡Sin recomendaciones por ahora!</p>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      {data!.recommendations.slice(0, 5).map((rec, i) => (
                        <div key={i} style={{
                          background: "#f8faff", borderRadius: 10, padding: "12px 16px",
                          borderLeft: `3px solid ${rec.priority === 1 ? "#dc2626" : rec.priority === 2 ? "#d97706" : "#059669"}`,
                        }}>
                          <div style={{ fontSize: "0.82rem", color: "#1e293b" }}>{rec.message}</div>
                          {rec.area && <div style={{ fontSize: "0.72rem", color: "#94a3b8", marginTop: 4 }}>Área: {rec.area}{rec.topic ? ` · ${rec.topic}` : ""}</div>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Tab: Areas */}
            {activeTab === "areas" && (
              <div style={CARD}>
                <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "#64748b", marginBottom: 20, textTransform: "uppercase" }}>
                  Rendimiento por área
                </div>
                {(p.areaProfiles ?? []).length === 0 ? (
                  <p style={{ color: "#94a3b8" }}>Sin datos por área.</p>
                ) : (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
                    {p.areaProfiles.map((a, i) => {
                      const areaHistory = (data?.areaEvolution ?? {})[a.area] ?? [];
                      return (
                        <div key={i} style={{ background: "#f8faff", borderRadius: 12, padding: 16, border: "1px solid #e2eaf7" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                            <div>
                              <div style={{ fontWeight: 700, color: "#1e293b", fontSize: "0.9rem" }}>{a.area}</div>
                              <div style={{ fontSize: "0.72rem", color: TREND_COLORS[a.trend] }}>
                                {TREND_ICONS[a.trend]} {a.trend.replace("_", " ")} · {a.attempts} intentos
                              </div>
                            </div>
                            <div style={{ textAlign: "right" }}>
                              <div style={{ fontSize: "1.4rem", fontWeight: 900, color: LEVEL_COLORS[toLevel(a.accuracyRate)] ?? "#004aad" }}>
                                {Math.round(a.accuracyRate * 100)}%
                              </div>
                              <div style={{ fontSize: "0.72rem", color: "#94a3b8" }}>Score área: {scaleToIcfes(a.accuracyRate)}/100</div>
                            </div>
                          </div>
                          <div style={{ background: "#e2eaf7", borderRadius: 6, height: 8, overflow: "hidden", marginBottom: 10 }}>
                            <div style={{
                              width: `${Math.round(a.accuracyRate * 100)}%`, height: "100%", borderRadius: 6,
                              background: `linear-gradient(90deg, ${LEVEL_COLORS[toLevel(a.accuracyRate)] ?? "#004aad"}aa, ${LEVEL_COLORS[toLevel(a.accuracyRate)] ?? "#004aad"})`,
                              transition: "width 0.6s",
                            }} />
                          </div>
                          {areaHistory.length >= 2 && (
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <span style={{ fontSize: "0.7rem", color: "#94a3b8" }}>Evolución:</span>
                              <MiniSparkline values={areaHistory.map(h => h.accuracyRate)} />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Tab: Competencias */}
            {activeTab === "competencias" && (
              <div style={CARD}>
                <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "#64748b", marginBottom: 20, textTransform: "uppercase" }}>
                  Rendimiento por competencia
                </div>
                {(p.competenceProfiles ?? []).length === 0 ? (
                  <div style={{ textAlign: "center", padding: "40px 0", color: "#94a3b8" }}>
                    <p>Sin datos de competencias.</p>
                    <p style={{ fontSize: "0.82rem", marginTop: 8 }}>Las competencias se calculan cuando las preguntas del banco tienen metadata de competencia.</p>
                  </div>
                ) : (
                  <div>
                    {[...new Set(p.competenceProfiles.map(c => c.area))].map(area => (
                      <div key={area} style={{ marginBottom: 24 }}>
                        <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "#7c3aed", marginBottom: 12 }}>{area}</div>
                        <BarChart
                          items={p.competenceProfiles.filter(c => c.area === area).map(c => ({
                            label: c.competence,
                            value: c.accuracyRate,
                          }))}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Tab: Evolución */}
            {activeTab === "evolucion" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                <div style={CARD}>
                  <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "#64748b", marginBottom: 20, textTransform: "uppercase" }}>
                    Evolución histórica global
                  </div>
                  {evolution.length < 2 ? (
                    <p style={{ color: "#94a3b8", fontSize: "0.85rem" }}>Necesitas al menos 2 simulacros para ver la evolución.</p>
                  ) : (
                    <>
                      <div style={{ position: "relative", height: 160, marginBottom: 16 }}>
                        <EvolutionChart data={evolution} />
                      </div>
                      <div style={{ overflow: "auto" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem" }}>
                          <thead>
                            <tr style={{ borderBottom: "1px solid #e2eaf7" }}>
                              {["#", "Fecha", "Rendimiento", "Puntaje ICFES", "Predicción"].map(h => (
                                <th key={h} style={{ padding: "8px 12px", textAlign: "left", color: "#64748b", fontWeight: 600 }}>{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {evolution.map((e, i) => (
                              <tr key={i} style={{ borderBottom: "1px solid #f1f5f9" }}>
                                <td style={{ padding: "8px 12px", color: "#94a3b8" }}>{i + 1}</td>
                                <td style={{ padding: "8px 12px", color: "#64748b" }}>{new Date(e.date).toLocaleDateString("es-CO", { day: "numeric", month: "short" })}</td>
                                <td style={{ padding: "8px 12px" }}>
                                  <span style={{ color: LEVEL_COLORS[toLevel(e.accuracyRate)], fontWeight: 700 }}>
                                    {Math.round(e.accuracyRate * 100)}%
                                  </span>
                                </td>
                                <td style={{ padding: "8px 12px", color: "#1e293b", fontWeight: 700 }}>{Math.round(e.scaledScore)}</td>
                                <td style={{ padding: "8px 12px", color: "#d97706", fontWeight: 600 }}>{Math.round(e.predictedScore)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </>
                  )}
                </div>

                {Object.keys(data?.areaEvolution ?? {}).length > 0 && (
                  <div style={CARD}>
                    <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "#64748b", marginBottom: 16, textTransform: "uppercase" }}>
                      Evolución por área
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 16 }}>
                      {Object.entries(data!.areaEvolution).map(([area, history]) => {
                        const vals = history.map(h => h.accuracyRate);
                        const last = vals[vals.length - 1] ?? 0;
                        return (
                          <div key={area} style={{ background: "#f8faff", borderRadius: 10, padding: "12px 14px", border: "1px solid #e2eaf7" }}>
                            <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "#1e293b", marginBottom: 6 }}>{area}</div>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                              <MiniSparkline values={vals} width={90} />
                              <span style={{ fontSize: "1rem", fontWeight: 800, color: LEVEL_COLORS[toLevel(last)] ?? "#004aad" }}>
                                {Math.round(last * 100)}%
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

          </div>
        </main>
      </div>
    </>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function scaleToIcfes(accuracy: number): number {
  return Math.round(accuracy * 100);
}

function toLevel(accuracy: number): string {
  if (accuracy < 0.40) return "BAJO";
  if (accuracy < 0.55) return "MEDIO_BAJO";
  if (accuracy < 0.65) return "MEDIO";
  if (accuracy < 0.75) return "MEDIO_ALTO";
  return "ALTO";
}

// ── Evolution chart (SVG) ─────────────────────────────────────────────────────
function EvolutionChart({ data }: { data: Snapshot[] }) {
  const W = 700, H = 150;
  const PAD = { top: 10, right: 20, bottom: 30, left: 40 };
  const w = W - PAD.left - PAD.right;
  const h = H - PAD.top - PAD.bottom;

  const vals = data.map(d => d.accuracyRate);
  const minV = Math.max(0, Math.min(...vals) - 0.05);
  const maxV = Math.min(1, Math.max(...vals) + 0.05);
  const range = maxV - minV || 0.01;

  const points = vals.map((v, i) => {
    const x = PAD.left + (i / Math.max(vals.length - 1, 1)) * w;
    const y = PAD.top + (1 - (v - minV) / range) * h;
    return [x, y] as [number, number];
  });

  const pathD = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p[0]},${p[1]}`).join(" ");

  const areaD = [
    `M ${points[0][0]},${PAD.top + h}`,
    ...points.map(p => `L ${p[0]},${p[1]}`),
    `L ${points[points.length - 1][0]},${PAD.top + h}`,
    "Z",
  ].join(" ");

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "100%" }}>
      <defs>
        <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#004aad" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#004aad" stopOpacity="0.02" />
        </linearGradient>
      </defs>
      {[0, 0.25, 0.5, 0.75, 1].map(pct => {
        const y = PAD.top + pct * h;
        const val = maxV - pct * range;
        return (
          <g key={pct}>
            <line x1={PAD.left} y1={y} x2={PAD.left + w} y2={y} stroke="#e2eaf7" strokeWidth={1} />
            <text x={PAD.left - 6} y={y + 4} textAnchor="end" fontSize={9} fill="#94a3b8">{Math.round(val * 100)}%</text>
          </g>
        );
      })}
      <path d={areaD} fill="url(#areaGrad)" />
      <path d={pathD} fill="none" stroke="#004aad" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      {points.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={3.5} fill="#004aad" />
      ))}
      {data.map((d, i) => {
        const x = PAD.left + (i / Math.max(vals.length - 1, 1)) * w;
        return (
          <text key={i} x={x} y={PAD.top + h + 18} textAnchor="middle" fontSize={9} fill="#94a3b8">
            {new Date(d.date).toLocaleDateString("es-CO", { month: "short", day: "numeric" })}
          </text>
        );
      })}
    </svg>
  );
}
