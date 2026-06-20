"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

interface Material  { id: string; title: string; type: string; externalUrl?: string; description?: string }
interface Submission { id: string; status: string; score?: number; submittedAt?: string; feedback?: string }
interface Activity  { id: string; title: string; description?: string; dueDate?: string; maxScore: number; submissions: Submission[] }
interface QOption   { id: string; content: string; order: number }
interface QQuestion { id: string; content: string; points: number; order: number; options: QOption[] }
interface QuizCard  { id: string; title: string; timeLimit?: number; maxAttempts: number; passingScore: number; questions: { id: string }[]; attempts: { id: string; status: string; score?: number }[] }
interface QuizFull  { id: string; title: string; description?: string; instructions?: string; timeLimit?: number; maxAttempts: number; passingScore: number; showResults: boolean; questions: QQuestion[] }
interface Forum     { id: string; title: string; description?: string; isLocked: boolean; threads: { id: string }[] }
interface ForumPost { id: string; content: string; createdAt: string; author: { id: string; firstName: string; lastName: string; role: string }; replies: ForumPost[] }
interface AttemptResult { id: string; score?: number; passed?: boolean; answers?: { questionId: string; isCorrect: boolean; question: { content: string; explanation?: string; options: { id: string; content: string; isCorrect: boolean }[] } }[] }

