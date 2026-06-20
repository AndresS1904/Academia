"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import DashboardSidebar from "@/components/layout/DashboardSidebar";
import Navbar from "@/components/layout/Navbar";
import { api } from "@/lib/api";

// ── types ─────────────────────────────────────────────────────────────────────

interface Material { id: string; title: string; type: string; externalUrl?: string; allowDownload: boolean; description?: string }
interface Submission { id: string; status: string; score?: number; submittedAt?: string; feedback?: string }
interface Activity { id: string; title: string; description?: string; dueDate?: string; maxScore: number; isPublished: boolean; submissions: Submission[] }
interface QuizAttempt { id: string; score?: number; passed?: boolean; status: string; submittedAt?: string }
interface Quiz { id: string; title: string; description?: string; timeLimit?: number; maxAttempts: number; passingScore: number; status: string; _count: { questions: number }; attempts: QuizAttempt[] }
interface Forum { id: string; title: string; description?: string; isLocked: boolean; _count: { threads: number } }
interface UnitProgress { isCompleted: boolean; completedAt?: string }
interface UnitDetail {
  id: string; title: string; type: string; content?: string; videoUrl?: string; isPublished: boolean;
  materials: Material[]; activities: Activity[]; quizzes: Quiz[]; forums: Forum[]; progress: UnitProgress[];
}

const TYPE_ICONS: Record<string, string> = { PDF: "📄", WORD: "📝", IMAGE: "🖼️", VIDEO: "🎬", LINK: "🔗", OTHER: "📎" };

// ── component ─────────────────────────────────────────────────────────────────

