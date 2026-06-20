"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import DashboardSidebar from "@/components/layout/DashboardSidebar";
import Navbar from "@/components/layout/Navbar";
import { api } from "@/lib/api";

// ── types ─────────────────────────────────────────────────────────────────────

interface Material { id: string; title: string; type: string; fileKey: string | null; fileName: string | null; fileSize: number | null; externalUrl: string | null; allowDownload: boolean }
interface Submission { id: string; status: string; score: number | null; submittedAt: string | null }
interface Activity { id: string; title: string; description: string | null; dueDate: string | null; maxScore: number | null; submissions: Submission[] }
interface UnitProgress { isCompleted: boolean; completedAt: string | null }
interface LearningUnit { id: string; title: string; type: string; content: string | null; videoUrl: string | null; simulacroId: string | null; isPublished: boolean; durationMin: number | null; progress: UnitProgress[] }
interface TopicSimulacro { id: string; simulacro: { id: string; titulo: string; totalPreguntas: number; duracionMinutos: number } }
interface TopicProgress { isCompleted: boolean }
interface ClassSubtopic { id: string; title: string; isPublished: boolean; units: LearningUnit[] }
interface ClassTopic { id: string; title: string; description: string | null; isPublished: boolean; units: LearningUnit[]; subtopics: ClassSubtopic[]; simulacros: TopicSimulacro[]; progress: TopicProgress[] }
interface ClassSection { id: string; title: string; isPublished: boolean; topics: ClassTopic[] }
interface ClassModule { id: string; title: string; description: string | null; order: number; materials: Material[]; activities: Activity[]; sections: ClassSection[] }
interface Forum { id: string; title: string; description: string | null; _count: { threads: number } }
interface Classroom { id: string; title: string; description: string | null; color: string | null; emoji: string | null; modules: ClassModule[]; forums: Forum[] }