const MAT_ICON: Record<string, string> = { PDF: "📄", VIDEO_YOUTUBE: "▶️", VIDEO_VIMEO: "▶️", LINK: "🔗", FILE: "📎", IMAGE: "🖼️", PRESENTATION: "📊", WORD: "📝", EXCEL: "📊" };
const fmt = (s: number) => `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;

/* ── Inline Forum ── */
function InlineForum({ forum, userId }: { forum: Forum; userId?: string }) {
  const [threads, setThreads] = useState<any[]>([]);
  const [activeThread, setActiveThread] = useState<any>(null);
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [newThread, setNewThread] = useState("");
  const [newPost, setNewPost] = useState("");
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  async function load() {
    const t = await api.get<any[]>(`/classrooms/forums/${forum.id}/threads`).catch(() => []);
    setThreads(t); setLoaded(true);
  }
  async function openThread(t: any) {
    setActiveThread(t);
    const p = await api.get<ForumPost[]>(`/classrooms/threads/${t.id}/posts`).catch(() => []);
    setPosts(p);
  }
  async function createThread() {
    if (!newThread.trim()) return;
    setSaving(true);
    const t = await api.post<any>(`/classrooms/forums/${forum.id}/threads`, { title: newThread.trim() }).catch(() => null);
    if (t) { setThreads(prev => [...prev, { ...t, _count: { posts: 0 } }]); setNewThread(""); }
    setSaving(false);
  }
  async function createPost() {
    if (!newPost.trim() || !activeThread) return;
    setSaving(true);
    await api.post(`/classrooms/threads/${activeThread.id}/posts`, { content: newPost.trim() }).catch(() => null);
    const p = await api.get<ForumPost[]>(`/classrooms/threads/${activeThread.id}/posts`).catch(() => []);
    setPosts(p); setNewPost("");
    setSaving(false);
  }

  if (!loaded) return (
    <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", padding: "16px" }}>
      <div style={{ fontWeight: 700, marginBottom: 10 }}>💬 {forum.title}</div>
      {forum.description && <div style={{ fontSize: "0.78rem", color: "#64748b", marginBottom: 10 }}>{forum.description}</div>}
      <button onClick={load} style={{ padding: "7px 16px", background: "#004aad", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 700, fontSize: "0.82rem" }}>Ver hilos ({forum.threads.length})</button>
    </div>
  );

  return (
    <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", padding: "16px" }}>
      <div style={{ fontWeight: 700, marginBottom: 10 }}>💬 {forum.title}</div>
      <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", gap: 12 }}>
        {/* Thread list */}
        <div>
          <input value={newThread} onChange={e => setNewThread(e.target.value)} placeholder="Nuevo hilo..."
            style={{ width: "100%", padding: "6px 8px", borderRadius: 7, border: "1px solid #e2e8f0", fontSize: "0.78rem", marginBottom: 6, boxSizing: "border-box" as const }} />
          <button onClick={createThread} disabled={saving || !newThread.trim()}
            style={{ width: "100%", padding: "6px", background: "#004aad", color: "#fff", border: "none", borderRadius: 7, cursor: "pointer", fontWeight: 700, fontSize: "0.75rem", marginBottom: 8 }}>
            + Crear hilo
          </button>
          {threads.length === 0
            ? <div style={{ color: "#94a3b8", fontSize: "0.75rem", textAlign: "center" }}>Sin hilos aún</div>
            : threads.map(t => (
              <div key={t.id} onClick={() => openThread(t)}
                style={{ padding: "8px 10px", borderRadius: 8, border: activeThread?.id === t.id ? "2px solid #004aad" : "1px solid #e2e8f0", background: activeThread?.id === t.id ? "#f0f4ff" : "#fafafa", cursor: "pointer", marginBottom: 4 }}>
                <div style={{ fontWeight: 600, fontSize: "0.78rem", color: "#1e293b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.title}</div>
                <div style={{ fontSize: "0.68rem", color: "#94a3b8" }}>{t._count?.posts ?? 0} mensaje(s)</div>
              </div>
            ))
          }
        </div>
        {/* Posts */}
        <div>
          {!activeThread
            ? <div style={{ color: "#94a3b8", fontSize: "0.82rem", textAlign: "center", padding: "24px 0" }}>Selecciona un hilo</div>
            : (
              <>
                <div style={{ maxHeight: 260, overflowY: "auto", display: "flex", flexDirection: "column", gap: 8, marginBottom: 10 }}>
                  {posts.length === 0
                    ? <div style={{ color: "#94a3b8", fontSize: "0.78rem", textAlign: "center", padding: "16px 0" }}>Sin mensajes aún</div>
                    : posts.map(p => (
                      <div key={p.id} style={{ background: "#f8fafc", borderRadius: 8, padding: "8px 10px", border: "1px solid #e2e8f0" }}>
                        <div style={{ fontWeight: 700, fontSize: "0.75rem", color: "#1e293b" }}>{p.author.firstName} {p.author.lastName}</div>
                        <div style={{ fontSize: "0.8rem", color: "#374151", marginTop: 3, whiteSpace: "pre-wrap" }}>{p.content}</div>
                      </div>
                    ))
                  }
                </div>
                {!forum.isLocked && (
                  <div style={{ display: "flex", gap: 6 }}>
                    <input value={newPost} onChange={e => setNewPost(e.target.value)} placeholder="Escribe un mensaje..."
                      style={{ flex: 1, padding: "7px 10px", borderRadius: 7, border: "1px solid #e2e8f0", fontSize: "0.78rem" }} />
                    <button onClick={createPost} disabled={saving || !newPost.trim()}
                      style={{ padding: "7px 14px", background: "#004aad", color: "#fff", border: "none", borderRadius: 7, cursor: "pointer", fontWeight: 700, fontSize: "0.78rem" }}>
                      Enviar
                    </button>
                  </div>
                )}
              </>
            )}
        </div>
      </div>
    </div>
  );
}

/* ── Main component ── */
export default function ResourceAcademicContent({ resourceId, slug, userId }: { resourceId: string; slug: string; userId?: string }) {
  const [content, setContent]   = useState<{ materials: Material[]; activities: Activity[]; quizzes: QuizCard[]; forums: Forum[] } | null>(null);
  const [loading, setLoading]   = useState(false);
  const [tab, setTab]           = useState<"pruebas" | "materiales" | "foros" | "tareas">("pruebas");

  /* Quiz state */
  const [quizFull, setQuizFull]         = useState<QuizFull | null>(null);
  const [prevAttempts, setPrevAttempts] = useState<any[]>([]);
  const [attempt, setAttempt]           = useState<{ id: string } | null>(null);
  const [answers, setAnswers]           = useState<Record<string, string>>({});
  const [currentQ, setCurrentQ]         = useState(0);
  const [result, setResult]             = useState<AttemptResult | null>(null);
  const [phase, setPhase]               = useState<"idle" | "loading" | "start" | "taking" | "submitting" | "done">("idle");
  const [timeLeft, setTimeLeft]         = useState<number | null>(null);
  const [quizError, setQuizError]       = useState<string | null>(null);

  useEffect(() => {
    setContent(null); setQuizFull(null); setAttempt(null); setResult(null); setPhase("idle"); setQuizError(null);
    setLoading(true);
    api.get<any>(`/resources/${resourceId}/student`)
      .then(d => {
        const c = { materials: d.materials ?? [], activities: d.activities ?? [], quizzes: d.quizzes ?? [], forums: d.forums ?? [] };
        setContent(c);
        if (c.quizzes.length > 0)         setTab("pruebas");
        else if (c.materials.length > 0)  setTab("materiales");
        else if (c.forums.length > 0)     setTab("foros");
        else if (c.activities.length > 0) setTab("tareas");
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [resourceId]);

  /* Timer */
  useEffect(() => {
    if (phase !== "taking" || timeLeft == null) return;
    if (timeLeft <= 0) { handleSubmit(); return; }
    const id = setInterval(() => setTimeLeft(p => (p ?? 1) - 1), 1000);
    return () => clearInterval(id);
  }, [phase, timeLeft]);

  async function openQuiz(quizId: string) {
    setPhase("loading"); setResult(null);
    const [full, atts] = await Promise.all([
      api.get<QuizFull>(`/classrooms/quizzes/${quizId}/student`).catch(() => null),
      api.get<any[]>(`/classrooms/quizzes/${quizId}/my-attempts`).catch(() => []),
    ]);
    if (!full) { setPhase("idle"); return; }
    setQuizFull(full); setPrevAttempts(atts); setPhase("start");
  }

  async function startQuiz() {
    if (!quizFull) return;
    setPhase("loading"); setQuizError(null);
    try {
      const a = await api.post<{ id: string }>(`/classrooms/quizzes/${quizFull.id}/start`, {});
      setAttempt(a); setAnswers({}); setCurrentQ(0);
      if (quizFull.timeLimit) setTimeLeft(quizFull.timeLimit * 60);
      setPhase("taking");
    } catch (e: any) {
      setQuizError(e?.message ?? "No se pudo iniciar la prueba");
      setPhase("start");
    }
  }

  async function handleSubmit() {
    if (!attempt || !quizFull) return;
    setPhase("submitting");
    const payload = Object.entries(answers).map(([questionId, selectedOptionId]) => ({ questionId, selectedOptionId }));
    const res = await api.post<any>(`/classrooms/quiz-attempts/${attempt.id}/submit`, { answers: payload }).catch(() => null);
    if (res) { setResult(res); setPrevAttempts(p => [res, ...p]); }
    setAttempt(null); setPhase("done");
  }

  if (loading) return <div style={{ padding: "16px 0", color: "#94a3b8", fontSize: "0.82rem" }}>Cargando contenido de la lección…</div>;
  if (!content) return null;

  const { materials, activities, quizzes, forums } = content;
  if (!materials.length && !activities.length && !quizzes.length && !forums.length) return null;

  const tabs = [
    ...(quizzes.length    ? [{ id: "pruebas"    as const, label: `🧪 Pruebas (${quizzes.length})` }]    : []),
    ...(materials.length  ? [{ id: "materiales" as const, label: `📁 Materiales (${materials.length})` }] : []),
    ...(forums.length     ? [{ id: "foros"      as const, label: `💬 Foros (${forums.length})` }]         : []),
    ...(activities.length ? [{ id: "tareas"     as const, label: `📋 Tareas (${activities.length})` }]    : []),
  ];

  return (
    <div style={{ borderTop: "2px solid #e8eef8", paddingTop: 20, marginTop: 20 }}>
      <div style={{ fontWeight: 700, fontSize: "0.78rem", color: "#475569", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>
        Actividades de esta lección
      </div>

      {/* Tab bar */}
      <div style={{ display: "flex", gap: 4, marginBottom: 16, background: "#f1f5f9", borderRadius: 10, padding: 4 }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => { setTab(t.id); setPhase("idle"); setQuizFull(null); setResult(null); }}
            style={{ flex: 1, padding: "7px 6px", border: "none", borderRadius: 8, cursor: "pointer", fontSize: "0.76rem", fontWeight: tab === t.id ? 700 : 500, background: tab === t.id ? "#fff" : "transparent", color: tab === t.id ? "#004aad" : "#64748b", boxShadow: tab === t.id ? "0 1px 4px #0001" : "none" }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── PRUEBAS ── */}
      {tab === "pruebas" && (
        <div>
          {/* Quiz list */}
          {phase === "idle" && quizzes.map(q => {
            const atts = q.attempts ?? [];
            const best = atts.find((a: any) => a.status === "COMPLETED");
            return (
              <div key={q.id} style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", padding: "14px 18px", marginBottom: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: "0.92rem", color: "#1e293b" }}>🧪 {q.title}</div>
                    <div style={{ fontSize: "0.72rem", color: "#94a3b8", marginTop: 3 }}>
                      {q.questions.length} preguntas · {q.timeLimit ? `${q.timeLimit} min` : "Sin límite"} · Pasa con {q.passingScore}%
                    </div>
                    {best?.score != null && <div style={{ fontSize: "0.72rem", color: "#15803d", marginTop: 2 }}>Mejor: {best.score.toFixed(0)}%</div>}
                  </div>
                  <button onClick={() => openQuiz(q.id)} style={{ padding: "8px 18px", background: "#004aad", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 700, fontSize: "0.82rem", flexShrink: 0 }}>
                    Comenzar →
                  </button>
                </div>
              </div>
            );
          })}

          {phase === "loading" && <div style={{ textAlign: "center", padding: 24, color: "#94a3b8" }}>Cargando prueba…</div>}

          {/* Start / Result screen */}
          {(phase === "start" || phase === "done") && quizFull && (
            <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #e2e8f0", padding: "22px 24px" }}>
              {result && (
                <div style={{ textAlign: "center", marginBottom: 20 }}>
                  <div style={{ fontSize: "2.5rem", marginBottom: 6 }}>{result.passed ? "🎉" : "😔"}</div>
                  <div style={{ fontWeight: 800, fontSize: "1.2rem", color: result.passed ? "#166534" : "#dc2626" }}>{result.passed ? "¡Aprobado!" : "No aprobado"}</div>
                  <div style={{ color: "#374151", marginTop: 4 }}>{(result as any).score?.toFixed(1)}% — Mínimo: {quizFull.passingScore}%</div>
                </div>
              )}
              {result?.answers && quizFull.showResults && (
                <div style={{ marginBottom: 20 }}>
                  {result.answers.map((ans, i) => (
                    <div key={ans.questionId} style={{ background: "#f8fafc", borderRadius: 10, border: `1px solid ${ans.isCorrect ? "#86efac" : "#fca5a5"}`, padding: "12px 14px", marginBottom: 8 }}>
                      <div style={{ fontWeight: 700, fontSize: "0.83rem", marginBottom: 6 }}>{i + 1}. {ans.question?.content ?? `Pregunta ${i + 1}`}</div>
                      {(ans.question?.options ?? []).map((o: any) => (
                        <div key={o.id} style={{ padding: "3px 8px", borderRadius: 6, background: o.isCorrect ? "#dcfce7" : "#f1f5f9", fontSize: "0.78rem", color: o.isCorrect ? "#166534" : "#374151", marginBottom: 3 }}>
                          {o.isCorrect ? "✅" : "⬜"} {o.content}
                        </div>
                      ))}
                      {ans.question?.explanation && <div style={{ marginTop: 6, padding: "4px 8px", background: "#f0f9ff", borderRadius: 6, fontSize: "0.74rem", color: "#0369a1" }}>💡 {ans.question.explanation}</div>}
                    </div>
                  ))}
                </div>
              )}
              {!result && quizFull.instructions && (
                <div style={{ background: "#f0f9ff", borderRadius: 10, padding: "10px 14px", marginBottom: 16, fontSize: "0.82rem", color: "#0369a1" }}>
                  <strong>Instrucciones:</strong> {quizFull.instructions}
                </div>
              )}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 20 }}>
                {[
                  { label: "Preguntas", val: quizFull.questions.length },
                  { label: "Tiempo", val: quizFull.timeLimit ? `${quizFull.timeLimit} min` : "Libre" },
                  { label: "Para aprobar", val: `${quizFull.passingScore}%` },
                ].map(({ label, val }) => (
                  <div key={label} style={{ background: "#f8fafc", borderRadius: 9, padding: "10px", textAlign: "center" }}>
                    <div style={{ fontWeight: 800, color: "#004aad", fontSize: "1.1rem" }}>{val}</div>
                    <div style={{ fontSize: "0.68rem", color: "#94a3b8" }}>{label}</div>
                  </div>
                ))}
              </div>
              {quizError && (
                <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "10px 14px", marginBottom: 14, color: "#dc2626", fontSize: "0.82rem", fontWeight: 600 }}>
                  ⚠ {quizError}
                </div>
              )}
              <div style={{ textAlign: "center" }}>
                <button onClick={startQuiz} style={{ padding: "11px 32px", background: "#004aad", color: "#fff", border: "none", borderRadius: 10, cursor: "pointer", fontWeight: 800, fontSize: "0.95rem" }}>
                  {result ? "Volver a intentar" : "Comenzar prueba"}
                </button>
              </div>
            </div>
          )}

          {/* Taking quiz */}
          {phase === "taking" && quizFull && quizFull.questions.length > 0 && (() => {
            const q = quizFull.questions[currentQ];
            const isLast = currentQ === quizFull.questions.length - 1;
            return (
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, padding: "10px 16px", background: "#fff", borderRadius: 10, border: "1px solid #e2e8f0" }}>
                  <div style={{ fontWeight: 700, fontSize: "0.84rem" }}>🧪 {quizFull.title}</div>
                  <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                    {timeLeft != null && <div style={{ fontFamily: "monospace", fontWeight: 800, color: timeLeft < 60 ? "#dc2626" : "#374151" }}>{fmt(timeLeft)}</div>}
                    <div style={{ fontSize: "0.78rem", color: "#64748b" }}>{currentQ + 1}/{quizFull.questions.length}</div>
                  </div>
                </div>
                <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", padding: "18px 20px", marginBottom: 12 }}>
                  <div style={{ fontSize: "0.75rem", color: "#64748b", marginBottom: 8 }}>Pregunta {currentQ + 1} · {q.points} pt{q.points !== 1 ? "s" : ""}</div>
                  <div style={{ fontWeight: 700, fontSize: "0.96rem", color: "#1e293b", marginBottom: 16, lineHeight: 1.55 }}>{q.content}</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {q.options.map(o => (
                      <button key={o.id} onClick={() => setAnswers(prev => ({ ...prev, [q.id]: o.id }))}
                        style={{ padding: "11px 14px", borderRadius: 9, textAlign: "left", cursor: "pointer", fontSize: "0.87rem",
                          background: answers[q.id] === o.id ? "#eff6ff" : "#f8fafc",
                          border: `2px solid ${answers[q.id] === o.id ? "#004aad" : "#e2e8f0"}`,
                          color: answers[q.id] === o.id ? "#004aad" : "#374151",
                          fontWeight: answers[q.id] === o.id ? 700 : 400 }}>
                        {o.content}
                      </button>
                    ))}
                  </div>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <button onClick={() => setCurrentQ(p => Math.max(0, p - 1))} disabled={currentQ === 0}
                    style={{ padding: "8px 16px", border: "1px solid #e2e8f0", borderRadius: 8, background: "#fff", cursor: "pointer", color: "#64748b", fontWeight: 600 }}>
                    ← Anterior
                  </button>
                  <div style={{ display: "flex", gap: 4 }}>
                    {quizFull.questions.map((_, i) => (
                      <button key={i} onClick={() => setCurrentQ(i)}
                        style={{ width: 28, height: 28, borderRadius: 6, border: "none", cursor: "pointer", fontSize: "0.7rem", fontWeight: 700,
                          background: i === currentQ ? "#004aad" : answers[quizFull.questions[i].id] ? "#dcfce7" : "#f1f5f9",
                          color: i === currentQ ? "#fff" : answers[quizFull.questions[i].id] ? "#166534" : "#64748b" }}>
                        {i + 1}
                      </button>
                    ))}
                  </div>
                  {isLast
                    ? <button onClick={handleSubmit} disabled={(phase as string) === "submitting"}
                        style={{ padding: "8px 20px", background: "#16a34a", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 700 }}>
                        {(phase as string) === "submitting" ? "Enviando…" : "Finalizar ✓"}
                      </button>
                    : <button onClick={() => setCurrentQ(p => p + 1)}
                        style={{ padding: "8px 16px", background: "#004aad", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 700 }}>
                        Siguiente →
                      </button>}
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* ── MATERIALES ── */}
      {tab === "materiales" && (
        <div>
          {materials.map(m => (
            <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: "#fff", borderRadius: 10, border: "1px solid #e2e8f0", marginBottom: 8 }}>
              <span style={{ fontSize: "1.2rem" }}>{MAT_ICON[m.type] ?? "📎"}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: "0.86rem" }}>{m.title}</div>
                {m.description && <div style={{ fontSize: "0.72rem", color: "#64748b" }}>{m.description}</div>}
              </div>
              {m.externalUrl && (
                <a href={m.externalUrl} target="_blank" rel="noreferrer"
                  style={{ padding: "5px 14px", background: "#004aad", color: "#fff", borderRadius: 7, textDecoration: "none", fontSize: "0.76rem", fontWeight: 700 }}>
                  Abrir
                </a>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── FOROS ── */}
      {tab === "foros" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {forums.map(f => <InlineForum key={f.id} forum={f} userId={userId} />)}
        </div>
      )}

      {/* ── TAREAS ── */}
      {tab === "tareas" && (
        <div>
          {activities.map(a => {
            const sub = a.submissions?.[0];
            const overdue = a.dueDate && new Date(a.dueDate) < new Date();
            const statusColors: Record<string, { bg: string; color: string; label: string }> = {
              SUBMITTED: { bg: "#dbeafe", color: "#1d4ed8", label: "Entregada" },
              GRADED:    { bg: "#dcfce7", color: "#15803d", label: "Calificada" },
              DRAFT:     { bg: "#fef3c7", color: "#92400e", label: "Borrador" },
            };
            const statusInfo = sub ? (statusColors[sub.status] ?? { bg: "#f1f5f9", color: "#64748b", label: sub.status }) : null;
            return (
              <div key={a.id} style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", padding: "14px 18px", marginBottom: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div style={{ flex: 1, marginRight: 12 }}>
                    <div style={{ fontWeight: 700, fontSize: "0.9rem" }}>📋 {a.title}</div>
                    {a.description && <div style={{ fontSize: "0.78rem", color: "#64748b", marginTop: 2 }}>{a.description}</div>}
                    <div style={{ display: "flex", gap: 10, marginTop: 4, fontSize: "0.72rem", color: overdue ? "#dc2626" : "#94a3b8" }}>
                      {a.dueDate && <span>{overdue ? "⚠ Venció: " : "Límite: "}{new Date(a.dueDate).toLocaleDateString("es-CO")}</span>}
                      <span>{a.maxScore} pts</span>
                      {sub?.score != null && <span style={{ color: "#15803d" }}>Nota: {sub.score}/{a.maxScore}</span>}
                    </div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-end" }}>
                    {statusInfo && <span style={{ padding: "2px 10px", background: statusInfo.bg, color: statusInfo.color, borderRadius: 20, fontSize: "0.68rem", fontWeight: 700 }}>{statusInfo.label}</span>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
