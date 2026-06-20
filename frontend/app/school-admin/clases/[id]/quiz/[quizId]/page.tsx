"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import DashboardSidebar from "@/components/layout/DashboardSidebar";
import Navbar from "@/components/layout/Navbar";
import { api } from "@/lib/api";

interface QuizOption { id: string; content: string; isCorrect: boolean; order: number }
interface QuizQuestion { id: string; content: string; explanation?: string; points: number; order: number; options: QuizOption[] }
interface Quiz {
  id: string; classroomId: string; topicId?: string; title: string; description?: string; instructions?: string;
  timeLimit?: number; maxAttempts: number; passingScore: number; weight: number; shuffleQuestions: boolean;
  showResults: boolean; status: string; dueDate?: string; availableFrom?: string;
  questions: QuizQuestion[];
}

export default function AdminQuizEditorPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const classroomId = params.id as string;
  const quizId = params.quizId as string;

  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [fetching, setFetching] = useState(true);
  const [saving, setSaving] = useState(false);

  // Quiz meta edit
  const [editMeta, setEditMeta] = useState(false);
  const [metaTitle, setMetaTitle] = useState("");
  const [metaDesc, setMetaDesc] = useState("");
  const [metaTime, setMetaTime] = useState("");
  const [metaMax, setMetaMax] = useState("1");
  const [metaPass, setMetaPass] = useState("60");
  const [metaStatus, setMetaStatus] = useState("DRAFT");

  // New question form
  const [showQForm, setShowQForm] = useState(false);
  const [qContent, setQContent] = useState("");
  const [qExplanation, setQExplanation] = useState("");
  const [qPoints, setQPoints] = useState("1");
  const [options, setOptions] = useState([
    { content: "", isCorrect: false },
    { content: "", isCorrect: false },
    { content: "", isCorrect: false },
    { content: "", isCorrect: false },
  ]);
  const [savingQ, setSavingQ] = useState(false);

  useEffect(() => { if (!loading && !user) router.replace("/auth/login"); }, [user, loading]);

  useEffect(() => {
    if (!user) return;
    api.get<Quiz>(`/classrooms/quizzes/${quizId}`)
      .then((q) => { setQuiz(q); setMetaTitle(q.title); setMetaDesc(q.description ?? ""); setMetaTime(q.timeLimit?.toString() ?? ""); setMetaMax(q.maxAttempts.toString()); setMetaPass(q.passingScore.toString()); setMetaStatus(q.status); })
      .catch(() => {})
      .finally(() => setFetching(false));
  }, [user, quizId]);

  async function saveMeta() {
    setSaving(true);
    const updated = await api.patch<Quiz>(`/classrooms/quizzes/${quizId}`, {
      title: metaTitle.trim() || undefined, description: metaDesc || undefined,
      timeLimit: metaTime ? parseInt(metaTime) : null, maxAttempts: parseInt(metaMax) || 1,
      passingScore: parseFloat(metaPass) || 60, status: metaStatus,
    }).catch(() => null);
    if (updated) { setQuiz((prev) => prev ? { ...prev, ...updated } : prev); setEditMeta(false); }
    setSaving(false);
  }

  function setCorrect(oi: number) {
    setOptions((prev) => prev.map((o, i) => ({ ...o, isCorrect: i === oi })));
  }

  async function saveQuestion() {
    const filled = options.filter((o) => o.content.trim());
    if (!qContent.trim() || filled.length < 2) return;
    setSavingQ(true);
    const q = await api.post<QuizQuestion>(`/classrooms/quizzes/${quizId}/questions`, {
      content: qContent.trim(), explanation: qExplanation || undefined, points: parseFloat(qPoints) || 1,
      options: filled.map((o, i) => ({ content: o.content.trim(), isCorrect: o.isCorrect, order: i })),
    }).catch(() => null);
    if (q) {
      setQuiz((prev) => prev ? { ...prev, questions: [...prev.questions, q] } : prev);
      setQContent(""); setQExplanation(""); setQPoints("1");
      setOptions([{ content: "", isCorrect: false }, { content: "", isCorrect: false }, { content: "", isCorrect: false }, { content: "", isCorrect: false }]);
      setShowQForm(false);
    }
    setSavingQ(false);
  }

  async function deleteQuestion(qid: string) {
    if (!confirm("¿Eliminar pregunta?")) return;
    await api.delete(`/classrooms/quiz-questions/${qid}`).catch(() => {});
    setQuiz((prev) => prev ? { ...prev, questions: prev.questions.filter((q) => q.id !== qid) } : prev);
  }

  async function publishQuiz() {
    const updated = await api.patch<Quiz>(`/classrooms/quizzes/${quizId}`, { status: "PUBLISHED" }).catch(() => null);
    if (updated) { setQuiz((prev) => prev ? { ...prev, status: "PUBLISHED" } : prev); setMetaStatus("PUBLISHED"); }
  }

  if (loading || fetching || !quiz) return null;

  return (
    <>
      <Navbar />
      <div className="dashboard-layout">
        <DashboardSidebar />
        <main className="dashboard-main">
          <div className="dashboard-content" style={{ maxWidth: 860 }}>
            <div style={{ marginBottom: 16 }}>
              <Link href={`/school-admin/clases/${classroomId}`} style={{ fontSize: "0.875rem", color: "#64748b", textDecoration: "none" }}>← Volver al aula</Link>
            </div>

            {/* Quiz header */}
            <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #e2e8f0", padding: "16px 20px", marginBottom: 20 }}>
              {!editMeta ? (
                <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                      <h1 style={{ fontFamily: "var(--font-poppins)", fontWeight: 800, fontSize: "1.2rem", color: "#1e293b", margin: 0 }}>🧪 {quiz.title}</h1>
                      <span style={{ padding: "2px 10px", background: quiz.status === "PUBLISHED" ? "#dcfce7" : "#fef3c7", color: quiz.status === "PUBLISHED" ? "#166534" : "#92400e", borderRadius: 10, fontSize: "0.7rem", fontWeight: 700 }}>{quiz.status}</span>
                    </div>
                    {quiz.description && <p style={{ margin: "0 0 4px", color: "#64748b", fontSize: "0.875rem" }}>{quiz.description}</p>}
                    <div style={{ fontSize: "0.72rem", color: "#94a3b8" }}>
                      {quiz.timeLimit ? `${quiz.timeLimit} min` : "Sin límite"} · {quiz.maxAttempts} intento(s) · Aprobación: {quiz.passingScore}%
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    {quiz.status !== "PUBLISHED" && (
                      <button onClick={publishQuiz} style={{ padding: "7px 14px", background: "#16a34a", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 700, fontSize: "0.78rem" }}>Publicar</button>
                    )}
                    <button onClick={() => setEditMeta(true)} style={{ padding: "7px 14px", background: "#f1f5f9", border: "1px solid #e2e8f0", borderRadius: 8, cursor: "pointer", fontSize: "0.78rem", color: "#64748b" }}>Editar</button>
                  </div>
                </div>
              ) : (
                <div>
                  <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr", gap: 10, marginBottom: 10 }}>
                    <input value={metaTitle} onChange={(e) => setMetaTitle(e.target.value)} placeholder="Título" style={inputStyle} />
                    <input value={metaTime} onChange={(e) => setMetaTime(e.target.value)} placeholder="Tiempo (min)" type="number" style={inputStyle} />
                    <input value={metaMax} onChange={(e) => setMetaMax(e.target.value)} placeholder="Intentos" type="number" style={inputStyle} />
                    <input value={metaPass} onChange={(e) => setMetaPass(e.target.value)} placeholder="% Aprobación" type="number" style={inputStyle} />
                    <select value={metaStatus} onChange={(e) => setMetaStatus(e.target.value)} style={inputStyle}>
                      <option value="DRAFT">DRAFT</option>
                      <option value="PUBLISHED">PUBLISHED</option>
                      <option value="ARCHIVED">ARCHIVED</option>
                    </select>
                  </div>
                  <textarea value={metaDesc} onChange={(e) => setMetaDesc(e.target.value)} placeholder="Descripción" rows={2} style={{ ...inputStyle, width: "100%", marginBottom: 10, boxSizing: "border-box" as const, resize: "vertical" }} />
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={saveMeta} disabled={saving} style={btnPrimary}>{saving ? "…" : "Guardar"}</button>
                    <button onClick={() => setEditMeta(false)} style={btnSecondary}>Cancelar</button>
                  </div>
                </div>
              )}
            </div>

            {/* Questions */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <h2 style={{ margin: 0, fontSize: "1rem", fontWeight: 700 }}>Preguntas ({quiz.questions.length})</h2>
              <button onClick={() => setShowQForm(!showQForm)} style={{ padding: "7px 14px", background: "#004aad", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 700, fontSize: "0.82rem" }}>+ Pregunta</button>
            </div>

            {showQForm && (
              <div style={{ background: "#f0f4ff", borderRadius: 12, padding: 18, border: "1px solid #c7d7f0", marginBottom: 16 }}>
                <textarea placeholder="Enunciado de la pregunta *" value={qContent} onChange={(e) => setQContent(e.target.value)} rows={3} style={{ ...inputStyle, width: "100%", marginBottom: 10, boxSizing: "border-box" as const, resize: "vertical" }} />
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "#374151", marginBottom: 8 }}>Opciones (marca la correcta):</div>
                  {options.map((o, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                      <input type="radio" name="correct" checked={o.isCorrect} onChange={() => setCorrect(i)} />
                      <input
                        placeholder={`Opción ${i + 1}`}
                        value={o.content}
                        onChange={(e) => setOptions((prev) => prev.map((op, j) => j === i ? { ...op, content: e.target.value } : op))}
                        style={{ ...inputStyle, flex: 1 }}
                      />
                    </div>
                  ))}
                </div>
                <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 10 }}>
                  <input placeholder="Puntos" type="number" step="0.5" value={qPoints} onChange={(e) => setQPoints(e.target.value)} style={{ ...inputStyle, width: 90 }} />
                  <textarea placeholder="Explicación (opcional)" value={qExplanation} onChange={(e) => setQExplanation(e.target.value)} rows={2} style={{ ...inputStyle, flex: 1, resize: "vertical" }} />
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={saveQuestion} disabled={savingQ} style={btnPrimary}>{savingQ ? "…" : "Agregar pregunta"}</button>
                  <button onClick={() => setShowQForm(false)} style={btnSecondary}>Cancelar</button>
                </div>
              </div>
            )}

            {quiz.questions.length === 0 ? (
              <div style={{ textAlign: "center", padding: "32px 0", color: "#94a3b8", fontSize: "0.85rem" }}>Sin preguntas aún. ¡Agrega la primera!</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {quiz.questions.map((q, qi) => (
                  <div key={q.id} style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", padding: "14px 16px" }}>
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                      <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#e0e7ff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: "0.8rem", color: "#4338ca", flexShrink: 0 }}>{qi + 1}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: "0.88rem", color: "#1e293b", marginBottom: 8 }}>{q.content}</div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                          {q.options.map((o) => (
                            <div key={o.id} style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 10px", borderRadius: 7, background: o.isCorrect ? "#dcfce7" : "#f8fafc", border: `1px solid ${o.isCorrect ? "#86efac" : "#e2e8f0"}` }}>
                              {o.isCorrect ? "✅" : "⬜"} <span style={{ fontSize: "0.82rem", color: o.isCorrect ? "#166534" : "#374151" }}>{o.content}</span>
                            </div>
                          ))}
                        </div>
                        {q.explanation && <div style={{ marginTop: 8, padding: "6px 10px", background: "#f0f9ff", borderRadius: 8, fontSize: "0.78rem", color: "#0369a1" }}>💡 {q.explanation}</div>}
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
                        <span style={{ fontSize: "0.72rem", color: "#94a3b8" }}>{q.points} pt{q.points !== 1 ? "s" : ""}</span>
                        <button onClick={() => deleteQuestion(q.id)} style={btnDanger}>Eliminar</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </>
  );
}

const inputStyle: React.CSSProperties = { padding: "8px 10px", borderRadius: 8, border: "1.5px solid #c7d7f0", fontSize: "0.82rem" };
const btnPrimary: React.CSSProperties = { padding: "8px 18px", background: "#004aad", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 700, fontSize: "0.82rem" };
const btnSecondary: React.CSSProperties = { padding: "8px 12px", background: "#f1f5f9", border: "none", borderRadius: 8, cursor: "pointer", color: "#64748b", fontSize: "0.82rem" };
const btnDanger: React.CSSProperties = { padding: "4px 10px", border: "1px solid #fee2e2", borderRadius: 6, background: "#fff", cursor: "pointer", fontSize: "0.72rem", color: "#dc2626" };