// ── helpers ───────────────────────────────────────────────────────────────────

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";
const TYPE_ICONS: Record<string, string> = { PDF: "📄", WORD: "📝", IMAGE: "🖼️", VIDEO: "🎬", LINK: "🔗", OTHER: "📎" };
const UNIT_ICONS: Record<string, string> = { TEXT: "📄", VIDEO: "🎬", FILE: "📎", SIMULACRO_LINK: "📝" };
const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  DRAFT: { bg: "#f1f5f9", color: "#64748b" }, SUBMITTED: { bg: "#dbeafe", color: "#1d4ed8" },
  LATE: { bg: "#fef3c7", color: "#b45309" }, GRADED: { bg: "#dcfce7", color: "#15803d" }, RETURNED: { bg: "#fce7f3", color: "#9d174d" },
};
function fmtSize(b: number) { return b < 1024 * 1024 ? `${(b / 1024).toFixed(0)} KB` : `${(b / 1024 / 1024).toFixed(1)} MB`; }
function fmtDate(s: string | null) { return s ? new Date(s).toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" }) : null; }
function isPastDue(d: string | null) { return d ? new Date(d) < new Date() : false; }

export default function StudentClassroomPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const classroomId = params.id as string;

  const [classroom, setClassroom] = useState<Classroom | null>(null);
  const [fetching, setFetching] = useState(true);
  const [activeTab, setActiveTab] = useState<"contenido" | "foros" | "notas">("contenido");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [progress, setProgress] = useState<{ totalUnits: number; completedUnits: number; percentage: number } | null>(null);
  const [completing, setCompleting] = useState<string | null>(null);

  useEffect(() => { if (!loading && !user) router.replace("/auth/login"); }, [user, loading]);

  useEffect(() => {
    if (!user) return;
    api.get<Classroom>(`/classrooms/view/${classroomId}/full`)
      .then((data) => {
        setClassroom(data);
        if (data.modules.length > 0) setExpanded(new Set([data.modules[0].id]));
      })
      .catch(() => router.replace("/dashboard/clases"))
      .finally(() => setFetching(false));
    api.get<any>(`/classrooms/view/${classroomId}/progress`).then(setProgress).catch(() => {});
  }, [user, classroomId]);

  function toggle(id: string) {
    setExpanded((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  async function markComplete(unitId: string) {
    setCompleting(unitId);
    await api.post(`/classrooms/units/${unitId}/complete`, {}).catch(() => {});
    // Refresh progress
    api.get<any>(`/classrooms/view/${classroomId}/progress`).then(setProgress).catch(() => {});
    // Update local state
    setClassroom((p) => {
      if (!p) return p;
      const updateUnits = (units: LearningUnit[]) => units.map((u) => u.id === unitId ? { ...u, progress: [{ isCompleted: true, completedAt: new Date().toISOString() }] } : u);
      return {
        ...p,
        modules: p.modules.map((m) => ({
          ...m,
          sections: m.sections.map((s) => ({
            ...s,
            topics: s.topics.map((t) => ({
              ...t,
              units: updateUnits(t.units),
              subtopics: t.subtopics.map((sub) => ({ ...sub, units: updateUnits(sub.units) })),
            })),
          })),
        })),
      };
    });
    setCompleting(null);
  }

  if (loading || fetching) return null;
  if (!classroom) return null;

  const accent = classroom.color ?? "#004aad";

  return (
    <>
      <Navbar />
      <div className="dashboard-layout">
        <DashboardSidebar />
        <main className="dashboard-main">
          <div className="dashboard-content" style={{ maxWidth: 860 }}>

            {/* Header */}
            <div style={{ marginBottom: 24 }}>
              <Link href="/dashboard/clases" style={{ color: "#64748b", textDecoration: "none", fontSize: "0.875rem" }}>← Mis clases</Link>
              <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 12 }}>
                <div style={{ width: 52, height: 52, borderRadius: 14, flexShrink: 0, background: `${accent}18`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.6rem", border: `2px solid ${accent}30` }}>
                  {classroom.emoji ?? "🏫"}
                </div>
                <div style={{ flex: 1 }}>
                  <h1 style={{ fontFamily: "var(--font-poppins)", fontWeight: 800, fontSize: "1.5rem", color: "#1e293b", margin: 0 }}>{classroom.title}</h1>
                  {classroom.description && <p style={{ color: "#64748b", fontSize: "0.9rem", margin: "4px 0 0" }}>{classroom.description}</p>}
                </div>
                {/* Progress ring */}
                {progress && progress.totalUnits > 0 && (
                  <div style={{ textAlign: "center", flexShrink: 0 }}>
                    <div style={{ fontSize: "1.5rem", fontWeight: 900, color: accent }}>{progress.percentage}%</div>
                    <div style={{ fontSize: "0.7rem", color: "#94a3b8" }}>{progress.completedUnits}/{progress.totalUnits} unidades</div>
                  </div>
                )}
              </div>
            </div>

            {/* Tabs */}
            <div style={{ display: "flex", gap: 4, marginBottom: 24, borderBottom: "2px solid #f1f5f9" }}>
              {(["contenido", "foros", "notas"] as const).map((tab) => (
                <button key={tab} onClick={() => setActiveTab(tab)} style={{
                  padding: "10px 20px", border: "none", background: "none", cursor: "pointer", fontWeight: 700, fontSize: "0.875rem",
                  color: activeTab === tab ? accent : "#94a3b8",
                  borderBottom: activeTab === tab ? `2px solid ${accent}` : "2px solid transparent",
                  marginBottom: -2,
                }}>
                  {tab === "contenido" ? "Contenido" : tab === "foros" ? `💬 Foros (${classroom.forums.length})` : "🏆 Mi nota"}
                </button>
              ))}
            </div>

            {/* ── CONTENIDO ────────────────────────────────────────────── */}
            {activeTab === "contenido" && (
              classroom.modules.length === 0 ? (
                <div style={{ textAlign: "center", padding: "48px 24px", background: "#f8fafc", borderRadius: 16, border: "2px dashed #e2e8f0", color: "#94a3b8" }}>Esta aula no tiene contenido publicado aún.</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {classroom.modules.map((mod, idx) => {
                    const isOpen = expanded.has(mod.id);
                    const totalItems = mod.materials.length + mod.activities.length + mod.sections.reduce((acc, s) => acc + s.topics.length, 0);
                    return (
                      <div key={mod.id} style={{ background: "#fff", borderRadius: 14, border: "1px solid #e2e8f0", overflow: "hidden" }}>
                        <button onClick={() => toggle(mod.id)} style={{ width: "100%", padding: "16px 20px", background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 12, textAlign: "left" }}>
                          <div style={{ width: 32, height: 32, borderRadius: 8, flexShrink: 0, background: `${accent}15`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.9rem", fontWeight: 800, color: accent }}>{idx + 1}</div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 700, fontSize: "0.95rem", color: "#1e293b" }}>{mod.title}</div>
                            {mod.description && <div style={{ fontSize: "0.8rem", color: "#94a3b8", marginTop: 2 }}>{mod.description}</div>}
                          </div>
                          <div style={{ fontSize: "0.78rem", color: "#94a3b8", marginRight: 8 }}>{totalItems} elemento{totalItems !== 1 ? "s" : ""}</div>
                          <span style={{ color: "#94a3b8" }}>{isOpen ? "▲" : "▼"}</span>
                        </button>

                        {isOpen && (
                          <div style={{ borderTop: "1px solid #f1f5f9", padding: "4px 0 12px" }}>

                            {/* Materials */}
                            {mod.materials.map((mat) => (
                              <div key={mat.id} style={{ margin: "4px 12px", borderRadius: 10, padding: "12px 14px", background: "#f8fafc", display: "flex", alignItems: "center", gap: 12 }}>
                                <span style={{ fontSize: "1.2rem", flexShrink: 0 }}>{TYPE_ICONS[mat.type] ?? "📎"}</span>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ fontWeight: 600, fontSize: "0.88rem", color: "#1e293b" }}>{mat.title}</div>
                                  {mat.fileSize && <div style={{ fontSize: "0.75rem", color: "#94a3b8" }}>{fmtSize(mat.fileSize)}</div>}
                                </div>
                                {mat.externalUrl ? (
                                  <a href={mat.externalUrl} target="_blank" rel="noopener noreferrer" style={{ padding: "6px 14px", background: "#f0f4ff", color: "#004aad", borderRadius: 8, textDecoration: "none", fontWeight: 700, fontSize: "0.8rem" }}>Abrir</a>
                                ) : mat.fileKey ? (
                                  <a href={`${BASE}/classrooms/files/${mat.fileKey}`} target="_blank" rel="noopener noreferrer" style={{ padding: "6px 14px", background: "#f0f4ff", color: "#004aad", borderRadius: 8, textDecoration: "none", fontWeight: 700, fontSize: "0.8rem" }}>{mat.allowDownload ? "Descargar" : "Ver"}</a>
                                ) : null}
                              </div>
                            ))}

                            {/* Activities */}
                            {mod.activities.map((act) => {
                              const sub = act.submissions?.[0] ?? null;
                              const sc = sub ? (STATUS_COLORS[sub.status] ?? STATUS_COLORS.DRAFT) : null;
                              const overdue = !sub && isPastDue(act.dueDate);
                              return (
                                <div key={act.id} style={{ margin: "4px 12px", borderRadius: 10, padding: "12px 14px", background: "#fffbf0", border: "1px solid #fef3c7", display: "flex", alignItems: "center", gap: 12 }}>
                                  <span style={{ fontSize: "1.2rem" }}>📋</span>
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontWeight: 600, fontSize: "0.88rem", color: "#1e293b" }}>{act.title}</div>
                                    <div style={{ fontSize: "0.75rem", color: "#94a3b8", marginTop: 2 }}>
                                      {act.dueDate && <span style={{ color: overdue ? "#dc2626" : undefined }}>Entrega: {fmtDate(act.dueDate)}{overdue ? " (vencida)" : ""}</span>}
                                      {act.maxScore != null && <span>{act.dueDate ? " · " : ""}Puntaje: {act.maxScore}</span>}
                                    </div>
                                  </div>
                                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                                    {sub && sc && <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: "0.72rem", fontWeight: 700, background: sc.bg, color: sc.color }}>{sub.score != null ? `${sub.score}${act.maxScore != null ? `/${act.maxScore}` : ""}` : sub.status}</span>}
                                    <Link href={`/dashboard/clases/${classroomId}/actividad/${act.id}`} style={{ padding: "6px 14px", background: accent, color: "#fff", borderRadius: 8, textDecoration: "none", fontWeight: 700, fontSize: "0.8rem" }}>{sub ? "Ver entrega" : "Entregar"}</Link>
                                  </div>
                                </div>
                              );
                            })}

                            {/* Sections → Topics → Subtopics → Units */}
                            {mod.sections.map((sec) => (
                              <div key={sec.id} style={{ margin: "8px 12px" }}>
                                <button onClick={() => toggle(sec.id)} style={{ width: "100%", padding: "8px 12px", background: "#f0f4ff", border: "none", borderRadius: 8, cursor: "pointer", display: "flex", alignItems: "center", gap: 8, textAlign: "left" }}>
                                  <span style={{ fontWeight: 700, fontSize: "0.85rem", color: "#004aad", flex: 1 }}>📂 {sec.title}</span>
                                  <span style={{ color: "#94a3b8", fontSize: "0.8rem" }}>{expanded.has(sec.id) ? "▲" : "▼"}</span>
                                </button>

                                {expanded.has(sec.id) && (
                                  <div style={{ marginTop: 6, display: "flex", flexDirection: "column", gap: 6 }}>
                                    {sec.topics.map((topic) => (
                                      <div key={topic.id} style={{ border: "1px solid #e2e8f0", borderRadius: 8, overflow: "hidden", marginLeft: 8 }}>
                                        <button onClick={() => toggle(topic.id)} style={{ width: "100%", padding: "10px 14px", background: "#faf5ff", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 8, textAlign: "left" }}>
                                          <div style={{ flex: 1 }}>
                                            <div style={{ fontWeight: 700, fontSize: "0.85rem", color: "#6d28d9" }}>📖 {topic.title}</div>
                                            {topic.description && <div style={{ fontSize: "0.75rem", color: "#94a3b8", marginTop: 2 }}>{topic.description}</div>}
                                          </div>
                                          {topic.progress?.[0]?.isCompleted && <span style={{ color: "#059669", fontSize: "0.82rem" }}>✓</span>}
                                          <span style={{ color: "#94a3b8", fontSize: "0.8rem" }}>{expanded.has(topic.id) ? "▲" : "▼"}</span>
                                        </button>

                                        {expanded.has(topic.id) && (
                                          <div style={{ padding: "8px 14px", borderTop: "1px solid #f3e8ff" }}>
                                            {/* Topic simulacros */}
                                            {topic.simulacros.length > 0 && (
                                              <div style={{ marginBottom: 8, display: "flex", flexDirection: "column", gap: 4 }}>
                                                {topic.simulacros.map((ts) => (
                                                  <Link key={ts.id} href={`/dashboard/simulacros`} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", background: "#fffbeb", borderRadius: 8, border: "1px solid #fef3c7", textDecoration: "none" }}>
                                                    <span style={{ fontSize: "1rem" }}>📝</span>
                                                    <div style={{ flex: 1 }}>
                                                      <div style={{ fontWeight: 600, fontSize: "0.85rem", color: "#92400e" }}>{ts.simulacro.titulo}</div>
                                                      <div style={{ fontSize: "0.72rem", color: "#94a3b8" }}>{ts.simulacro.totalPreguntas} preguntas · {ts.simulacro.duracionMinutos} min</div>
                                                    </div>
                                                    <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "#d97706" }}>Practicar →</span>
                                                  </Link>
                                                ))}
                                              </div>
                                            )}

                                            {/* Topic units */}
                                            {topic.units.map((unit) => (
                                              <UnitCard key={unit.id} unit={unit} accent={accent} classroomId={classroomId} onComplete={() => markComplete(unit.id)} completing={completing === unit.id} />
                                            ))}

                                            {/* Subtopics */}
                                            {topic.subtopics.map((sub) => (
                                              <div key={sub.id} style={{ marginTop: 8, marginLeft: 12 }}>
                                                <button onClick={() => toggle(sub.id)} style={{ width: "100%", padding: "7px 10px", background: "#f0fdf4", border: "none", borderRadius: 7, cursor: "pointer", display: "flex", alignItems: "center", gap: 8, textAlign: "left" }}>
                                                  <span style={{ fontWeight: 700, fontSize: "0.78rem", color: "#15803d", flex: 1 }}>↳ {sub.title}</span>
                                                  <span style={{ color: "#94a3b8", fontSize: "0.75rem" }}>{expanded.has(sub.id) ? "▲" : "▼"}</span>
                                                </button>
                                                {expanded.has(sub.id) && (
                                                  <div style={{ marginTop: 4, display: "flex", flexDirection: "column", gap: 4 }}>
                                                    {sub.units.map((unit) => (
                                                      <UnitCard key={unit.id} unit={unit} accent={accent} classroomId={classroomId} onComplete={() => markComplete(unit.id)} completing={completing === unit.id} />
                                                    ))}
                                                    {sub.units.length === 0 && <div style={{ fontSize: "0.75rem", color: "#94a3b8", paddingLeft: 8 }}>Sin contenido.</div>}
                                                  </div>
                                                )}
                                              </div>
                                            ))}

                                            {topic.units.length === 0 && topic.subtopics.length === 0 && topic.simulacros.length === 0 && (
                                              <div style={{ fontSize: "0.78rem", color: "#94a3b8" }}>Sin contenido disponible.</div>
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    ))}
                                    {sec.topics.length === 0 && <div style={{ fontSize: "0.78rem", color: "#94a3b8", paddingLeft: 12 }}>Sin temas.</div>}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )
            )}

            {/* ── FOROS ──────────────────────────────────────────────────── */}
            {activeTab === "foros" && (
              classroom.forums.length === 0 ? (
                <div style={{ textAlign: "center", padding: "48px 24px", background: "#f8fafc", borderRadius: 16, border: "2px dashed #e2e8f0", color: "#94a3b8" }}>
                  <div style={{ fontSize: "2.5rem", marginBottom: 8 }}>💬</div>
                  <div>No hay foros disponibles en esta aula.</div>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {classroom.forums.map((forum) => (
                    <Link key={forum.id} href={`/dashboard/clases/${classroomId}/foro/${forum.id}`} style={{
                      display: "flex", alignItems: "center", gap: 14, padding: "16px 20px",
                      background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", textDecoration: "none",
                    }}>
                      <div style={{ width: 44, height: 44, borderRadius: 10, background: "#f0fdf4", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.4rem", flexShrink: 0 }}>💬</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: "0.92rem", color: "#1e293b" }}>{forum.title}</div>
                        {forum.description && <div style={{ fontSize: "0.78rem", color: "#64748b", marginTop: 2 }}>{forum.description}</div>}
                        <div style={{ fontSize: "0.72rem", color: "#94a3b8", marginTop: 4 }}>{forum._count.threads} hilo{forum._count.threads !== 1 ? "s" : ""}</div>
                      </div>
                      <span style={{ fontSize: "0.85rem", color: accent, fontWeight: 700 }}>Entrar →</span>
                    </Link>
                  ))}
                </div>
              )
            )}

            {/* ── NOTAS ────────────────────────────────────────────────── */}
            {activeTab === "notas" && (
              <div style={{ textAlign: "center", padding: "40px 24px" }}>
                <div style={{ fontSize: "2.5rem", marginBottom: 12 }}>🏆</div>
                <h3 style={{ fontWeight: 800, color: "#1e293b", margin: "0 0 8px" }}>Mi nota y certificado</h3>
                <p style={{ color: "#64748b", marginBottom: 20 }}>Consulta tu nota final y descarga tu certificado si has aprobado el curso.</p>
                <Link href={`/dashboard/clases/${classroomId}/certificado`} style={{ padding: "10px 24px", background: accent, color: "#fff", borderRadius: 10, textDecoration: "none", fontWeight: 700 }}>
                  Ver mi nota y certificado →
                </Link>
              </div>
            )}

          </div>
        </main>
      </div>
    </>
  );
}

function UnitCard({ unit, accent, classroomId, onComplete, completing }: { unit: LearningUnit; accent: string; classroomId: string; onComplete: () => void; completing: boolean }) {
  const done = unit.progress?.[0]?.isCompleted ?? false;
  return (
    <div style={{ background: done ? "#f0fdf4" : "#fff", borderRadius: 8, border: `1px solid ${done ? "#bbf7d0" : "#e2e8f0"}`, padding: "10px 12px", marginBottom: 4 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontSize: "1rem", flexShrink: 0 }}>{UNIT_ICONS[unit.type] ?? "📄"}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: "0.85rem", color: "#1e293b" }}>{unit.title}</div>
          {unit.durationMin && <div style={{ fontSize: "0.7rem", color: "#94a3b8" }}>{unit.durationMin} min</div>}
        </div>
        <div style={{ display: "flex", gap: 6, alignItems: "center", flexShrink: 0 }}>
          {done && <span style={{ color: "#059669", fontWeight: 700, fontSize: "0.78rem" }}>✓</span>}
          <Link href={`/dashboard/clases/${classroomId}/unidad/${unit.id}`}
            style={{ padding: "5px 12px", background: `${accent}15`, color: accent, borderRadius: 7, textDecoration: "none", fontWeight: 700, fontSize: "0.78rem" }}>
            Abrir →
          </Link>
          {!done && (
            <button onClick={onComplete} disabled={completing} style={{ padding: "5px 10px", background: "#059669", color: "#fff", border: "none", borderRadius: 7, cursor: "pointer", fontWeight: 700, fontSize: "0.78rem" }}>
              {completing ? "…" : "✓"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