export default function StudentUnitPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const classroomId = params.id as string;
  const unitId = params.uid as string;

  const [unit, setUnit] = useState<UnitDetail | null>(null);
  const [fetching, setFetching] = useState(true);

  useEffect(() => { if (!loading && !user) router.replace("/auth/login"); }, [user, loading]);

  useEffect(() => {
    if (!user || !unitId) return;
    api.get<UnitDetail>(`/classrooms/units/${unitId}/student`)
      .then(setUnit).catch(() => {}).finally(() => setFetching(false));
  }, [user, unitId]);

  if (loading || fetching || !unit) return (
    <>
      <Navbar />
      <div className="dashboard-layout"><DashboardSidebar />
        <main className="dashboard-main"><div style={{ padding: 48, textAlign: "center", color: "#94a3b8" }}>Cargando unidad…</div></main>
      </div>
    </>
  );

  const progress = unit.progress[0];
  const isCompleted = progress?.isCompleted ?? false;

  function getVideoEmbedUrl(url: string): string | null {
    const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/);
    if (yt) return `https://www.youtube.com/embed/${yt[1]}`;
    const vimeo = url.match(/vimeo\.com\/(\d+)/);
    if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}`;
    return null;
  }

  return (
    <>
      <Navbar />
      <div className="dashboard-layout">
        <DashboardSidebar />
        <main className="dashboard-main">
          <div className="dashboard-content" style={{ maxWidth: 800 }}>

            {/* Header */}
            <div style={{ marginBottom: 24 }}>
              <Link href={`/dashboard/clases/${classroomId}`} style={{ fontSize: "0.85rem", color: "#64748b", textDecoration: "none" }}>← Volver al aula</Link>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginTop: 8 }}>
                <div style={{ flex: 1 }}>
                  <h1 style={{ fontFamily: "var(--font-poppins)", fontWeight: 800, fontSize: "1.3rem", color: "#1e293b", margin: "0 0 4px" }}>{unit.title}</h1>
                </div>
                {isCompleted && (
                  <span style={{ padding: "4px 12px", background: "#dcfce7", color: "#15803d", borderRadius: 20, fontSize: "0.75rem", fontWeight: 700, flexShrink: 0 }}>✓ Completada</span>
                )}
              </div>
            </div>

            {/* Unit content */}
            {unit.type === "TEXT" && unit.content && (
              <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #e2e8f0", padding: "20px 24px", marginBottom: 20 }}>
                <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "#94a3b8", marginBottom: 10, textTransform: "uppercase" }}>Contenido</div>
                <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.8, color: "#374151", fontSize: "0.925rem" }}>{unit.content}</div>
              </div>
            )}

            {unit.type === "VIDEO" && unit.videoUrl && (() => {
              const embed = getVideoEmbedUrl(unit.videoUrl);
              return (
                <div style={{ background: "#000", borderRadius: 14, overflow: "hidden", marginBottom: 20, aspectRatio: "16/9" }}>
                  {embed ? (
                    <iframe src={embed} style={{ width: "100%", height: "100%", border: "none" }} allowFullScreen title={unit.title} />
                  ) : (
                    <div style={{ padding: 24, textAlign: "center" }}>
                      <a href={unit.videoUrl} target="_blank" rel="noreferrer" style={{ color: "#60a5fa" }}>▶ Ver video externo</a>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Materials */}
            {unit.materials.length > 0 && (
              <section style={{ background: "#fff", borderRadius: 14, border: "1px solid #e2e8f0", padding: "18px 20px", marginBottom: 20 }}>
                <div style={{ fontWeight: 700, fontSize: "0.88rem", color: "#1e293b", marginBottom: 12 }}>📁 Material de estudio</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {unit.materials.map((m) => (
                    <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", background: "#f8fafc", borderRadius: 10, border: "1px solid #f1f5f9" }}>
                      <span style={{ fontSize: "1.4rem" }}>{TYPE_ICONS[m.type] ?? "📎"}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: "0.88rem", color: "#1e293b" }}>{m.title}</div>
                        {m.description && <div style={{ fontSize: "0.75rem", color: "#64748b" }}>{m.description}</div>}
                      </div>
                      {m.externalUrl && (
                        <a href={m.externalUrl} target="_blank" rel="noreferrer"
                          style={{ padding: "6px 14px", background: "#f0f4ff", color: "#004aad", borderRadius: 8, textDecoration: "none", fontSize: "0.78rem", fontWeight: 700, flexShrink: 0 }}>
                          {m.allowDownload ? "Descargar / Ver" : "Ver"}
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Quizzes */}
            {unit.quizzes.length > 0 && (
              <section style={{ background: "#fff", borderRadius: 14, border: "1px solid #e2e8f0", padding: "18px 20px", marginBottom: 20 }}>
                <div style={{ fontWeight: 700, fontSize: "0.88rem", color: "#1e293b", marginBottom: 12 }}>🧪 Pruebas académicas</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {unit.quizzes.map((q) => {
                    const lastAttempt = q.attempts[0];
                    const completedAttempts = q.attempts.filter((a) => a.status === "COMPLETED").length;
                    const attemptsLeft = q.maxAttempts - completedAttempts;
                    return (
                      <div key={q.id} style={{ padding: "14px 16px", background: "#faf5ff", borderRadius: 10, border: "1px solid #ede9fe" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 700, fontSize: "0.92rem", color: "#1e293b" }}>{q.title}</div>
                            <div style={{ fontSize: "0.72rem", color: "#64748b", marginTop: 3 }}>
                              {q._count.questions} preguntas · Mín: {q.passingScore}%
                              {q.timeLimit && ` · ${q.timeLimit} min`}
                              {" · "}{attemptsLeft > 0 ? `${attemptsLeft} intento(s) restante(s)` : "Sin intentos restantes"}
                            </div>
                            {lastAttempt && lastAttempt.status === "COMPLETED" && (
                              <div style={{ marginTop: 4, fontSize: "0.78rem", color: lastAttempt.passed ? "#15803d" : "#dc2626", fontWeight: 600 }}>
                                Último resultado: {lastAttempt.score?.toFixed(1)}% {lastAttempt.passed ? "✅ Aprobado" : "❌ No aprobado"}
                              </div>
                            )}
                          </div>
                          {attemptsLeft > 0 ? (
                            <Link href={`/dashboard/clases/${classroomId}/quiz/${q.id}`}
                              style={{ padding: "8px 18px", background: "#7c3aed", color: "#fff", borderRadius: 8, textDecoration: "none", fontWeight: 700, fontSize: "0.82rem", flexShrink: 0 }}>
                              {lastAttempt && lastAttempt.status === "COMPLETED" ? "Reintentar" : "Comenzar"}
                            </Link>
                          ) : (
                            <Link href={`/dashboard/clases/${classroomId}/quiz/${q.id}`}
                              style={{ padding: "8px 18px", background: "#f1f5f9", color: "#64748b", borderRadius: 8, textDecoration: "none", fontWeight: 700, fontSize: "0.82rem", flexShrink: 0 }}>
                              Ver resultado
                            </Link>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Forums */}
            {unit.forums.length > 0 && (
              <section style={{ background: "#fff", borderRadius: 14, border: "1px solid #e2e8f0", padding: "18px 20px", marginBottom: 20 }}>
                <div style={{ fontWeight: 700, fontSize: "0.88rem", color: "#1e293b", marginBottom: 12 }}>💬 Foros de discusión</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {unit.forums.map((f) => (
                    <div key={f.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", background: "#f0fdf4", borderRadius: 10, border: "1px solid #bbf7d0" }}>
                      <span style={{ fontSize: "1.5rem" }}>💬</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: "0.92rem", color: "#1e293b" }}>{f.title}</div>
                        {f.description && <div style={{ fontSize: "0.75rem", color: "#64748b" }}>{f.description}</div>}
                        <div style={{ fontSize: "0.72rem", color: "#94a3b8" }}>{f._count.threads} hilo(s)</div>
                      </div>
                      {!f.isLocked ? (
                        <Link href={`/dashboard/clases/${classroomId}/foro/${f.id}`}
                          style={{ padding: "7px 14px", background: "#059669", color: "#fff", borderRadius: 8, textDecoration: "none", fontWeight: 700, fontSize: "0.78rem", flexShrink: 0 }}>
                          Participar
                        </Link>
                      ) : (
                        <span style={{ padding: "5px 10px", background: "#fee2e2", color: "#dc2626", borderRadius: 8, fontSize: "0.72rem", fontWeight: 700 }}>Bloqueado</span>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Activities */}
            {unit.activities.length > 0 && (
              <section style={{ background: "#fff", borderRadius: 14, border: "1px solid #e2e8f0", padding: "18px 20px", marginBottom: 20 }}>
                <div style={{ fontWeight: 700, fontSize: "0.88rem", color: "#1e293b", marginBottom: 12 }}>📋 Tareas</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {unit.activities.map((a) => {
                    const sub = a.submissions[0];
                    const isOverdue = a.dueDate && new Date(a.dueDate) < new Date() && !sub;
                    return (
                      <div key={a.id} style={{ padding: "14px 16px", background: "#fffbeb", borderRadius: 10, border: "1px solid #fde68a" }}>
                        <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 700, fontSize: "0.92rem", color: "#1e293b" }}>{a.title}</div>
                            {a.description && <div style={{ fontSize: "0.78rem", color: "#64748b", marginTop: 3 }}>{a.description}</div>}
                            <div style={{ fontSize: "0.72rem", color: "#94a3b8", marginTop: 4 }}>
                              Puntaje: {a.maxScore}
                              {a.dueDate && ` · Límite: ${new Date(a.dueDate).toLocaleDateString("es-CO", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}`}
                            </div>
                            {sub && (
                              <div style={{ marginTop: 6, padding: "4px 10px", background: sub.status === "GRADED" ? "#dcfce7" : "#dbeafe", borderRadius: 6, display: "inline-block" }}>
                                <span style={{ fontSize: "0.72rem", fontWeight: 700, color: sub.status === "GRADED" ? "#15803d" : "#1d4ed8" }}>
                                  {sub.status === "GRADED" ? `✅ Calificada: ${sub.score} pts` : "⏳ Entregada — en revisión"}
                                </span>
                              </div>
                            )}
                            {isOverdue && <div style={{ fontSize: "0.72rem", color: "#dc2626", marginTop: 4 }}>⚠ Fecha límite superada</div>}
                          </div>
                          <Link href={`/dashboard/clases/${classroomId}/tarea/${a.id}`}
                            style={{ padding: "8px 16px", background: "#d97706", color: "#fff", borderRadius: 8, textDecoration: "none", fontWeight: 700, fontSize: "0.78rem", flexShrink: 0 }}>
                            {sub ? "Ver entrega" : "Entregar tarea"}
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Mark complete */}
            {!isCompleted && (
              <div style={{ textAlign: "center", marginTop: 8 }}>
                <button
                  onClick={async () => {
                    await api.post(`/classrooms/units/${unitId}/complete`, {}).catch(() => null);
                    setUnit((p) => p ? { ...p, progress: [{ isCompleted: true, completedAt: new Date().toISOString() }] } : p);
                  }}
                  style={{ padding: "12px 32px", background: "#004aad", color: "#fff", border: "none", borderRadius: 10, cursor: "pointer", fontWeight: 800, fontSize: "1rem" }}>
                  ✓ Marcar unidad como completada
                </button>
              </div>
            )}

          </div>
        </main>
      </div>
    </>
  );
}
