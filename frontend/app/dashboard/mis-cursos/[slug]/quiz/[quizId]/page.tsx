"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import DashboardSidebar from "@/components/layout/DashboardSidebar";
import Navbar from "@/components/layout/Navbar";
import { api } from "@/lib/api";

interface QuizOption { id: string; content: string; order: number }
interface QuizQuestion { id: string; content: string; points: number; order: number; options: QuizOption[] }
interface Quiz {
  id: string; title: string; description?: string; instructions?: string; timeLimit?: number;
  maxAttempts: number; passingScore: number; showResults: boolean; questions: QuizQuestion[];
  _count: { attempts: number };
}
interface QuizAttempt { id: string; status: string; score?: number; maxScore?: number; passed?: boolean; submittedAt?: string }
interface AnswerResult {
  questionId: string; isCorrect: boolean; pointsEarned: number;
  question: { content: string; explanation?: string; points: number; options: { id: string; content: string; isCorrect: boolean; order: number }[] }
}

export default function StudentCourseQuizPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const slug = params.slug as string;
  const quizId = params.quizId as string;

  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [prevAttempts, setPrevAttempts] = useState<QuizAttempt[]>([]);
  const [fetching, setFetching] = useState(true);

  const [attempt, setAttempt] = useState<QuizAttempt | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [currentQ, setCurrentQ] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ attempt: QuizAttempt; answers: AnswerResult[] } | null>(null);
  const [starting, setStarting] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  useEffect(() => { if (!loading && !user) router.replace("/auth/login"); }, [user, loading]);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      api.get<Quiz>(`/classrooms/quizzes/${quizId}/student`),
      api.get<QuizAttempt[]>(`/classrooms/quizzes/${quizId}/my-attempts`),
    ]).then(([q, atts]) => { setQuiz(q); setPrevAttempts(atts); }).catch(() => {}).finally(() => setFetching(false));
  }, [user, quizId]);

  useEffect(() => {
    if (!attempt || !quiz?.timeLimit || attempt.status !== "IN_PROGRESS") return;
    setTimeLeft(quiz.timeLimit * 60);
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev == null || prev <= 1) { clearInterval(interval); handleSubmit(); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [attempt?.id]);

  async function startAttempt() {
    setStarting(true);
    const a = await api.post<QuizAttempt>(`/classrooms/quizzes/${quizId}/start`, {}).catch(() => null);
    if (a) { setAttempt(a); setCurrentQ(0); setAnswers({}); }
    setStarting(false);
  }

  async function handleSubmit() {
    if (!attempt) return;
    setSubmitting(true);
    const payload = Object.entries(answers).map(([questionId, selectedOptionId]) => ({ questionId, selectedOptionId }));
    const res = await api.post<any>(`/classrooms/quiz-attempts/${attempt.id}/submit`, { answers: payload }).catch(() => null);
    if (res) {
      setResult({ attempt: res, answers: res.answers ?? [] });
      setAttempt(null);
      setPrevAttempts((prev) => [res, ...prev]);
    }
    setSubmitting(false);
  }

  if (loading || fetching || !quiz) return null;

  const attemptsLeft = quiz.maxAttempts - prevAttempts.filter((a) => a.status === "COMPLETED").length;
  const canStart = attemptsLeft > 0 && !attempt;
  const formatTime = (sec: number) => `${Math.floor(sec / 60).toString().padStart(2, "0")}:${(sec % 60).toString().padStart(2, "0")}`;

  if (result) {
    const { attempt: finalAttempt, answers: finalAnswers } = result;
    return (
      <>
        <Navbar />
        <div className="dashboard-layout">
          <DashboardSidebar />
          <main className="dashboard-main">
            <div className="dashboard-content" style={{ maxWidth: 700 }}>
              <div style={{ textAlign: "center", padding: "24px 0", marginBottom: 24 }}>
                <div style={{ fontSize: "3rem", marginBottom: 8 }}>{finalAttempt.passed ? "🎉" : "😔"}</div>
                <h1 style={{ fontFamily: "var(--font-poppins)", fontWeight: 800, fontSize: "1.6rem", color: finalAttempt.passed ? "#166534" : "#dc2626", margin: "0 0 8px" }}>
                  {finalAttempt.passed ? "¡Aprobado!" : "No aprobado"}
                </h1>
                <div style={{ fontSize: "1.2rem", color: "#374151" }}>
                  {finalAttempt.score?.toFixed(1)}% — Mínimo: {quiz.passingScore}%
                </div>
              </div>

              {quiz.showResults && finalAnswers.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 24 }}>
                  {finalAnswers.map((ans, i) => (
                    <div key={ans.questionId} style={{ background: "#fff", borderRadius: 12, border: `1px solid ${ans.isCorrect ? "#86efac" : "#fca5a5"}`, padding: "14px 16px" }}>
                      <div style={{ fontWeight: 700, fontSize: "0.875rem", color: "#1e293b", marginBottom: 8 }}>{i + 1}. {ans.question.content}</div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 8 }}>
                        {ans.question.options.map((o) => (
                          <div key={o.id} style={{ padding: "5px 10px", borderRadius: 7, background: o.isCorrect ? "#dcfce7" : "#f8fafc", fontSize: "0.82rem", color: o.isCorrect ? "#166534" : "#374151" }}>
                            {o.isCorrect ? "✅" : "⬜"} {o.content}
                          </div>
                        ))}
                      </div>
                      {ans.question.explanation && <div style={{ padding: "6px 10px", background: "#f0f9ff", borderRadius: 8, fontSize: "0.78rem", color: "#0369a1" }}>💡 {ans.question.explanation}</div>}
                    </div>
                  ))}
                </div>
              )}

              <div style={{ textAlign: "center" }}>
                <Link href={`/dashboard/mis-cursos/${slug}`} style={{ padding: "10px 24px", background: "#004aad", color: "#fff", borderRadius: 10, textDecoration: "none", fontWeight: 700 }}>Volver al curso</Link>
              </div>
            </div>
          </main>
        </div>
      </>
    );
  }

  if (attempt && quiz.questions.length > 0) {
    const q = quiz.questions[currentQ];
    const isLast = currentQ === quiz.questions.length - 1;
    return (
      <>
        <Navbar />
        <div className="dashboard-layout">
          <DashboardSidebar />
          <main className="dashboard-main">
            <div className="dashboard-content" style={{ maxWidth: 700 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, padding: "12px 18px", background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0" }}>
                <div style={{ fontWeight: 700, fontSize: "0.875rem", color: "#1e293b" }}>{quiz.title}</div>
                <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
                  {timeLeft != null && (
                    <div style={{ fontFamily: "monospace", fontWeight: 800, fontSize: "1rem", color: timeLeft < 60 ? "#dc2626" : "#374151" }}>{formatTime(timeLeft)}</div>
                  )}
                  <div style={{ fontSize: "0.82rem", color: "#64748b" }}>{currentQ + 1} / {quiz.questions.length}</div>
                </div>
              </div>

              <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #e2e8f0", padding: "20px 24px", marginBottom: 16 }}>
                <div style={{ fontSize: "0.85rem", color: "#64748b", marginBottom: 12 }}>Pregunta {currentQ + 1} · {q.points} pt{q.points !== 1 ? "s" : ""}</div>
                <div style={{ fontWeight: 700, fontSize: "1rem", color: "#1e293b", marginBottom: 20, lineHeight: 1.5 }}>{q.content}</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {q.options.map((o) => (
                    <button key={o.id} onClick={() => setAnswers((prev) => ({ ...prev, [q.id]: o.id }))} style={{
                      padding: "12px 16px", borderRadius: 10, textAlign: "left", cursor: "pointer", fontSize: "0.875rem",
                      background: answers[q.id] === o.id ? "#eff6ff" : "#f8fafc",
                      border: `2px solid ${answers[q.id] === o.id ? "#004aad" : "#e2e8f0"}`,
                      color: answers[q.id] === o.id ? "#004aad" : "#374151", fontWeight: answers[q.id] === o.id ? 700 : 400,
                    }}>
                      {o.content}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <button onClick={() => setCurrentQ((p) => Math.max(0, p - 1))} disabled={currentQ === 0}
                  style={{ padding: "9px 18px", border: "1px solid #e2e8f0", borderRadius: 8, background: "#fff", cursor: "pointer", color: "#64748b", fontWeight: 600 }}>
                  ← Anterior
                </button>
                <div style={{ display: "flex", gap: 4 }}>
                  {quiz.questions.map((_, i) => (
                    <button key={i} onClick={() => setCurrentQ(i)} style={{
                      width: 28, height: 28, borderRadius: 6, border: "none", cursor: "pointer", fontSize: "0.72rem", fontWeight: 700,
                      background: i === currentQ ? "#004aad" : answers[quiz.questions[i].id] ? "#dcfce7" : "#f1f5f9",
                      color: i === currentQ ? "#fff" : answers[quiz.questions[i].id] ? "#166534" : "#64748b",
                    }}>{i + 1}</button>
                  ))}
                </div>
                {isLast ? (
                  <button onClick={handleSubmit} disabled={submitting} style={{ padding: "9px 20px", background: "#16a34a", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 700 }}>
                    {submitting ? "Enviando…" : "Finalizar quiz"}
                  </button>
                ) : (
                  <button onClick={() => setCurrentQ((p) => Math.min(quiz.questions.length - 1, p + 1))} style={{ padding: "9px 18px", background: "#004aad", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 700 }}>
                    Siguiente →
                  </button>
                )}
              </div>
            </div>
          </main>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="dashboard-layout">
        <DashboardSidebar />
        <main className="dashboard-main">
          <div className="dashboard-content" style={{ maxWidth: 600 }}>
            <div style={{ marginBottom: 16 }}>
              <Link href={`/dashboard/mis-cursos/${slug}`} style={{ fontSize: "0.875rem", color: "#64748b", textDecoration: "none" }}>← Volver al curso</Link>
            </div>
            <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e2e8f0", padding: "28px 32px" }}>
              <div style={{ fontSize: "2.5rem", marginBottom: 12, textAlign: "center" }}>🧪</div>
              <h1 style={{ fontFamily: "var(--font-poppins)", fontWeight: 800, fontSize: "1.4rem", color: "#1e293b", textAlign: "center", margin: "0 0 8px" }}>{quiz.title}</h1>
              {quiz.description && <p style={{ textAlign: "center", color: "#64748b", fontSize: "0.875rem", marginBottom: 20 }}>{quiz.description}</p>}

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 24 }}>
                {[
                  { label: "Preguntas", value: quiz.questions.length },
                  { label: "Tiempo límite", value: quiz.timeLimit ? `${quiz.timeLimit} min` : "Sin límite" },
                  { label: "Intentos restantes", value: attemptsLeft },
                  { label: "Para aprobar", value: `${quiz.passingScore}%` },
                ].map(({ label, value }) => (
                  <div key={label} style={{ background: "#f8fafc", borderRadius: 10, padding: "12px 14px", textAlign: "center" }}>
                    <div style={{ fontSize: "1.2rem", fontWeight: 800, color: "#004aad" }}>{value}</div>
                    <div style={{ fontSize: "0.72rem", color: "#94a3b8" }}>{label}</div>
                  </div>
                ))}
              </div>

              {quiz.instructions && (
                <div style={{ background: "#f0f9ff", borderRadius: 10, padding: "12px 16px", marginBottom: 20, fontSize: "0.85rem", color: "#0369a1" }}>
                  <div style={{ fontWeight: 700, marginBottom: 4 }}>Instrucciones:</div>
                  <p style={{ margin: 0, whiteSpace: "pre-wrap" }}>{quiz.instructions}</p>
                </div>
              )}

              {prevAttempts.length > 0 && (
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "#64748b", marginBottom: 8 }}>Intentos anteriores:</div>
                  {prevAttempts.map((a) => (
                    <div key={a.id} style={{ display: "flex", justifyContent: "space-between", padding: "6px 10px", background: "#f8fafc", borderRadius: 7, marginBottom: 4, fontSize: "0.78rem" }}>
                      <span style={{ color: "#64748b" }}>{a.submittedAt ? new Date(a.submittedAt).toLocaleDateString("es-CO") : "En progreso"}</span>
                      <span style={{ fontWeight: 700, color: a.passed ? "#166534" : "#dc2626" }}>{a.score?.toFixed(1)}% {a.passed ? "✅" : "❌"}</span>
                    </div>
                  ))}
                </div>
              )}

              <div style={{ textAlign: "center" }}>
                {canStart ? (
                  <button onClick={startAttempt} disabled={starting} style={{ padding: "12px 32px", background: "#004aad", color: "#fff", border: "none", borderRadius: 10, cursor: "pointer", fontWeight: 800, fontSize: "1rem" }}>
                    {starting ? "Iniciando…" : "Comenzar prueba"}
                  </button>
                ) : (
                  <div style={{ padding: "12px 24px", background: "#f1f5f9", borderRadius: 10, color: "#94a3b8", fontSize: "0.875rem" }}>
                    Has agotado todos tus intentos para esta prueba.
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
