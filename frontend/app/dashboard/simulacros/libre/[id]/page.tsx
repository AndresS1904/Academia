"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { useAntiFraud, AntiFraudConfig, DEFAULT_ANTI_FRAUD_CONFIG } from "@/hooks/useAntiFraud";

// ── Types ──────────────────────────────────────────────────────────────────

interface AnswerOption { id: string; letra: string; texto: string; imageUrl: string | null }
interface Question {
  id: string; area: string; enunciado: string; contexto: string | null;
  imageUrl: string | null; options: AnswerOption[];
  sessionOrder: number;
}
interface SimulacroInfo {
  id: string; titulo: string; descripcion: string | null;
  duracionMinutos: number; totalPreguntas: number; areasEvaluadas: string[];
  color: string | null; emoji: string | null;
  showResultsImmediately: boolean; allowBackNavigation: boolean;
  simulacroType: string;
}
interface Assignment {
  id: string; simulacroId: string; simulacro: SimulacroInfo;
  instructions: string | null; dueDate: string | null;
  score: number | null; completedAt: string | null;
}
interface SubjectScore { area: string; raw: number; total: number; scaled: number | null }
interface AttemptResult {
  score: number; correctas: number; totalPreguntas: number;
  subjectScores: SubjectScore[];
  tiempoUsadoSeg: number;
  preguntas: Array<{
    id: string; enunciado: string; area: string;
    selectedLetra: string | null; isCorrect: boolean; isFlagged: boolean;
    explicacion: string | null;
    options: Array<{ letra: string; texto: string; isCorrect: boolean }>;
  }>;
}
type Phase = "loading" | "intro" | "examen" | "resultados" | "entregado";

// ── Constants ──────────────────────────────────────────────────────────────

const LS_ATTEMPT = (asigId: string) => `libre_attempt_${asigId}`;
const LS_AUTOSAVE = (aid: string) => `libre_autosave_${aid}`;
const SYNC_INTERVAL = 30_000;
const AUTOSAVE_INTERVAL = 10_000;

