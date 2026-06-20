"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import DashboardSidebar from "@/components/layout/DashboardSidebar";
import Navbar from "@/components/layout/Navbar";
import { api } from "@/lib/api";

interface Topic { id: string; title: string; description?: string; sectionId: string }
interface Material { id: string; title: string; type: string; externalUrl?: string; fileName?: string; order: number }
interface Activity { id: string; title: string; description?: string; dueDate?: string; maxScore: number; weight: number; isPublished: boolean; _count: { submissions: number } }
interface Prerequisite { id: string; prerequisiteId: string; prerequisite: { id: string; title: string } }
interface QuizSummary { id: string; title: string; status: string; timeLimit?: number; maxAttempts: number; _count: { questions: number; attempts: number } }

const MATERIAL_TYPES = ["PDF", "WORD", "IMAGE", "VIDEO", "LINK", "OTHER"];

export default function AdminTopicDetailPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const classroomId = params.id as string;
  const topicId = params.topicId as string;

  const [topic, setTopic] = useState<Topic | null>(null);
  const [tab, setTab] = useState<"materials" | "activities" | "quizzes" | "prereqs">("materials");
  const [materials, setMaterials] = useState<Material[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [quizzes, setQuizzes] = useState<QuizSummary[]>([]);
  const [prereqs, setPrereqs] = useState<Prerequisite[]>([]);
  const [fetching, setFetching] = useState(true);

  // Material form
  const [showMatForm, setShowMatForm] = useState(false);
  const [matTitle, setMatTitle] = useState("");
  const [matType, setMatType] = useState("PDF");
  const [matUrl, setMatUrl] = useState("");
  const [savingMat, setSavingMat] = useState(false);

  // Activity form
  const [showActForm, setShowActForm] = useState(false);
  const [actTitle, setActTitle] = useState("");
  const [actDesc, setActDesc] = useState("");
  const [actInstructions, setActInstructions] = useState("");
  const [actDue, setActDue] = useState("");
  const [actMax, setActMax] = useState("10");
  const [actWeight, setActWeight] = useState("1");
  const [savingAct, setSavingAct] = useState(false);

  // Quiz form
  const [showQuizForm, setShowQuizForm] = useState(false);
  const [quizTitle, setQuizTitle] = useState("");
  const [quizDesc, setQuizDesc] = useState("");
  const [quizTime, setQuizTime] = useState("");
  const [quizMax, setQuizMax] = useState("1");
  const [quizPass, setQuizPass] = useState("60");
  const [savingQuiz, setSavingQuiz] = useState(false);

  // Prereq form
  const [prereqId, setPrereqId] = useState("");
  const [savingPrereq, setSavingPrereq] = useState(false);

  useEffect(() => { if (!loading && !user) router.replace("/auth/login"); }, [user, loading]);

  useEffect(() => {
    if (!user) return;
    setFetching(true);
    Promise.all([
      api.get<Topic>(`/classrooms/admin/topics/${topicId}`),
      api.get<Material[]>(`/classrooms/topics/${topicId}/materials`),
      api.get<Activity[]>(`/classrooms/topics/${topicId}/activities`),
      api.get<QuizSummary[]>(`/classrooms/classrooms/${classroomId}/quizzes`),
      api.get<Prerequisite[]>(`/classrooms/topics/${topicId}/prerequisites`),
    ]).then(([t, mats, acts, qs, pqs]) => {
      setTopic(t);
      setMaterials(mats);
      setActivities(acts);
      setQuizzes(qs.filter((q) => q !== null));
      setPrereqs(pqs);
    }).catch(() => {}).finally(() => setFetching(false));
  }, [user, topicId, classroomId]);

  async function saveMaterial() {
    if (!matTitle.trim()) return;
    setSavingMat(true);
    const m = await api.post<Material>(`/classrooms/topics/${topicId}/materials`, { title: matTitle.trim(), type: matType, externalUrl: matUrl || undefined }).catch(() => null);
    if (m) { setMaterials((p) => [...p, m]); setMatTitle(""); setMatUrl(""); setShowMatForm(false); }
    setSavingMat(false);
  }

  async function deleteMaterial(id: string) {
    if (!confirm("¿Eliminar material?")) return;
    await api.delete(`/classrooms/topic-materials/${id}`).catch(() => {});
    setMaterials((p) => p.filter((m) => m.id !== id));
  }

  async function saveActivity() {
    if (!actTitle.trim()) return;
    setSavingAct(true);
    const a = await api.post<Activity>(`/classrooms/topics/${topicId}/activities`, {
      title: actTitle.trim(), description: actDesc || undefined, instructions: actInstructions || undefined,
      dueDate: actDue || undefined, maxScore: parseFloat(actMax) || 10, weight: parseFloat(actWeight) || 1,
    }).catch(() => null);
    if (a) { setActivities((p) => [...p, { ...a, _count: { submissions: 0 } }]); setActTitle(""); setActDesc(""); setActInstructions(""); setActDue(""); setShowActForm(false); }
    setSavingAct(false);
  }

  async function toggleActivity(act: Activity) {
    const updated = await api.patch<Activity>(`/classrooms/topic-activities/${act.id}`, { isPublished: !act.isPublished }).catch(() => null);
    if (updated) setActivities((p) => p.map((a) => a.id === act.id ? { ...a, isPublished: !a.isPublished } : a));
  }

  async function deleteActivity(id: string) {
    if (!confirm("¿Eliminar actividad?")) return;
    await api.delete(`/classrooms/topic-activities/${id}`).catch(() => {});
    setActivities((p) => p.filter((a) => a.id !== id));
  }

  async function saveQuiz() {
    if (!quizTitle.trim()) return;
    setSavingQuiz(true);
    const q = await api.post<QuizSummary>(`/classrooms/classrooms/${classroomId}/quizzes`, {
      topicId, title: quizTitle.trim(), description: quizDesc || undefined,
      timeLimit: quizTime ? parseInt(quizTime) : undefined, maxAttempts: parseInt(quizMax) || 1, passingScore: parseFloat(quizPass) || 60,
    }).catch(() => null);
    if (q) { setQuizzes((p) => [...p, { ...q, _count: { questions: 0, attempts: 0 } }]); setQuizTitle(""); setQuizDesc(""); setShowQuizForm(false); }
    setSavingQuiz(false);
  }

  async function addPrereq() {
    if (!prereqId.trim()) return;
    setSavingPrereq(true);
    const p = await api.post<Prerequisite>(`/classrooms/topics/${topicId}/prerequisites`, { prerequisiteId: prereqId.trim() }).catch(() => null);
    if (p) { setPrereqs((prev) => [...prev, p]); setPrereqId(""); }
    setSavingPrereq(false);
  }

  async function removePrereq(prerequisiteId: string) {
    await api.delete(`/classrooms/topics/${topicId}/prerequisites/${prerequisiteId}`).catch(() => {});
    setPrereqs((p) => p.filter((r) => r.prerequisiteId !== prerequisiteId));
  }

  if (loading || fetching) return null;

  const tabStyle = (t: string) => ({
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
              <h1 style={{ fontFamily: "var(--font-poppins)", fontWeight: 800, fontSize: "1.4rem", color: "#1e293b", margin: "8px 0 4px" }}>
                📚 {topic?.title ?? "Tema"}
              </h1>
              {topic?.description && <p style={{ color: "#64748b", fontSize: "0.875rem", margin: 0 }}>{topic.description}</p>}
            </div>

            <div style={{ display: "flex", gap: 4, marginBottom: 0, borderBottom: "2px solid #e2e8f0" }}>
              {(["materials", "activities", "quizzes", "prereqs"] as const).map((t) => (
                <button key={t} style={tabStyle(t)} onClick={() => setTab(t)}>
                  {t === "materials" ? "📎 Materiales" : t === "activities" ? "📝 Tareas" : t === "quizzes" ? "🧪 Quizzes" : "🔗 Prerrequisitos"}
                </button>
              ))}
            </div>

            <div style={{ background: "#fff", borderRadius: "0 8px 8px 8px", border: "1px solid #e2e8f0", padding: 20 }}>

              {/* MATERIALS */}
              {tab === "materials" && (
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                    <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 700 }}>Materiales del tema</h3>
                    <button onClick={() => setShowMatForm(!showMatForm)} style={{ padding: "7px 14px", background: "#004aad", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 700, fontSize: "0.82rem" }}>+ Material</button>
                  </div>
                  {showMatForm && (
                    <div style={{ background: "#f0f4ff", borderRadius: 10, padding: 16, border: "1px solid #c7d7f0", marginBottom: 16 }}>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
                        <input placeholder="Título *" value={matTitle} onChange={(e) => setMatTitle(e.target.value)} style={inputStyle} />
                        <select value={matType} onChange={(e) => setMatType(e.target.value)} style={inputStyle}>
                          {MATERIAL_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </div>
                      <input placeholder="URL externa (opcional)" value={matUrl} onChange={(e) => setMatUrl(e.target.value)} style={{ ...inputStyle, width: "100%", marginBottom: 10, boxSizing: "border-box" as const }} />
                      <div style={{ display: "flex", gap: 8 }}>
                        <button onClick={saveMaterial} disabled={savingMat} style={btnPrimary}>{savingMat ? "…" : "Guardar"}</button>
                        <button onClick={() => setShowMatForm(false)} style={btnSecondary}>Cancelar</button>
                      </div>
                    </div>
                  )}
                  {materials.length === 0 ? <EmptyState text="Sin materiales aún." /> : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {materials.map((m) => (
                        <div key={m.id} style={cardStyle}>
                          <div style={{ flex: 1 }}>
                            <span style={{ fontWeight: 700, fontSize: "0.875rem" }}>{m.title}</span>
                            <span style={{ marginLeft: 8, padding: "2px 8px", background: "#e0e7ff", color: "#4338ca", borderRadius: 10, fontSize: "0.7rem", fontWeight: 700 }}>{m.type}</span>
                            {m.externalUrl && <a href={m.externalUrl} target="_blank" rel="noreferrer" style={{ marginLeft: 8, fontSize: "0.72rem", color: "#004aad" }}>Ver enlace</a>}
                          </div>
                          <button onClick={() => deleteMaterial(m.id)} style={btnDanger}>Eliminar</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ACTIVITIES */}
              {tab === "activities" && (
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                    <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 700 }}>Tareas / Actividades</h3>
                    <button onClick={() => setShowActForm(!showActForm)} style={{ padding: "7px 14px", background: "#004aad", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 700, fontSize: "0.82rem" }}>+ Tarea</button>
                  </div>
                  {showActForm && (
                    <div style={{ background: "#f0f4ff", borderRadius: 10, padding: 16, border: "1px solid #c7d7f0", marginBottom: 16 }}>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 10 }}>
                        <input placeholder="Título *" value={actTitle} onChange={(e) => setActTitle(e.target.value)} style={inputStyle} />
                        <input placeholder="Nota máxima" type="number" value={actMax} onChange={(e) => setActMax(e.target.value)} style={inputStyle} />
                        <input placeholder="Peso" type="number" step="0.1" value={actWeight} onChange={(e) => setActWeight(e.target.value)} style={inputStyle} />
                      </div>
                      <input placeholder="Fecha límite (ISO)" type="datetime-local" value={actDue} onChange={(e) => setActDue(e.target.value)} style={{ ...inputStyle, width: "100%", marginBottom: 10, boxSizing: "border-box" as const }} />
                      <textarea placeholder="Descripción" value={actDesc} onChange={(e) => setActDesc(e.target.value)} rows={2} style={{ ...inputStyle, width: "100%", marginBottom: 10, boxSizing: "border-box" as const, resize: "vertical" }} />
                      <textarea placeholder="Instrucciones" value={actInstructions} onChange={(e) => setActInstructions(e.target.value)} rows={3} style={{ ...inputStyle, width: "100%", marginBottom: 10, boxSizing: "border-box" as const, resize: "vertical" }} />
                      <div style={{ display: "flex", gap: 8 }}>
                        <button onClick={saveActivity} disabled={savingAct} style={btnPrimary}>{savingAct ? "…" : "Guardar"}</button>
                        <button onClick={() => setShowActForm(false)} style={btnSecondary}>Cancelar</button>
                      </div>
                    </div>
                  )}
                  {activities.length === 0 ? <EmptyState text="Sin tareas aún." /> : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {activities.map((a) => (
                        <div key={a.id} style={cardStyle}>
                          <div style={{ flex: 1 }}>
                            <span style={{ fontWeight: 700, fontSize: "0.875rem" }}>{a.title}</span>
                            <span style={{ marginLeft: 8, padding: "2px 8px", background: a.isPublished ? "#dcfce7" : "#fef3c7", color: a.isPublished ? "#166534" : "#92400e", borderRadius: 10, fontSize: "0.7rem", fontWeight: 700 }}>{a.isPublished ? "Publicada" : "Borrador"}</span>
                            <div style={{ fontSize: "0.72rem", color: "#94a3b8", marginTop: 2 }}>Nota máx: {a.maxScore} · Peso: {a.weight} · {a._count.submissions} entregas</div>
                            {a.dueDate && <div style={{ fontSize: "0.72rem", color: "#64748b" }}>Vence: {new Date(a.dueDate).toLocaleDateString("es-CO")}</div>}
                          </div>
                          <div style={{ display: "flex", gap: 6 }}>
                            <Link href={`/school-admin/clases/${classroomId}/tarea/${a.id}`} style={{ padding: "4px 10px", background: "#e0e7ff", color: "#4338ca", border: "none", borderRadius: 6, cursor: "pointer", fontSize: "0.72rem", fontWeight: 700, textDecoration: "none" }}>Ver entregas</Link>
                            <button onClick={() => toggleActivity(a)} style={{ padding: "4px 10px", background: "#f1f5f9", border: "1px solid #e2e8f0", borderRadius: 6, cursor: "pointer", fontSize: "0.72rem", color: "#64748b" }}>{a.isPublished ? "Ocultar" : "Publicar"}</button>
                            <button onClick={() => deleteActivity(a.id)} style={btnDanger}>Eliminar</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* QUIZZES */}
              {tab === "quizzes" && (
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                    <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 700 }}>Quizzes del tema</h3>
                    <button onClick={() => setShowQuizForm(!showQuizForm)} style={{ padding: "7px 14px", background: "#004aad", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 700, fontSize: "0.82rem" }}>+ Quiz</button>
                  </div>
                  {showQuizForm && (
                    <div style={{ background: "#f0f4ff", borderRadius: 10, padding: 16, border: "1px solid #c7d7f0", marginBottom: 16 }}>
                      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: 10, marginBottom: 10 }}>
                        <input placeholder="Título *" value={quizTitle} onChange={(e) => setQuizTitle(e.target.value)} style={inputStyle} />
                        <input placeholder="Tiempo (min)" type="number" value={quizTime} onChange={(e) => setQuizTime(e.target.value)} style={inputStyle} />
                        <input placeholder="Intentos máx" type="number" value={quizMax} onChange={(e) => setQuizMax(e.target.value)} style={inputStyle} />
                        <input placeholder="Nota mínima %" type="number" value={quizPass} onChange={(e) => setQuizPass(e.target.value)} style={inputStyle} />
                      </div>
                      <textarea placeholder="Descripción" value={quizDesc} onChange={(e) => setQuizDesc(e.target.value)} rows={2} style={{ ...inputStyle, width: "100%", marginBottom: 10, boxSizing: "border-box" as const, resize: "vertical" }} />
                      <div style={{ display: "flex", gap: 8 }}>
                        <button onClick={saveQuiz} disabled={savingQuiz} style={btnPrimary}>{savingQuiz ? "…" : "Crear Quiz"}</button>
                        <button onClick={() => setShowQuizForm(false)} style={btnSecondary}>Cancelar</button>
                      </div>
                    </div>
                  )}
                  {quizzes.filter((q) => !q || !q.title || (q as any).topicId === topicId || !(q as any).topicId).length === 0 ? <EmptyState text="Sin quizzes aún." /> : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {quizzes.map((q) => (
                        <div key={q.id} style={cardStyle}>
                          <div style={{ flex: 1 }}>
                            <span style={{ fontWeight: 700, fontSize: "0.875rem" }}>{q.title}</span>
                            <span style={{ marginLeft: 8, padding: "2px 8px", background: q.status === "PUBLISHED" ? "#dcfce7" : "#fef3c7", color: q.status === "PUBLISHED" ? "#166534" : "#92400e", borderRadius: 10, fontSize: "0.7rem", fontWeight: 700 }}>{q.status}</span>
                            <div style={{ fontSize: "0.72rem", color: "#94a3b8", marginTop: 2 }}>{q._count.questions} preguntas · {q._count.attempts} intentos · {q.timeLimit ? `${q.timeLimit} min` : "Sin límite"}</div>
                          </div>
                          <Link href={`/school-admin/clases/${classroomId}/quiz/${q.id}`} style={{ padding: "4px 10px", background: "#e0e7ff", color: "#4338ca", border: "none", borderRadius: 6, cursor: "pointer", fontSize: "0.72rem", fontWeight: 700, textDecoration: "none" }}>Editar</Link>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* PREREQUISITES */}
              {tab === "prereqs" && (
                <div>
                  <h3 style={{ margin: "0 0 16px", fontSize: "1rem", fontWeight: 700 }}>Prerrequisitos</h3>
                  <div style={{ background: "#f0f4ff", borderRadius: 10, padding: 14, border: "1px solid #c7d7f0", marginBottom: 16 }}>
                    <p style={{ margin: "0 0 10px", fontSize: "0.82rem", color: "#475569" }}>
                      Ingresa el ID de otro tema que los estudiantes deben completar antes de acceder a este.
                    </p>
                    <div style={{ display: "flex", gap: 8 }}>
                      <input placeholder="ID del tema prerrequisito" value={prereqId} onChange={(e) => setPrereqId(e.target.value)} style={{ ...inputStyle, flex: 1 }} />
                      <button onClick={addPrereq} disabled={savingPrereq} style={btnPrimary}>{savingPrereq ? "…" : "Agregar"}</button>
                    </div>
                  </div>
                  {prereqs.length === 0 ? <EmptyState text="Sin prerrequisitos. Este tema es accesible desde el inicio." /> : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {prereqs.map((r) => (
                        <div key={r.id} style={cardStyle}>
                          <div style={{ flex: 1 }}>
                            <span style={{ fontWeight: 700, fontSize: "0.875rem" }}>{r.prerequisite.title}</span>
                            <span style={{ marginLeft: 8, fontSize: "0.72rem", color: "#94a3b8" }}>ID: {r.prerequisiteId}</span>
                          </div>
                          <button onClick={() => removePrereq(r.prerequisiteId)} style={btnDanger}>Quitar</button>
                        </div>
                      ))}
                    </div>
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

function EmptyState({ text }: { text: string }) {
  return <div style={{ textAlign: "center", padding: "32px 0", color: "#94a3b8", fontSize: "0.85rem" }}>{text}</div>;
}

const inputStyle: React.CSSProperties = { padding: "8px 10px", borderRadius: 8, border: "1.5px solid #c7d7f0", fontSize: "0.82rem" };
const btnPrimary: React.CSSProperties = { padding: "8px 18px", background: "#004aad", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 700, fontSize: "0.82rem" };
const btnSecondary: React.CSSProperties = { padding: "8px 12px", background: "#f1f5f9", border: "none", borderRadius: 8, cursor: "pointer", color: "#64748b", fontSize: "0.82rem" };
const btnDanger: React.CSSProperties = { padding: "4px 10px", border: "1px solid #fee2e2", borderRadius: 6, background: "#fff", cursor: "pointer", fontSize: "0.72rem", color: "#dc2626" };
const cardStyle: React.CSSProperties = { display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", background: "#f8fafc", borderRadius: 10, border: "1px solid #e2e8f0" };
