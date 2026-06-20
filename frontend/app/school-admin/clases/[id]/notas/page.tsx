"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import DashboardSidebar from "@/components/layout/DashboardSidebar";
import Navbar from "@/components/layout/Navbar";
import { api } from "@/lib/api";

interface CourseGrade {
  id: string; classroomId: string; studentId: string;
  activityScore?: number; quizScore?: number; simulacroScore?: number; finalScore?: number;
  isPassing: boolean; calculatedAt: string;
  student: { id: string; firstName: string; lastName: string; documento?: string };
}

interface Certificate {
  id: string; studentId: string; verificationCode: string; status: string; issuedAt?: string; finalScore?: number;
  student: { id: string; firstName: string; lastName: string; documento?: string };
}

interface GradingConfig { activityWeight: number; quizWeight: number; simulacroWeight: number; minPassingScore: number }

export default function AdminGradesPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const classroomId = params.id as string;

  const [tab, setTab] = useState<"grades" | "config" | "certs">("grades");
  const [grades, setGrades] = useState<CourseGrade[]>([]);
  const [certs, setCerts] = useState<Certificate[]>([]);
  const [config, setConfig] = useState<GradingConfig>({ activityWeight: 0.4, quizWeight: 0.4, simulacroWeight: 0.2, minPassingScore: 60 });
  const [fetching, setFetching] = useState(true);
  const [recalculating, setRecalculating] = useState<string | null>(null);
  const [issuingAll, setIssuingAll] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);

  useEffect(() => { if (!loading && !user) router.replace("/auth/login"); }, [user, loading]);

  useEffect(() => {
    if (!user) return;
    setFetching(true);
    Promise.all([
      api.get<CourseGrade[]>(`/classrooms/classrooms/${classroomId}/grades`),
      api.get<Certificate[]>(`/classrooms/classrooms/${classroomId}/certificates`),
      api.get<GradingConfig>(`/classrooms/classrooms/${classroomId}/grading-config`),
    ]).then(([g, c, cfg]) => { setGrades(g); setCerts(c); setConfig(cfg); }).catch(() => {}).finally(() => setFetching(false));
  }, [user, classroomId]);

  async function recalculate(studentId: string) {
    setRecalculating(studentId);
    const updated = await api.post<CourseGrade>(`/classrooms/classrooms/${classroomId}/grades/recalculate/${studentId}`, {}).catch(() => null);
    if (updated) setGrades((prev) => { const idx = prev.findIndex((g) => g.studentId === studentId); if (idx >= 0) { const next = [...prev]; next[idx] = updated; return next; } return [...prev, updated]; });
    setRecalculating(null);
  }

  async function saveConfig() {
    setSavingConfig(true);
    const updated = await api.patch<GradingConfig>(`/classrooms/classrooms/${classroomId}/grading-config`, config).catch(() => null);
    if (updated) setConfig(updated);
    setSavingConfig(false);
  }

  async function issueCert(studentId: string) {
    const cert = await api.post<Certificate>(`/classrooms/classrooms/${classroomId}/certificates/issue/${studentId}`, {}).catch(() => null);
    if (cert) setCerts((prev) => { const idx = prev.findIndex((c) => c.studentId === studentId); if (idx >= 0) { const next = [...prev]; next[idx] = cert; return next; } return [...prev, cert]; });
  }

  async function issueAll() {
    setIssuingAll(true);
    const results = await api.post<Certificate[]>(`/classrooms/classrooms/${classroomId}/certificates/issue-bulk`, {}).catch(() => null);
    if (results) setCerts(results);
    setIssuingAll(false);
  }

  async function revokeCert(studentId: string) {
    if (!confirm("¿Revocar certificado?")) return;
    await api.patch(`/classrooms/classrooms/${classroomId}/certificates/revoke/${studentId}`, {}).catch(() => {});
    setCerts((prev) => prev.map((c) => c.studentId === studentId ? { ...c, status: "REVOKED" } : c));
  }

  if (loading || fetching) return null;

  const tabStyle = (t: string): React.CSSProperties => ({
    padding: "8px 16px", border: "none", borderRadius: "8px 8px 0 0", cursor: "pointer", fontWeight: 700, fontSize: "0.82rem",
    background: tab === t ? "#004aad" : "#f1f5f9", color: tab === t ? "#fff" : "#64748b",
  });

  return (
    <>
      <Navbar />
      <div className="dashboard-layout">
        <DashboardSidebar />
        <main className="dashboard-main">
          <div className="dashboard-content" style={{ maxWidth: 900 }}>
            <div style={{ marginBottom: 20 }}>
              <Link href={`/school-admin/clases/${classroomId}`} style={{ fontSize: "0.875rem", color: "#64748b", textDecoration: "none" }}>← Volver al aula</Link>
              <h1 style={{ fontFamily: "var(--font-poppins)", fontWeight: 800, fontSize: "1.3rem", color: "#1e293b", margin: "8px 0 4px" }}>🏆 Notas y Certificados</h1>
            </div>

            <div style={{ display: "flex", gap: 4, marginBottom: 0, borderBottom: "2px solid #e2e8f0" }}>
              {(["grades", "config", "certs"] as const).map((t) => (
                <button key={t} style={tabStyle(t)} onClick={() => setTab(t)}>
                  {t === "grades" ? "📊 Notas" : t === "config" ? "⚙️ Configuración" : "🎓 Certificados"}
                </button>
              ))}
            </div>

            <div style={{ background: "#fff", borderRadius: "0 8px 8px 8px", border: "1px solid #e2e8f0", padding: 20 }}>

              {/* GRADES */}
              {tab === "grades" && (
                <div>
                  {grades.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "32px 0", color: "#94a3b8", fontSize: "0.85rem" }}>
                      Sin notas calculadas aún. Las notas se calculan automáticamente o puedes recalcular por estudiante.
                    </div>
                  ) : (
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                      <thead>
                        <tr style={{ borderBottom: "1px solid #e2e8f0" }}>
                          {["Estudiante", "Tareas", "Quizzes", "Final", "Estado", ""].map((h) => (
                            <th key={h} style={{ textAlign: "left", padding: "8px 10px", fontSize: "0.75rem", fontWeight: 700, color: "#64748b" }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {grades.map((g) => (
                          <tr key={g.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                            <td style={{ padding: "10px 10px", fontSize: "0.875rem", fontWeight: 600, color: "#1e293b" }}>{g.student.firstName} {g.student.lastName}</td>
                            <td style={{ padding: "10px 10px", fontSize: "0.82rem", color: "#64748b" }}>{g.activityScore != null ? `${g.activityScore.toFixed(1)}%` : "—"}</td>
                            <td style={{ padding: "10px 10px", fontSize: "0.82rem", color: "#64748b" }}>{g.quizScore != null ? `${g.quizScore.toFixed(1)}%` : "—"}</td>
                            <td style={{ padding: "10px 10px", fontSize: "0.875rem", fontWeight: 800, color: g.isPassing ? "#166534" : "#dc2626" }}>{g.finalScore != null ? `${g.finalScore.toFixed(1)}%` : "—"}</td>
                            <td style={{ padding: "10px 10px" }}>
                              <span style={{ padding: "2px 8px", background: g.isPassing ? "#dcfce7" : "#fee2e2", color: g.isPassing ? "#166534" : "#dc2626", borderRadius: 10, fontSize: "0.68rem", fontWeight: 700 }}>{g.isPassing ? "Aprobado" : "Reprobado"}</span>
                            </td>
                            <td style={{ padding: "10px 10px" }}>
                              <button onClick={() => recalculate(g.studentId)} disabled={recalculating === g.studentId} style={{ padding: "4px 10px", border: "1px solid #e2e8f0", borderRadius: 6, background: "#fff", cursor: "pointer", fontSize: "0.72rem", color: "#64748b" }}>{recalculating === g.studentId ? "…" : "Recalcular"}</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}

              {/* CONFIG */}
              {tab === "config" && (
                <div style={{ maxWidth: 500 }}>
                  <h3 style={{ margin: "0 0 16px", fontSize: "1rem", fontWeight: 700 }}>Pesos de calificación</h3>
                  <p style={{ color: "#64748b", fontSize: "0.82rem", marginBottom: 20 }}>
                    Los pesos deben sumar 1.0 (o serán normalizados automáticamente).
                  </p>
                  {[
                    { label: "Peso Tareas", key: "activityWeight" as const },
                    { label: "Peso Quizzes", key: "quizWeight" as const },
                    { label: "Peso Simulacros", key: "simulacroWeight" as const },
                    { label: "Nota mínima aprobatoria (%)", key: "minPassingScore" as const },
                  ].map(({ label, key }) => (
                    <div key={key} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                      <label style={{ width: 200, fontSize: "0.82rem", fontWeight: 600, color: "#374151" }}>{label}</label>
                      <input
                        type="number" step="0.05" min="0" max={key === "minPassingScore" ? "100" : "1"}
                        value={config[key]}
                        onChange={(e) => setConfig((prev) => ({ ...prev, [key]: parseFloat(e.target.value) || 0 }))}
                        style={{ ...inputStyle, width: 90 }}
                      />
                    </div>
                  ))}
                  <button onClick={saveConfig} disabled={savingConfig} style={btnPrimary}>{savingConfig ? "Guardando…" : "Guardar configuración"}</button>
                </div>
              )}

              {/* CERTS */}
              {tab === "certs" && (
                <div>
                  <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
                    <button onClick={issueAll} disabled={issuingAll} style={{ padding: "7px 14px", background: "#16a34a", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 700, fontSize: "0.82rem" }}>{issuingAll ? "Emitiendo…" : "🎓 Emitir a todos los aprobados"}</button>
                  </div>

                  {grades.filter((g) => g.isPassing).length === 0 ? (
                    <div style={{ textAlign: "center", padding: "32px 0", color: "#94a3b8", fontSize: "0.85rem" }}>Ningún estudiante ha aprobado el curso aún.</div>
                  ) : (
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                      <thead>
                        <tr style={{ borderBottom: "1px solid #e2e8f0" }}>
                          {["Estudiante", "Nota final", "Estado certificado", "Código", "Fecha emisión", ""].map((h) => (
                            <th key={h} style={{ textAlign: "left", padding: "8px 10px", fontSize: "0.75rem", fontWeight: 700, color: "#64748b" }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {grades.filter((g) => g.isPassing).map((g) => {
                          const cert = certs.find((c) => c.studentId === g.studentId);
                          return (
                            <tr key={g.studentId} style={{ borderBottom: "1px solid #f1f5f9" }}>
                              <td style={{ padding: "10px 10px", fontSize: "0.875rem", fontWeight: 600, color: "#1e293b" }}>{g.student.firstName} {g.student.lastName}</td>
                              <td style={{ padding: "10px 10px", fontSize: "0.82rem", color: "#166534", fontWeight: 700 }}>{g.finalScore?.toFixed(1)}%</td>
                              <td style={{ padding: "10px 10px" }}>
                                {cert ? (
                                  <span style={{ padding: "2px 8px", background: cert.status === "ISSUED" ? "#dcfce7" : "#fee2e2", color: cert.status === "ISSUED" ? "#166534" : "#dc2626", borderRadius: 10, fontSize: "0.68rem", fontWeight: 700 }}>{cert.status}</span>
                                ) : <span style={{ fontSize: "0.72rem", color: "#94a3b8" }}>Sin emitir</span>}
                              </td>
                              <td style={{ padding: "10px 10px", fontSize: "0.72rem", color: "#64748b", fontFamily: "monospace" }}>{cert?.verificationCode ?? "—"}</td>
                              <td style={{ padding: "10px 10px", fontSize: "0.72rem", color: "#64748b" }}>{cert?.issuedAt ? new Date(cert.issuedAt).toLocaleDateString("es-CO") : "—"}</td>
                              <td style={{ padding: "10px 10px" }}>
                                <div style={{ display: "flex", gap: 4 }}>
                                  {!cert || cert.status !== "ISSUED" ? (
                                    <button onClick={() => issueCert(g.studentId)} style={{ padding: "4px 10px", background: "#e0e7ff", color: "#4338ca", border: "none", borderRadius: 6, cursor: "pointer", fontSize: "0.72rem", fontWeight: 700 }}>Emitir</button>
                                  ) : (
                                    <button onClick={() => revokeCert(g.studentId)} style={{ padding: "4px 10px", border: "1px solid #fee2e2", borderRadius: 6, background: "#fff", cursor: "pointer", fontSize: "0.72rem", color: "#dc2626" }}>Revocar</button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              )}

            </div>
          </div>
        </main>
      </div>
    </>
  );
}

const inputStyle: React.CSSProperties = { padding: "8px 10px", borderRadius: 8, border: "1.5px solid #c7d7f0", fontSize: "0.82rem" };
const btnPrimary: React.CSSProperties = { padding: "8px 18px", background: "#004aad", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 700, fontSize: "0.82rem" };