function fmt(sec: number) {
  const m = Math.floor(sec / 60).toString().padStart(2, "0");
  const s = (sec % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

function timerColor(sec: number, total: number): string {
  const pct = sec / total;
  if (pct > 0.4) return "#059669";
  if (pct > 0.15) return "#d97706";
  return "#dc2626";
}

// ── Component ──────────────────────────────────────────────────────────────

export default function LibreExamPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const assignmentId = params.id as string;

  // ── State ────────────────────────────────────────────────────────────────
  const [phase, setPhase] = useState<Phase>("loading");
  const [pageError, setPageError] = useState("");
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [ordenPreguntas, setOrdenPreguntas] = useState<string[]>([]);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [respuestas, setRespuestas] = useState<Record<string, string>>({});
  const [marcadas, setMarcadas] = useState<Set<string>>(new Set());
  const [indicePregunta, setIndicePregunta] = useState(0);
  const [tiempoRestante, setTiempoRestante] = useState(0);
  const [tiempoTotal, setTiempoTotal] = useState(0);
  const [confirmarEntrega, setConfirmarEntrega] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [resultados, setResultados] = useState<AttemptResult | null>(null);
  const [expandExplicacion, setExpandExplicacion] = useState<string | null>(null);
  const [securityConfig, setSecurityConfig] = useState<AntiFraudConfig>(DEFAULT_ANTI_FRAUD_CONFIG);
  const [showGrid, setShowGrid] = useState(false);
  const [examSimulacroId, setExamSimulacroId] = useState("");

  const tiempoUsadoRef = useRef(0);
  const autosaveTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const syncTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Anti-fraud ────────────────────────────────────────────────────────────
  const antiFraud = useAntiFraud({
    attemptId: attemptId ?? "",
    evaluationType: "SIMULACRO",
    evaluationId: examSimulacroId,
    config: securityConfig,
    active: phase === "examen",
    onAutoSubmit: () => entregar(true),
  });

  // ── Auth guard ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!loading && !user) router.replace("/auth/login");
  }, [user, loading]);

  // ── Initial load ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const asig = await api.get<Assignment>(`/simulacros/me/${assignmentId}`).catch(async () => {
          const all = await api.get<Assignment[]>("/simulacros/me");
          const found = all.find(a => a.id === assignmentId);
          if (!found) throw new Error("Simulacro no encontrado");
          return found;
        });
        setAssignment(asig);
        setExamSimulacroId(asig.simulacroId);

        // Verify this is actually a LIBRE simulacro
        if (asig.simulacro.simulacroType !== "LIBRE") {
          router.replace(`/dashboard/simulacros/${assignmentId}`);
          return;
        }

        if (asig.completedAt) {
          // Already completed — load results
          const existingAttemptId = localStorage.getItem(LS_ATTEMPT(assignmentId));
          if (existingAttemptId && asig.simulacro.showResultsImmediately) {
            setAttemptId(existingAttemptId);
            const res = await api.get<AttemptResult>(`/simulacros/attempts/${existingAttemptId}/results`);
            setResultados(res);
            setPhase("resultados");
          } else {
            setPhase("entregado");
          }
          return;
        }

        // Load security config
        try {
          const cfg = await api.get<AntiFraudConfig>(`/anti-fraud/config?evaluationType=SIMULACRO&evaluationId=${asig.simulacroId}`);
          if (cfg) setSecurityConfig(cfg);
        } catch { /* use defaults */ }

        setPhase("intro");
      } catch (e: unknown) {
        setPageError(e instanceof Error ? e.message : "Error al cargar el simulacro");
        setPhase("entregado");
      }
    })();
  }, [user, assignmentId]);

  // ── Start attempt ─────────────────────────────────────────────────────────
  async function iniciar() {
    if (!assignment) return;
    try {
      // Check for existing attempt in localStorage
      const storedAttemptId = localStorage.getItem(LS_ATTEMPT(assignmentId));
      let aid = storedAttemptId;
      let timeRemaining: number;
      let resumed = false;

      const startResult = await api.post<{
        attemptId: string; timeRemainingSeconds: number; resumed: boolean
      }>(`/simulacros/assignments/${assignmentId}/start`, {});

      aid = startResult.attemptId;
      timeRemaining = startResult.timeRemainingSeconds;
      resumed = startResult.resumed;
      localStorage.setItem(LS_ATTEMPT(assignmentId), aid);
      setAttemptId(aid);

      // Load questions
      const { questions: qs } = await api.get<{ simulacro: SimulacroInfo; questions: Question[] }>(
        `/simulacros/${assignment.simulacroId}/questions`
      );
      setQuestions(qs);

      // Restore or shuffle order
      let orden: string[];
      if (resumed) {
        const saved = localStorage.getItem(LS_AUTOSAVE(aid));
        if (saved) {
          const parsed = JSON.parse(saved);
          orden = parsed.ordenPreguntas ?? qs.map(q => q.id);
          setRespuestas(parsed.answers ?? {});
          tiempoUsadoRef.current = parsed.tiempoUsadoSeg ?? 0;
          setMarcadas(new Set(parsed.marcadas ?? []));
        } else {
          orden = qs.map(q => q.id);
        }
      } else {
        orden = [...qs.map(q => q.id)].sort(() => Math.random() - 0.5);
      }

      setOrdenPreguntas(orden);
      setTiempoRestante(timeRemaining);
      setTiempoTotal(timeRemaining);
      setPhase("examen");
    } catch (e: unknown) {
      setPageError(e instanceof Error ? e.message : "Error al iniciar el simulacro");
    }
  }

  // ── Timer ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== "examen") return;
    const interval = setInterval(() => {
      setTiempoRestante(prev => {
        tiempoUsadoRef.current += 1;
        if (prev <= 1) {
          clearInterval(interval);
          entregar(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [phase]);

  // ── Autosave ──────────────────────────────────────────────────────────────
  const autosave = useCallback(() => {
    if (!attemptId || phase !== "examen") return;
    const data = {
      tiempoUsadoSeg: tiempoUsadoRef.current,
      answers: respuestas,
      ordenPreguntas,
      marcadas: [...marcadas],
    };
    localStorage.setItem(LS_AUTOSAVE(attemptId), JSON.stringify(data));
  }, [attemptId, phase, respuestas, ordenPreguntas, marcadas]);

  useEffect(() => {
    if (phase !== "examen") return;
    autosaveTimerRef.current = setInterval(autosave, AUTOSAVE_INTERVAL);
    return () => { if (autosaveTimerRef.current) clearInterval(autosaveTimerRef.current); };
  }, [phase, autosave]);

  // ── Server sync ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== "examen" || !attemptId) return;
    syncTimerRef.current = setInterval(async () => {
      try {
        const status = await api.get<{ status: string; timeRemainingSeconds: number }>(
          `/simulacros/attempts/${attemptId}/status`
        );
        if (status.status === "EXPIRED" || status.status === "COMPLETED") {
          clearInterval(syncTimerRef.current!);
          setPhase("entregado");
          return;
        }
        setTiempoRestante(prev => {
          const diff = Math.abs(prev - status.timeRemainingSeconds);
          return diff > 5 ? status.timeRemainingSeconds : prev;
        });
      } catch { /* ignore */ }
    }, SYNC_INTERVAL);
    return () => { if (syncTimerRef.current) clearInterval(syncTimerRef.current); };
  }, [phase, attemptId]);

  // ── Answer & flag ─────────────────────────────────────────────────────────
  function responder(questionId: string, optionId: string) {
    setRespuestas(prev => ({ ...prev, [questionId]: optionId }));
    if (!attemptId) return;
    api.post(`/simulacros/attempts/${attemptId}/save-answer`, {
      questionId, selectedOptionId: optionId, isFlagged: marcadas.has(questionId),
    }).catch(() => {});
  }

  function toggleMarcada(questionId: string) {
    setMarcadas(prev => {
      const next = new Set(prev);
      next.has(questionId) ? next.delete(questionId) : next.add(questionId);
      if (attemptId) {
        api.post(`/simulacros/attempts/${attemptId}/save-answer`, {
          questionId,
          selectedOptionId: respuestas[questionId] ?? null,
          isFlagged: !prev.has(questionId),
        }).catch(() => {});
      }
      return next;
    });
  }

  // ── Submit ────────────────────────────────────────────────────────────────
  async function entregar(automatico = false) {
    if (!attemptId || !assignment) return;
    if (!automatico && !confirmarEntrega) { setConfirmarEntrega(true); return; }
    setSubmitting(true);
    setConfirmarEntrega(false);
    autosave();
    if (autosaveTimerRef.current) clearInterval(autosaveTimerRef.current);
    if (syncTimerRef.current) clearInterval(syncTimerRef.current);

    try {
      const answers = ordenPreguntas.map(qId => ({
        questionId: qId,
        selectedOptionId: respuestas[qId] ?? null,
      }));
      const result = await api.post<{ score: number; correctas: number; totalPreguntas: number; subjectScores: SubjectScore[] }>(
        `/simulacros/attempts/${attemptId}/submit`,
        { answers, tiempoUsadoSeg: tiempoUsadoRef.current }
      );

      if (assignment.simulacro.showResultsImmediately) {
        const res = await api.get<AttemptResult>(`/simulacros/attempts/${attemptId}/results`);
        setResultados(res);
        setPhase("resultados");
      } else {
        setPhase("entregado");
      }
    } catch {
      setPhase("entregado");
    } finally {
      setSubmitting(false);
    }
  }

  // ── Render helpers ────────────────────────────────────────────────────────
  const currentQuestion = questions.find(q => q.id === ordenPreguntas[indicePregunta]);
  const respondidas = Object.keys(respuestas).length;
  const totalQ = ordenPreguntas.length;

  // ── Loading / error ───────────────────────────────────────────────────────
  if (loading || phase === "loading") {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f8fafc" }}>
        <div style={{ color: "#94a3b8", fontSize: "1rem" }}>Cargando…</div>
      </div>
    );
  }

  if (pageError) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, padding: 24 }}>
        <div style={{ color: "#dc2626", fontWeight: 700 }}>{pageError}</div>
        <Link href="/dashboard/simulacros" style={{ color: "#004aad" }}>← Volver</Link>
      </div>
    );
  }

  // ── INTRO ─────────────────────────────────────────────────────────────────
  if (phase === "intro" && assignment) {
    const sim = assignment.simulacro;
    const accent = sim.color ?? "#7c3aed";
    return (
      <div style={{ minHeight: "100vh", background: "#f8fafc", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <div style={{ background: "#fff", borderRadius: 20, padding: "36px 40px", maxWidth: 520, width: "100%", boxShadow: "0 8px 32px rgba(0,0,0,0.08)" }}>
          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
            <div style={{ width: 56, height: 56, borderRadius: 16, background: `${accent}18`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.8rem", border: `2px solid ${accent}30` }}>
              {sim.emoji ?? "⚡"}
            </div>
            <div>
              <div style={{ fontFamily: "var(--font-poppins)", fontWeight: 800, fontSize: "1.3rem", color: "#1e293b" }}>{sim.titulo}</div>
              <span style={{ display: "inline-block", padding: "2px 10px", borderRadius: 20, fontSize: "0.72rem", fontWeight: 700, background: "#d1fae5", color: "#065f46", marginTop: 4 }}>
                Simulacro Libre
              </span>
            </div>
          </div>

          {sim.descripcion && (
            <p style={{ color: "#64748b", fontSize: "0.9rem", lineHeight: 1.6, marginBottom: 20 }}>{sim.descripcion}</p>
          )}

          {/* Stats */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
            {[
              { label: "Preguntas", value: sim.totalPreguntas },
              { label: "Tiempo límite", value: `${sim.duracionMinutos} min` },
              { label: "Áreas", value: sim.areasEvaluadas.length },
              { label: "Navegación", value: sim.allowBackNavigation ? "Libre" : "Secuencial" },
            ].map(({ label, value }) => (
              <div key={label} style={{ background: "#f8fafc", borderRadius: 10, padding: "12px 14px" }}>
                <div style={{ fontSize: "1.2rem", fontWeight: 800, color: "#1e293b" }}>{value}</div>
                <div style={{ fontSize: "0.75rem", color: "#94a3b8", marginTop: 1 }}>{label}</div>
              </div>
            ))}
          </div>

          {/* Areas */}
          {sim.areasEvaluadas.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "#64748b", marginBottom: 8 }}>Áreas evaluadas</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {sim.areasEvaluadas.map(a => (
                  <span key={a} style={{ padding: "3px 10px", borderRadius: 20, background: `${accent}15`, color: accent, fontSize: "0.75rem", fontWeight: 700 }}>
                    {a.replace(/_/g, " ")}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Instructions */}
          {assignment.instructions && (
            <div style={{ background: "#fffbf0", border: "1px solid #fef3c7", borderRadius: 10, padding: "12px 14px", marginBottom: 20, fontSize: "0.875rem", color: "#78350f" }}>
              {assignment.instructions}
            </div>
          )}

          {/* Due date */}
          {assignment.dueDate && (
            <div style={{ fontSize: "0.8rem", color: "#94a3b8", marginBottom: 20 }}>
              Fecha límite: {new Date(assignment.dueDate).toLocaleDateString("es-CO", { day: "2-digit", month: "long", year: "numeric" })}
            </div>
          )}

          {/* Anti-fraud notice */}
          {securityConfig.tabSwitchDetection && (
            <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, padding: "10px 14px", marginBottom: 20, fontSize: "0.8rem", color: "#991b1b" }}>
              Nota: Se registrarán cambios de pestaña y comportamientos sospechosos durante el simulacro.
            </div>
          )}

          <button onClick={iniciar}
            style={{ width: "100%", padding: "14px 0", background: accent, color: "#fff", borderRadius: 12, border: "none", cursor: "pointer", fontFamily: "var(--font-poppins)", fontWeight: 800, fontSize: "1rem" }}>
            Iniciar simulacro
          </button>
          <div style={{ textAlign: "center", marginTop: 12 }}>
            <Link href="/dashboard/simulacros" style={{ color: "#94a3b8", fontSize: "0.85rem", textDecoration: "none" }}>
              ← Volver a mis simulacros
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ── EXAMEN ────────────────────────────────────────────────────────────────
  if (phase === "examen" && currentQuestion && assignment) {
    const sim = assignment.simulacro;
    const accent = sim.color ?? "#7c3aed";
    const answeredCurrent = respuestas[currentQuestion.id];
    const isFlagged = marcadas.has(currentQuestion.id);
    const timerPct = tiempoTotal > 0 ? (tiempoRestante / tiempoTotal) * 100 : 100;
    const tColor = timerColor(tiempoRestante, tiempoTotal);

    return (
      <div style={{ minHeight: "100vh", background: "#f0f4ff", display: "flex", flexDirection: "column" }}>

        {/* Top bar */}
        <div style={{
          background: "#fff", borderBottom: "1px solid #e2e8f0", padding: "12px 24px",
          display: "flex", alignItems: "center", gap: 16, position: "sticky", top: 0, zIndex: 100,
          boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
        }}>
          <div style={{ fontSize: "0.9rem", fontWeight: 700, color: "#1e293b", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {sim.emoji} {sim.titulo}
          </div>

          {/* Progress */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 120, height: 6, background: "#e2e8f0", borderRadius: 3 }}>
              <div style={{ height: "100%", background: accent, borderRadius: 3, width: `${(respondidas / totalQ) * 100}%`, transition: "width 0.3s" }} />
            </div>
            <span style={{ fontSize: "0.78rem", color: "#64748b" }}>{respondidas}/{totalQ}</span>
          </div>

          {/* Timer */}
          <div style={{
            display: "flex", alignItems: "center", gap: 6, padding: "6px 14px",
            background: tiempoRestante <= 60 ? "#fef2f2" : "#f8fafc",
            borderRadius: 20, border: `1px solid ${tiempoRestante <= 60 ? "#fecaca" : "#e2e8f0"}`,
          }}>
            <span style={{ fontSize: "0.9rem", color: tColor }}>⏱</span>
            <span style={{ fontSize: "0.95rem", fontWeight: 800, fontVariantNumeric: "tabular-nums", color: tColor, fontFamily: "monospace" }}>
              {fmt(tiempoRestante)}
            </span>
          </div>

          {/* Grid toggle */}
          <button onClick={() => setShowGrid(p => !p)}
            title="Ver cuadrícula de preguntas"
            style={{ padding: "6px 12px", background: showGrid ? accent : "#f1f5f9", color: showGrid ? "#fff" : "#475569", borderRadius: 8, border: "none", cursor: "pointer", fontWeight: 700, fontSize: "0.8rem" }}>
            ⊞
          </button>

          {/* Submit */}
          <button onClick={() => setConfirmarEntrega(true)} disabled={submitting}
            style={{ padding: "8px 18px", background: "#059669", color: "#fff", borderRadius: 10, border: "none", cursor: "pointer", fontWeight: 800, fontSize: "0.85rem" }}>
            Entregar
          </button>
        </div>

        {/* Timer bar */}
        <div style={{ height: 3, background: "#e2e8f0" }}>
          <div style={{ height: "100%", background: tColor, width: `${timerPct}%`, transition: "width 1s linear" }} />
        </div>

        {/* Violations warning */}
        {antiFraud.violations > 0 && (
          <div style={{ background: "#fef3c7", borderTop: "1px solid #fde68a", padding: "6px 24px", fontSize: "0.8rem", color: "#b45309", textAlign: "center" }}>
            Advertencia de seguridad: {antiFraud.violations}/{securityConfig.maxViolations} infracciones detectadas
          </div>
        )}

        <div style={{ display: "flex", flex: 1, maxWidth: 1100, margin: "0 auto", width: "100%", padding: "24px", gap: 24, boxSizing: "border-box" }}>

          {/* Question panel */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e2e8f0", padding: "28px 32px", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
              {/* Question header */}
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
                <span style={{ padding: "3px 12px", borderRadius: 20, background: `${accent}15`, color: accent, fontSize: "0.78rem", fontWeight: 700 }}>
                  {currentQuestion.area.replace(/_/g, " ")}
                </span>
                <span style={{ fontSize: "0.8rem", color: "#94a3b8" }}>
                  Pregunta {indicePregunta + 1} de {totalQ}
                </span>
                <button onClick={() => toggleMarcada(currentQuestion.id)}
                  style={{ marginLeft: "auto", padding: "4px 12px", background: isFlagged ? "#fef3c7" : "#f1f5f9", color: isFlagged ? "#b45309" : "#64748b", borderRadius: 8, border: "none", cursor: "pointer", fontWeight: 600, fontSize: "0.78rem" }}>
                  {isFlagged ? "★ Marcada" : "☆ Marcar"}
                </button>
              </div>

              {/* Context */}
              {currentQuestion.contexto && (
                <div style={{ background: "#f8fafc", borderRadius: 10, padding: "14px 16px", marginBottom: 16, fontSize: "0.875rem", color: "#374151", lineHeight: 1.7, borderLeft: `3px solid ${accent}` }}>
                  {currentQuestion.contexto}
                </div>
              )}

              {/* Image */}
              {currentQuestion.imageUrl && (
                <img src={currentQuestion.imageUrl} alt="Imagen pregunta" style={{ maxWidth: "100%", borderRadius: 8, marginBottom: 16 }} />
              )}

              {/* Enunciado */}
              <div style={{ fontSize: "0.95rem", color: "#1e293b", lineHeight: 1.7, marginBottom: 22, fontWeight: 500 }}>
                {currentQuestion.enunciado}
              </div>

              {/* Options */}
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {currentQuestion.options.map(opt => {
                  const selected = answeredCurrent === opt.id;
                  return (
                    <button key={opt.id} onClick={() => responder(currentQuestion.id, opt.id)}
                      style={{
                        display: "flex", alignItems: "flex-start", gap: 12, padding: "12px 16px", borderRadius: 10,
                        border: selected ? `2px solid ${accent}` : "1.5px solid #e2e8f0",
                        background: selected ? `${accent}0f` : "#fff",
                        cursor: "pointer", textAlign: "left", transition: "all 0.15s",
                      }}>
                      <span style={{
                        width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        background: selected ? accent : "#f1f5f9",
                        color: selected ? "#fff" : "#64748b",
                        fontWeight: 800, fontSize: "0.82rem",
                      }}>
                        {opt.letra}
                      </span>
                      <span style={{ fontSize: "0.9rem", color: "#1e293b", lineHeight: 1.6 }}>{opt.texto}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Navigation */}
            <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
              {assignment.simulacro.allowBackNavigation && (
                <button onClick={() => setIndicePregunta(p => Math.max(0, p - 1))} disabled={indicePregunta === 0}
                  style={{ padding: "11px 20px", background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, cursor: "pointer", fontWeight: 700, fontSize: "0.9rem", color: "#475569" }}>
                  ← Anterior
                </button>
              )}
              <button onClick={() => setIndicePregunta(p => Math.min(totalQ - 1, p + 1))} disabled={indicePregunta >= totalQ - 1}
                style={{ flex: 1, padding: "11px 0", background: accent, color: "#fff", border: "none", borderRadius: 10, cursor: "pointer", fontWeight: 800, fontSize: "0.9rem" }}>
                {indicePregunta < totalQ - 1 ? "Siguiente →" : "Última pregunta"}
              </button>
            </div>
          </div>

          {/* Grid sidebar */}
          {showGrid && (
            <div style={{ width: 200, flexShrink: 0 }}>
              <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #e2e8f0", padding: "16px", position: "sticky", top: 80 }}>
                <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "#64748b", marginBottom: 10, textTransform: "uppercase" }}>
                  Preguntas
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 6 }}>
                  {ordenPreguntas.map((qId, i) => {
                    const answered = !!respuestas[qId];
                    const flagged = marcadas.has(qId);
                    const current = i === indicePregunta;
                    return (
                      <button key={qId} onClick={() => setIndicePregunta(i)}
                        style={{
                          width: 28, height: 28, borderRadius: 6, border: current ? `2px solid ${accent}` : "1px solid #e2e8f0",
                          background: current ? accent : answered ? "#dcfce7" : flagged ? "#fef3c7" : "#f8fafc",
                          color: current ? "#fff" : "#64748b",
                          fontWeight: 700, fontSize: "0.7rem", cursor: "pointer",
                        }}>
                        {i + 1}
                      </button>
                    );
                  })}
                </div>
                <div style={{ marginTop: 12, fontSize: "0.72rem", color: "#94a3b8" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                    <div style={{ width: 12, height: 12, borderRadius: 3, background: "#dcfce7", border: "1px solid #e2e8f0" }} /> Respondida
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                    <div style={{ width: 12, height: 12, borderRadius: 3, background: "#fef3c7", border: "1px solid #e2e8f0" }} /> Marcada
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <div style={{ width: 12, height: 12, borderRadius: 3, background: "#f8fafc", border: "1px solid #e2e8f0" }} /> Sin responder
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Confirm modal */}
        {confirmarEntrega && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ background: "#fff", borderRadius: 18, padding: "28px 32px", maxWidth: 420, width: "100%", margin: 16 }}>
              <h2 style={{ fontFamily: "var(--font-poppins)", fontWeight: 800, fontSize: "1.1rem", color: "#1e293b", marginBottom: 8 }}>
                ¿Entregar simulacro?
              </h2>
              <p style={{ color: "#64748b", fontSize: "0.875rem", marginBottom: 8 }}>
                Has respondido <strong>{respondidas}</strong> de <strong>{totalQ}</strong> preguntas.
              </p>
              {respondidas < totalQ && (
                <p style={{ color: "#dc2626", fontSize: "0.8rem", marginBottom: 16 }}>
                  Hay {totalQ - respondidas} pregunta{totalQ - respondidas !== 1 ? "s" : ""} sin responder. Se contarán como incorrectas.
                </p>
              )}
              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={() => entregar(false)} disabled={submitting}
                  style={{ flex: 1, padding: "12px 0", background: "#059669", color: "#fff", border: "none", borderRadius: 10, cursor: "pointer", fontWeight: 800, fontSize: "0.95rem" }}>
                  {submitting ? "Enviando…" : "Sí, entregar"}
                </button>
                <button onClick={() => setConfirmarEntrega(false)}
                  style={{ padding: "12px 20px", background: "#f1f5f9", color: "#475569", border: "none", borderRadius: 10, cursor: "pointer", fontWeight: 700 }}>
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── RESULTADOS ────────────────────────────────────────────────────────────
  if (phase === "resultados" && resultados && assignment) {
    const sim = assignment.simulacro;
    const accent = sim.color ?? "#7c3aed";
    const score = Math.round(resultados.score);
    const scoreColor = score >= 70 ? "#059669" : score >= 50 ? "#d97706" : "#dc2626";

    return (
      <div style={{ minHeight: "100vh", background: "#f0f4ff", padding: "32px 24px" }}>
        <div style={{ maxWidth: 700, margin: "0 auto" }}>
          {/* Score card */}
          <div style={{ background: "#fff", borderRadius: 20, padding: "32px 36px", marginBottom: 20, textAlign: "center", boxShadow: "0 4px 16px rgba(0,0,0,0.06)" }}>
            <div style={{ fontSize: "0.9rem", color: "#64748b", marginBottom: 8 }}>Resultado final</div>
            <div style={{ fontFamily: "var(--font-poppins)", fontWeight: 900, fontSize: "3.5rem", color: scoreColor, lineHeight: 1 }}>
              {score}%
            </div>
            <div style={{ fontSize: "1rem", color: "#64748b", marginTop: 8 }}>
              {resultados.correctas} de {resultados.totalPreguntas} correctas
            </div>
            <div style={{ fontSize: "0.85rem", color: "#94a3b8", marginTop: 4 }}>
              Tiempo: {Math.floor(resultados.tiempoUsadoSeg / 60)}:{String(resultados.tiempoUsadoSeg % 60).padStart(2, "0")}
            </div>
            <div style={{ fontSize: "1rem", fontWeight: 700, color: scoreColor, marginTop: 12 }}>
              {score >= 80 ? "Excelente" : score >= 70 ? "Muy bien" : score >= 50 ? "Regular" : "Necesita mejorar"}
            </div>
          </div>

          {/* Per-area breakdown */}
          {resultados.subjectScores.length > 0 && (
            <div style={{ background: "#fff", borderRadius: 16, padding: "20px 24px", marginBottom: 20 }}>
              <h3 style={{ fontWeight: 800, fontSize: "1rem", color: "#1e293b", margin: "0 0 16px" }}>Resultados por área</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {resultados.subjectScores.map(s => {
                  const pct = s.total > 0 ? Math.round((s.raw / s.total) * 100) : 0;
                  const c = pct >= 70 ? "#059669" : pct >= 50 ? "#d97706" : "#dc2626";
                  return (
                    <div key={s.area}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                        <span style={{ fontSize: "0.85rem", color: "#374151", fontWeight: 600 }}>{s.area.replace(/_/g, " ")}</span>
                        <span style={{ fontSize: "0.85rem", fontWeight: 800, color: c }}>{pct}% ({s.raw}/{s.total})</span>
                      </div>
                      <div style={{ height: 6, background: "#e2e8f0", borderRadius: 3 }}>
                        <div style={{ height: "100%", background: c, borderRadius: 3, width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Question review */}
          <div style={{ background: "#fff", borderRadius: 16, padding: "20px 24px", marginBottom: 20 }}>
            <h3 style={{ fontWeight: 800, fontSize: "1rem", color: "#1e293b", margin: "0 0 16px" }}>Revisión de preguntas</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {resultados.preguntas.map((p, i) => (
                <div key={p.id} style={{ borderRadius: 10, border: `1px solid ${p.isCorrect ? "#bbf7d0" : "#fecaca"}`, padding: "14px 16px", background: p.isCorrect ? "#f0fdf4" : "#fff5f5" }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 8 }}>
                    <span style={{ width: 24, height: 24, borderRadius: "50%", background: p.isCorrect ? "#059669" : "#dc2626", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.7rem", fontWeight: 800, flexShrink: 0 }}>
                      {i + 1}
                    </span>
                    <span style={{ fontSize: "0.875rem", color: "#1e293b", flex: 1 }}>{p.enunciado.length > 160 ? p.enunciado.slice(0, 160) + "…" : p.enunciado}</span>
                    <span style={{ fontSize: "0.8rem", fontWeight: 700, color: p.isCorrect ? "#059669" : "#dc2626", flexShrink: 0 }}>
                      {p.isCorrect ? "Correcta" : `Tu resp.: ${p.selectedLetra ?? "—"}`}
                    </span>
                  </div>
                  {p.explicacion && (
                    <>
                      <button onClick={() => setExpandExplicacion(expandExplicacion === p.id ? null : p.id)}
                        style={{ background: "none", border: "none", cursor: "pointer", color: accent, fontSize: "0.78rem", fontWeight: 700, padding: 0 }}>
                        {expandExplicacion === p.id ? "▲ Ocultar explicación" : "▼ Ver explicación"}
                      </button>
                      {expandExplicacion === p.id && (
                        <div style={{ marginTop: 8, fontSize: "0.85rem", color: "#374151", lineHeight: 1.6, background: "#fff", borderRadius: 8, padding: "10px 12px", border: "1px solid #e2e8f0" }}>
                          {p.explicacion}
                        </div>
                      )}
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: "flex", gap: 12 }}>
            <Link href="/dashboard/simulacros"
              style={{ flex: 1, padding: "13px 0", background: "#7c3aed", color: "#fff", borderRadius: 12, textDecoration: "none", fontWeight: 800, fontSize: "0.95rem", textAlign: "center", display: "block" }}>
              ← Mis simulacros
            </Link>
            <Link href="/dashboard/analitica"
              style={{ padding: "13px 20px", background: "#f0f4ff", color: "#004aad", borderRadius: 12, textDecoration: "none", fontWeight: 700, fontSize: "0.9rem" }}>
              Ver analítica
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ── ENTREGADO ─────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ background: "#fff", borderRadius: 20, padding: "40px 48px", maxWidth: 480, width: "100%", textAlign: "center", boxShadow: "0 8px 32px rgba(0,0,0,0.08)" }}>
        <div style={{ fontSize: "3rem", marginBottom: 16 }}>✅</div>
        <h1 style={{ fontFamily: "var(--font-poppins)", fontWeight: 800, fontSize: "1.4rem", color: "#1e293b", marginBottom: 8 }}>
          Simulacro entregado
        </h1>
        <p style={{ color: "#64748b", fontSize: "0.9rem", marginBottom: 28 }}>
          Tu simulacro fue registrado correctamente.
        </p>
        <Link href="/dashboard/simulacros"
          style={{ display: "block", padding: "13px 0", background: "#7c3aed", color: "#fff", borderRadius: 12, textDecoration: "none", fontWeight: 800, fontSize: "0.95rem" }}>
          ← Mis simulacros
        </Link>
      </div>
    </div>
  );
}
