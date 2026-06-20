"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useExamTheme } from "@/contexts/ExamThemeContext";
import Navbar from "@/components/layout/Navbar";
import { api } from "@/lib/api";
import { useAntiFraud, DEFAULT_ANTI_FRAUD_CONFIG, AntiFraudConfig } from "@/hooks/useAntiFraud";
import { AntiFraudWarningModal } from "@/components/exam/AntiFraudWarning";
import { FullscreenGate } from "@/components/exam/FullscreenGate";
import SessionInstructions from "@/components/exam/SessionInstructions";
import SessionBreak from "@/components/exam/SessionBreak";

/* ─── Colores por área ───────────────────────────────────────── */
const AREA_COLORES: Record<string, string> = {
  "Lectura Crítica": "#004aad",
  "Matemáticas": "#7c3aed",
  "Ciencias Naturales": "#059669",
  "Ciencias Sociales": "#d97706",
  "Inglés": "#dc2626",
  "Competencias Ciudadanas": "#0891b2",
};

/* ─── Types ──────────────────────────────────────────────────── */
interface AnswerOption { id: string; letra: string; texto: string; }

interface Question {
  id: string;
  area: string;
  contexto: string | null;
  enunciado: string;
  order: number;
  sessionOrder: number;
  sessionId: string;
  sessionType: "MANANA" | "TARDE";
  sessionLabel: string;
  options: AnswerOption[];
}

interface SessionSection {
  area: string;
  questionCount: number;
  duracionMinutos: number;
}

interface SessionInfo {
  id: string;
  type: "MANANA" | "TARDE";
  label: string;
  order: number;
  instructions?: string;
  pauseMinutes?: number;
  durationMinutes?: number;
  sections: SessionSection[];
}

interface SimulacroInfo {
  id: string;
  titulo: string;
  descripcion: string | null;
  duracionMinutos: number;
  totalPreguntas: number;
  areasEvaluadas: string[];
  color: string | null;
  emoji: string | null;
  allowBackNavigation: boolean;
  showResultsImmediately: boolean;
  securityConfig?: AntiFraudConfig | null;
}

interface Assignment {
  id: string;
  simulacro: SimulacroInfo;
  instructions: string | null;
  dueDate: string | null;
  score: number | null;
  completedAt: string | null;
}

interface ResultQuestion {
  questionId: string;
  area: string;
  contexto: string | null;
  enunciado: string;
  explicacion: string | null;
  selectedOptionId: string | null;
  selectedLetra: string | null;
  isCorrect: boolean;
  options: { id: string; letra: string; texto: string; isCorrect: boolean }[];
}

interface AttemptResults {
  attemptId: string;
  status: string;
  score: number;
  tiempoUsadoSeg: number | null;
  tabSwitchCount?: number;
  porArea: Record<string, { correctas: number; total: number; scaled?: number | null }>;
  preguntas: ResultQuestion[];
}

/* ─── localStorage helpers ───────────────────────────────────── */
const LS_ATTEMPT = (asigId: string) => `sim_attempt_${asigId}`;
const LS_AUTOSAVE = (attemptId: string) => `sim_autosave_${attemptId}`;

interface AutoSave {
  tiempoUsadoSeg: number;
  answers: Record<string, string>;
  ordenPreguntas: string[];
  currentSessionOrder: number;
  sessionStartedAt: string | null;
}

function saveAutosave(attemptId: string, data: AutoSave) {
  try { localStorage.setItem(LS_AUTOSAVE(attemptId), JSON.stringify(data)); } catch {}
}
function loadAutosave(attemptId: string): AutoSave | null {
  try { const r = localStorage.getItem(LS_AUTOSAVE(attemptId)); return r ? JSON.parse(r) : null; } catch { return null; }
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function formatTimer(seg: number) {
  const m = Math.floor(seg / 60);
  const s = seg % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

type Fase = "intro" | "session-instructions" | "examen" | "session-break" | "resultados" | "entregado";

/* ─── Componente principal ───────────────────────────────────── */
export default function SimulacroExamenPage() {
  const { user, loading } = useAuth();
  const { theme, toggleTheme, examClass } = useExamTheme();
  const router = useRouter();
  const params = useParams();
  const asigId = params.id as string;

  const [pageLoading, setPageLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);
  const [fase, setFase] = useState<Fase>("intro");

  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [attemptId, setAttemptId] = useState<string | null>(null);

  // Sessions
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [currentSessionOrder, setCurrentSessionOrder] = useState(1);

  // Exam state
  const [ordenPreguntas, setOrdenPreguntas] = useState<string[]>([]);
  const [respuestas, setRespuestas] = useState<Record<string, string>>({});
  const [marcadas, setMarcadas] = useState<Set<string>>(new Set());
  const [indicePregunta, setIndicePregunta] = useState(0);
  const [tiempoRestante, setTiempoRestante] = useState(0);
  const [confirmarEntrega, setConfirmarEntrega] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [advancingSession, setAdvancingSession] = useState(false);

  // Anti-fraud
  const [securityConfig, setSecurityConfig] = useState<AntiFraudConfig>(DEFAULT_ANTI_FRAUD_CONFIG);
  const [showFullscreenGate, setShowFullscreenGate] = useState(false);

  // Results
  const [resultados, setResultados] = useState<AttemptResults | null>(null);
  const [expandExplicacion, setExpandExplicacion] = useState<string | null>(null);

  const antiFraud = useAntiFraud({
    attemptId,
    evaluationType: "SIMULACRO",
    evaluationId: assignment?.simulacro.id ?? "",
    config: securityConfig,
    active: fase === "examen",
    onAutoSubmit: () => entregar(true),
  });

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const tiempoUsadoRef = useRef(0);
  const respuestasRef = useRef<Record<string, string>>({});
  const ordenRef = useRef<string[]>([]);
  const attemptIdRef = useRef<string | null>(null);
  const currentSessionOrderRef = useRef(1);

  /* ── Preguntas de la sesión actual ── */
  const sessionQuestions = useMemo(() => {
    if (sessions.length <= 1) return questions; // modo simple — todas
    return questions.filter(q => q.sessionOrder === currentSessionOrder);
  }, [questions, sessions, currentSessionOrder]);

  /* ── IDs de preguntas de la sesión actual en el orden guardado ── */
  const sessionOrden = useMemo(() => {
    const sessionQIds = new Set(sessionQuestions.map(q => q.id));
    return ordenPreguntas.filter(id => sessionQIds.has(id));
  }, [ordenPreguntas, sessionQuestions]);

  /* ── Sesión actual y siguiente ── */
  const currentSession = useMemo(() =>
    sessions.find(s => s.order === currentSessionOrder) ?? null,
    [sessions, currentSessionOrder]
  );
  const nextSession = useMemo(() =>
    sessions.find(s => s.order === currentSessionOrder + 1) ?? null,
    [sessions, currentSessionOrder]
  );
  const isMultiSession = sessions.length > 1;
  const isLastSession = !nextSession;

  /* ── Auth guard ── */
  useEffect(() => {
    if (!loading && !user) router.replace("/auth/login");
    if (!loading && user?.mustChangePassword) router.replace("/auth/change-password");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, loading]);

  /* ── Cargar asignación ── */
  useEffect(() => {
    if (loading || !user) return;
    (async () => {
      try {
        const assignments = await api.get<Assignment[]>("/simulacros/me");
        const found = assignments.find((a) => a.id === asigId) ?? null;
        if (!found) {
          setPageError("Simulacro no encontrado o no tienes acceso.");
        } else {
          setAssignment(found);
          api.get<AntiFraudConfig | null>(`/anti-fraud/config/SIMULACRO/${found.simulacro.id}`)
            .then(cfg => { if (cfg) setSecurityConfig(cfg); })
            .catch(() => {});
          if (found.completedAt) {
            const cached = localStorage.getItem(LS_ATTEMPT(asigId));
            if (cached) { setAttemptId(cached); attemptIdRef.current = cached; }
          }
        }
      } catch (e: any) {
        setPageError(e.message ?? "Error al cargar el simulacro.");
      } finally {
        setPageLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, user, asigId]);

  /* ── Modo enfoque ── */
  useEffect(() => {
    if (fase === "examen") {
      document.body.style.overflow = "hidden";
      document.body.classList.add("sim-focus-mode");
    } else {
      document.body.style.overflow = "";
      document.body.classList.remove("sim-focus-mode");
    }
    return () => { document.body.style.overflow = ""; document.body.classList.remove("sim-focus-mode"); };
  }, [fase]);

  /* ── Timer global ── */
  useEffect(() => {
    if (fase !== "examen") return;
    timerRef.current = setInterval(() => {
      setTiempoRestante((prev) => {
        const next = prev - 1;
        tiempoUsadoRef.current += 1;
        if (tiempoUsadoRef.current % 10 === 0 && attemptIdRef.current) {
          saveAutosave(attemptIdRef.current, {
            tiempoUsadoSeg: tiempoUsadoRef.current,
            answers: respuestasRef.current,
            ordenPreguntas: ordenRef.current,
            currentSessionOrder: currentSessionOrderRef.current,
            sessionStartedAt: null,
          });
        }
        if (next <= 0) {
          clearInterval(timerRef.current!);
          entregar(true);
          return 0;
        }
        return next;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fase]);

  /* ── Sync server time every 30s ── */
  useEffect(() => {
    if (fase !== "examen") return;
    const interval = setInterval(() => {
      const aId = attemptIdRef.current;
      if (!aId) return;
      api.get<{ status: string; timeRemainingSeconds: number | null }>(`/simulacros/attempts/${aId}/status`)
        .then(res => {
          if (res.status === "EXPIRED") {
            if (timerRef.current) clearInterval(timerRef.current);
            setTiempoRestante(0);
            api.get<AttemptResults>(`/simulacros/attempts/${aId}/results`)
              .then(r => { setResultados(r); setFase("resultados"); })
              .catch(() => { setFase("resultados"); });
          } else if (res.timeRemainingSeconds !== null) {
            setTiempoRestante(prev => {
              if (Math.abs(prev - res.timeRemainingSeconds!) > 5) return res.timeRemainingSeconds!;
              return prev;
            });
          }
        })
        .catch(() => {});
    }, 30000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fase]);

  /* ── Iniciar examen ── */
  async function iniciar() {
    if (!assignment) return;
    try {
      const res = await api.post<{
        attempt: { id: string; currentSessionOrder?: number; answers?: { questionId: string; selectedOptionId: string; isFlagged?: boolean }[] };
        resumed: boolean;
        timeRemainingSeconds: number | null;
        sessions?: SessionInfo[];
      }>(`/simulacros/assignments/${asigId}/start`, {});

      const aId = res.attempt.id;
      setAttemptId(aId);
      attemptIdRef.current = aId;
      localStorage.setItem(LS_ATTEMPT(asigId), aId);

      // Guardar sesiones
      const sessionsData = (res.sessions ?? []).sort((a, b) => a.order - b.order);
      setSessions(sessionsData);

      // Cargar preguntas
      const qRes = await api.get<{ simulacro: SimulacroInfo; questions: Question[] }>(
        `/simulacros/${assignment.simulacro.id}/questions`
      );
      setQuestions(qRes.questions);

      // Orden de preguntas (estable)
      const autosaved = loadAutosave(aId);
      let orden: string[];
      if (autosaved?.ordenPreguntas?.length === qRes.questions.length) {
        orden = autosaved.ordenPreguntas;
      } else {
        // Shuffle preservando el orden dentro de cada sesión
        if (sessionsData.length > 1) {
          // Shuffle por sesión individualmente para no mezclar sesiones
          const bySession = sessionsData.map(s =>
            shuffle(qRes.questions.filter(q => q.sessionOrder === s.order).map(q => q.id))
          );
          orden = bySession.flat();
        } else {
          orden = shuffle(qRes.questions.map(q => q.id));
        }
      }
      setOrdenPreguntas(orden);
      ordenRef.current = orden;

      // Restaurar respuestas
      let savedAnswers: Record<string, string> = {};
      let savedFlags = new Set<string>();
      if (res.resumed && res.attempt.answers) {
        for (const a of res.attempt.answers) {
          if (a.selectedOptionId) savedAnswers[a.questionId] = a.selectedOptionId;
          if (a.isFlagged) savedFlags.add(a.questionId);
        }
      }
      if (autosaved?.answers) savedAnswers = { ...savedAnswers, ...autosaved.answers };
      setRespuestas(savedAnswers);
      respuestasRef.current = savedAnswers;
      setMarcadas(savedFlags);

      // Restaurar sesión actual
      const savedSessionOrder = res.attempt.currentSessionOrder ?? autosaved?.currentSessionOrder ?? 1;
      setCurrentSessionOrder(savedSessionOrder);
      currentSessionOrderRef.current = savedSessionOrder;

      // Timer
      const tiempoUsado = autosaved?.tiempoUsadoSeg ?? 0;
      tiempoUsadoRef.current = tiempoUsado;
      if (res.timeRemainingSeconds !== null && res.timeRemainingSeconds !== undefined) {
        setTiempoRestante(res.timeRemainingSeconds);
      } else {
        const totalSeg = (assignment.simulacro.duracionMinutos ?? 45) * 60;
        setTiempoRestante(totalSeg - tiempoUsado);
      }

      // Si es multi-sesión y no está reanudando → instrucciones de sesión 1
      // Si está reanudando → ir directo al examen
      if (sessionsData.length > 1 && !res.resumed) {
        setFase("session-instructions");
      } else if (securityConfig.fullscreenRequired) {
        setShowFullscreenGate(true);
      } else {
        setFase("examen");
      }
    } catch (e: any) {
      alert(e.message ?? "Error al iniciar el simulacro.");
    }
  }

  /* ── Confirmar instrucciones y arrancar sesión ── */
  function iniciarSesionDesdeInstrucciones() {
    if (securityConfig.fullscreenRequired) {
      setShowFullscreenGate(true);
    } else {
      setFase("examen");
      // Reset indicePregunta al inicio de la sesión actual
      const sessionQIds = new Set(
        questions
          .filter(q => q.sessionOrder === currentSessionOrderRef.current)
          .map(q => q.id)
      );
      const firstIdx = ordenRef.current.findIndex(id => sessionQIds.has(id));
      setIndicePregunta(firstIdx >= 0 ? firstIdx : 0);
    }
  }

  async function aceptarFullscreen() {
    setShowFullscreenGate(false);
    await antiFraud.requestFullscreen();
    setFase("examen");
  }

  /* ── Ver resultados de simulacro completado ── */
  async function verResultados() {
    const aId = attemptIdRef.current ?? localStorage.getItem(LS_ATTEMPT(asigId));
    if (!aId || !assignment) { alert("No se encontraron los resultados guardados."); return; }
    try {
      const [res, qRes] = await Promise.all([
        api.get<AttemptResults>(`/simulacros/attempts/${aId}/results`),
        questions.length === 0
          ? api.get<{ simulacro: SimulacroInfo; questions: Question[] }>(
              `/simulacros/${assignment.simulacro.id}/questions`
            )
          : Promise.resolve(null),
      ]);
      if (qRes) setQuestions(qRes.questions);
      setResultados(res);
      setFase("resultados");
    } catch (e: any) {
      alert(e.message ?? "Error al cargar los resultados.");
    }
  }

  /* ── Responder pregunta ── */
  function responder(questionId: string, optionId: string) {
    const next = { ...respuestasRef.current, [questionId]: optionId };
    setRespuestas(next);
    respuestasRef.current = next;
    if (attemptIdRef.current) {
      saveAutosave(attemptIdRef.current, {
        tiempoUsadoSeg: tiempoUsadoRef.current,
        answers: next,
        ordenPreguntas: ordenRef.current,
        currentSessionOrder: currentSessionOrderRef.current,
        sessionStartedAt: null,
      });
      api.post(`/simulacros/attempts/${attemptIdRef.current}/save-answer`, {
        questionId, selectedOptionId: optionId, isFlagged: marcadas.has(questionId),
      }).catch(() => {});
    }
  }

  /* ── Marcar pregunta ── */
  function toggleMarcada(questionId: string) {
    setMarcadas((prev) => {
      const next = new Set(prev);
      if (next.has(questionId)) next.delete(questionId); else next.add(questionId);
      if (attemptIdRef.current) {
        api.post(`/simulacros/attempts/${attemptIdRef.current}/save-answer`, {
          questionId, isFlagged: !prev.has(questionId),
          ...(respuestasRef.current[questionId] ? { selectedOptionId: respuestasRef.current[questionId] } : {}),
        }).catch(() => {});
      }
      return next;
    });
  }

  /* ── Finalizar sesión (avanzar a la siguiente o entregar si es la última) ── */
  async function finalizarSesion() {
    if (!attemptIdRef.current) return;
    if (isLastSession) {
      // Es la última sesión — entregar
      await entregar(false);
      return;
    }
    // Hay más sesiones — avanzar
    setAdvancingSession(true);
    try {
      await api.post(`/simulacros/attempts/${attemptIdRef.current}/advance-session`, {});
      if (timerRef.current) clearInterval(timerRef.current);
      setAdvancingSession(false);
      setConfirmarEntrega(false);
      setFase("session-break");
    } catch (e: any) {
      alert(e.message ?? "Error al avanzar de sesión.");
      setAdvancingSession(false);
    }
  }

  /* ── Continuar después de la pausa ── */
  function continuarDespausaHaciaSiguienteSesion() {
    const nextOrder = currentSessionOrder + 1;
    setCurrentSessionOrder(nextOrder);
    currentSessionOrderRef.current = nextOrder;
    // Resetear posición al inicio de la siguiente sesión
    const sessionQIds = new Set(
      questions.filter(q => q.sessionOrder === nextOrder).map(q => q.id)
    );
    const firstIdx = ordenRef.current.findIndex(id => sessionQIds.has(id));
    setIndicePregunta(firstIdx >= 0 ? firstIdx : 0);
    setFase("session-instructions");
  }

  /* ── Entregar simulacro completo ── */
  const entregar = useCallback(async (automatico = false) => {
    if (!automatico) setConfirmarEntrega(false);
    if (timerRef.current) clearInterval(timerRef.current);
    const aId = attemptIdRef.current;
    if (!aId) return;
    setSubmitting(true);
    const answers = Object.entries(respuestasRef.current).map(([questionId, selectedOptionId]) => ({
      questionId, selectedOptionId,
    }));
    try {
      await api.post(`/simulacros/attempts/${aId}/submit`, {
        answers, tiempoUsadoSeg: tiempoUsadoRef.current,
      });
      try { localStorage.removeItem(LS_AUTOSAVE(aId)); } catch {}
      const showResults = assignment?.simulacro.showResultsImmediately !== false;
      if (showResults) {
        const res = await api.get<AttemptResults>(`/simulacros/attempts/${aId}/results`);
        setResultados(res);
        setFase("resultados");
      } else {
        setFase("entregado");
      }
    } catch (e: any) {
      alert(e.message ?? "Error al entregar el simulacro.");
    } finally {
      setSubmitting(false);
    }
  }, [assignment]);

  /* ─── Estados de carga / error ─────────────────────────────── */
  if (loading || pageLoading) {
    return (
      <div className={`sim-exam-wrapper ${examClass}`} style={{ alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "2.5rem", marginBottom: "12px" }}>⏳</div>
          <div style={{ fontFamily: "var(--font-poppins)", fontWeight: 700 }}>Cargando…</div>
        </div>
      </div>
    );
  }

  if (!user || pageError || !assignment) {
    return (
      <div className={`sim-exam-wrapper ${examClass}`} style={{ alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "2.5rem", marginBottom: "12px" }}>⚠️</div>
          <div style={{ fontFamily: "var(--font-poppins)", fontWeight: 700, marginBottom: 12 }}>
            {pageError ?? "No se encontró el simulacro."}
          </div>
          <Link href="/dashboard/simulacros" style={{ color: "#60a5fa", textDecoration: "underline" }}>
            ← Volver a mis simulacros
          </Link>
        </div>
      </div>
    );
  }

  const definicion = assignment.simulacro;

  /* ════════════════════════════════════════════
     FASE: INTRO
  ════════════════════════════════════════════ */
  if (fase === "intro") {
    const yaCompletado = !!assignment.completedAt;
    const enProgreso = !yaCompletado && !!localStorage.getItem(LS_ATTEMPT(asigId));

    return (
      <div className="sim-intro-wrapper">
        <div className="sim-intro-card">
          <div className="sim-intro-emoji">{definicion.emoji ?? "📝"}</div>
          <h1 className="sim-intro-titulo">{definicion.titulo}</h1>
          <p className="sim-intro-desc">{definicion.descripcion}</p>

          <div className="sim-intro-info-grid">
            <div className="sim-intro-info-item">
              <span className="sim-intro-info-icon">⏱</span>
              <div>
                <div className="sim-intro-info-valor">{definicion.duracionMinutos} min</div>
                <div className="sim-intro-info-label">Duración total</div>
              </div>
            </div>
            <div className="sim-intro-info-item">
              <span className="sim-intro-info-icon">❓</span>
              <div>
                <div className="sim-intro-info-valor">{definicion.totalPreguntas}</div>
                <div className="sim-intro-info-label">Preguntas</div>
              </div>
            </div>
            <div className="sim-intro-info-item">
              <span className="sim-intro-info-icon">📚</span>
              <div>
                <div className="sim-intro-info-valor">{definicion.areasEvaluadas.length}</div>
                <div className="sim-intro-info-label">Áreas</div>
              </div>
            </div>
          </div>

          <div className="sim-intro-areas">
            {definicion.areasEvaluadas.map((area) => (
              <span key={area} className="sim-intro-area-tag"
                style={{ borderColor: AREA_COLORES[area] ?? "#fff", color: AREA_COLORES[area] ?? "#fff" }}>
                {area}
              </span>
            ))}
          </div>

          <div className="sim-intro-instrucciones">
            <div className="sim-intro-instrucciones-titulo">📋 Instrucciones</div>
            {assignment.instructions && <p>{assignment.instructions}</p>}
            <ul className="sim-intro-instrucciones-lista">
              <li>Las preguntas se presentan en orden aleatorio y fijo para tu sesión.</li>
              <li>Puedes navegar entre preguntas usando los botones o el panel lateral.</li>
              <li>Marca preguntas para revisarlas antes de entregar.</li>
              <li>El simulacro se guardará automáticamente mientras avanzas.</li>
              {isMultiSession && <li>Este simulacro tiene <strong>2 sesiones</strong>. Habrá una pausa entre ellas.</li>}
            </ul>
          </div>

          {yaCompletado ? (
            <div style={{ textAlign: "center" }}>
              <div className="sim-intro-puntaje-previo">
                Ya completaste este simulacro con <strong>{Math.round(assignment.score ?? 0)}%</strong>
              </div>
              <button className="sim-intro-btn" style={{ marginLeft: 16 }} onClick={verResultados}>
                Ver resultados →
              </button>
            </div>
          ) : (
            <button className="sim-intro-btn" onClick={iniciar}>
              {enProgreso ? "Continuar simulacro →" : "Comenzar simulacro →"}
            </button>
          )}

          <Link href="/dashboard/simulacros" className="sim-intro-volver" style={{ marginTop: 8 }}>
            ← Volver a mis simulacros
          </Link>
        </div>
      </div>
    );
  }

  /* ════════════════════════════════════════════
     FASE: INSTRUCCIONES DE SESIÓN
  ════════════════════════════════════════════ */
  if (fase === "session-instructions" && currentSession) {
    return (
      <>
        {showFullscreenGate && (
          <FullscreenGate simulacroTitle={definicion.titulo} onAccept={aceptarFullscreen} />
        )}
        <SessionInstructions
          session={currentSession}
          sessionIndex={sessions.findIndex(s => s.order === currentSessionOrder)}
          totalSessions={sessions.length}
          onStart={iniciarSesionDesdeInstrucciones}
        />
      </>
    );
  }

  /* ════════════════════════════════════════════
     FASE: PAUSA ENTRE SESIONES
  ════════════════════════════════════════════ */
  if (fase === "session-break" && currentSession && nextSession) {
    const sessionAnswered = sessionOrden.filter(id => respuestasRef.current[id] !== undefined).length;
    return (
      <SessionBreak
        completedSession={currentSession}
        nextSession={nextSession}
        breakMinutes={nextSession.pauseMinutes ?? 0}
        answeredInSession={sessionAnswered}
        totalInSession={sessionOrden.length}
        onBreakEnd={continuarDespausaHaciaSiguienteSesion}
      />
    );
  }

  /* ════════════════════════════════════════════
     FASE: EXAMEN
  ════════════════════════════════════════════ */
  if (fase === "examen") {
    // En modo multi-sesión mostramos solo las preguntas de la sesión actual
    const displayOrden = isMultiSession ? sessionOrden : ordenPreguntas;
    const preguntaId = displayOrden[indicePregunta];
    const pregunta = questions.find((q) => q.id === preguntaId);
    if (!pregunta) return null;

    const totalRespondidas = Object.keys(respuestas).length;
    const sessionRespondidas = displayOrden.filter(id => respuestas[id] !== undefined).length;
    const timerPeligro = tiempoRestante < 300;
    const respuestaActualId = respuestas[pregunta.id];

    const mostrarContexto = (() => {
      if (!pregunta.contexto) return false;
      for (let i = 0; i < indicePregunta; i++) {
        const anterior = questions.find(q => q.id === displayOrden[i]);
        if (anterior?.contexto === pregunta.contexto) return false;
      }
      return true;
    })();

    const progresoRespondidas = (sessionRespondidas / displayOrden.length) * 100;

    return (
      <div className={`sim-exam-wrapper ${examClass}`}>
        {/* TopBar */}
        <div className="sim-exam-topbar">
          <div className="sim-exam-topbar-titulo">
            {definicion.titulo}
            {isMultiSession && currentSession && (
              <span style={{
                marginLeft: 12, fontSize: "0.72rem", fontWeight: 600, padding: "2px 10px",
                background: currentSession.type === "MANANA" ? "rgba(255,214,0,0.15)" : "rgba(100,100,255,0.15)",
                color: currentSession.type === "MANANA" ? "#f59e0b" : "#93c5fd",
                borderRadius: 20, verticalAlign: "middle",
              }}>
                {currentSession.type === "MANANA" ? "🌅" : "🌆"} {currentSession.label}
              </span>
            )}
          </div>
          <div className="sim-exam-topbar-centro">
            <span className={`sim-exam-timer ${timerPeligro ? "sim-timer-peligro" : ""}`}>
              {formatTimer(tiempoRestante)}
            </span>
          </div>
          <div className="sim-exam-topbar-progreso">
            {isMultiSession
              ? `${sessionRespondidas}/${displayOrden.length} (sesión) · ${totalRespondidas}/${definicion.totalPreguntas} total`
              : `${totalRespondidas}/${definicion.totalPreguntas} respondidas`
            }
          </div>
          <button
            className="sim-theme-toggle"
            onClick={toggleTheme}
            title={theme === "dark" ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
          >
            {theme === "dark" ? "☀️" : "🌙"}
          </button>
          <div className="sim-exam-progress-rail">
            <div className="sim-exam-progress-fill" style={{ width: `${progresoRespondidas}%` }} />
          </div>
        </div>

        {/* Layout */}
        <div className="sim-exam-layout">
          {/* Área de pregunta */}
          <div className="sim-exam-main">
            <div className="sim-exam-area-badge" style={{ background: AREA_COLORES[pregunta.area] ?? "#004aad" }}>
              {pregunta.area}
            </div>

            <div className="sim-exam-num">
              Pregunta {indicePregunta + 1} de {displayOrden.length}
              {isMultiSession && <span style={{ color: "#94a3b8", fontSize: "0.78rem", marginLeft: 8 }}>— {currentSession?.label}</span>}
            </div>

            {mostrarContexto && pregunta.contexto && (
              <div className="sim-exam-contexto">
                <div className="sim-exam-contexto-label">Lea el siguiente texto:</div>
                <p>{pregunta.contexto}</p>
              </div>
            )}
            {!mostrarContexto && pregunta.contexto && (
              <div className="sim-exam-contexto-ref">(Basada en el texto leído anteriormente)</div>
            )}

            <div className="sim-exam-enunciado">{pregunta.enunciado}</div>

            <div className="sim-exam-opciones">
              {pregunta.options.map((op) => {
                const seleccionada = respuestaActualId === op.id;
                return (
                  <button
                    key={op.id}
                    className={`sim-exam-opcion ${seleccionada ? "sim-opcion-seleccionada" : ""}`}
                    style={seleccionada ? {
                      borderColor: AREA_COLORES[pregunta.area] ?? "#004aad",
                      background: `${AREA_COLORES[pregunta.area] ?? "#004aad"}18`,
                    } : {}}
                    onClick={() => responder(pregunta.id, op.id)}
                  >
                    <span className={`sim-opcion-letra ${seleccionada ? "sim-letra-seleccionada" : ""}`}
                      style={seleccionada ? { background: AREA_COLORES[pregunta.area] ?? "#004aad", color: "#fff" } : {}}>
                      {op.letra}
                    </span>
                    <span className="sim-opcion-texto">{op.texto}</span>
                  </button>
                );
              })}
            </div>

            {/* Bottom bar */}
            <div className="sim-exam-bottombar">
              {definicion.allowBackNavigation !== false ? (
                <button className="sim-exam-nav-btn" disabled={indicePregunta === 0}
                  onClick={() => setIndicePregunta(i => i - 1)}>
                  ← Anterior
                </button>
              ) : <div />}

              <button
                className={`sim-exam-marcar-btn ${marcadas.has(pregunta.id) ? "sim-marcada-activa" : ""}`}
                onClick={() => toggleMarcada(pregunta.id)}
              >
                🚩 {marcadas.has(pregunta.id) ? "Marcada" : "Marcar"}
              </button>

              {indicePregunta < displayOrden.length - 1 ? (
                <button className="sim-exam-nav-btn" onClick={() => setIndicePregunta(i => i + 1)}>
                  Siguiente →
                </button>
              ) : (
                <button
                  className="sim-exam-entregar-btn"
                  disabled={submitting || advancingSession}
                  onClick={() => setConfirmarEntrega(true)}
                >
                  {submitting || advancingSession ? "Procesando…"
                    : isLastSession ? "Entregar ✓"
                    : "Finalizar sesión →"}
                </button>
              )}
            </div>

            <div style={{ textAlign: "right", marginTop: "8px" }}>
              <button className="sim-exam-entregar-link" disabled={submitting || advancingSession}
                onClick={() => setConfirmarEntrega(true)}>
                {isLastSession ? "Finalizar y entregar" : "Finalizar sesión actual"}
              </button>
            </div>
          </div>

          {/* Sidebar navegación */}
          <div className="sim-exam-sidebar">
            <div className="sim-exam-sidebar-titulo">
              {isMultiSession ? `Sesión: ${currentSession?.label ?? ""}` : "Navegación"}
            </div>
            <div className="sim-exam-nav-grid">
              {displayOrden.map((qId, idx) => {
                const esCurrent = idx === indicePregunta;
                const esMarcada = marcadas.has(qId);
                const esRespondida = respuestas[qId] !== undefined;
                let cls = "sim-nav-cell";
                if (esCurrent) cls += " sim-nav-current";
                else if (esMarcada) cls += " sim-nav-marcada";
                else if (esRespondida) cls += " sim-nav-respondida";
                return (
                  <button key={qId} className={cls} onClick={() => setIndicePregunta(idx)} title={`Pregunta ${idx + 1}`}>
                    {idx + 1}
                  </button>
                );
              })}
            </div>

            <div className="sim-exam-sidebar-leyenda">
              <div className="sim-leyenda-item"><span className="sim-leyenda-box sim-leyenda-respondida"></span> Respondida</div>
              <div className="sim-leyenda-item"><span className="sim-leyenda-box sim-leyenda-marcada"></span> Marcada</div>
              <div className="sim-leyenda-item"><span className="sim-leyenda-box sim-leyenda-current"></span> Actual</div>
              <div className="sim-leyenda-item"><span className="sim-leyenda-box sim-leyenda-sin"></span> Sin responder</div>
            </div>

            <div className="sim-exam-sidebar-resumen">
              <div className="sim-resumen-num sim-resumen-respondidas">{sessionRespondidas}</div>
              <div className="sim-resumen-label">respondidas</div>
              <div className="sim-resumen-num sim-resumen-sin">{displayOrden.length - sessionRespondidas}</div>
              <div className="sim-resumen-label">sin responder</div>
            </div>
          </div>
        </div>

        {/* FullscreenGate */}
        {showFullscreenGate && (
          <FullscreenGate simulacroTitle={definicion.titulo} onAccept={aceptarFullscreen} />
        )}

        {/* Anti-fraud warning */}
        {antiFraud.warning && (
          <AntiFraudWarningModal
            warning={antiFraud.warning}
            maxViolations={securityConfig.maxViolations}
            isFullscreenRequired={securityConfig.fullscreenRequired}
            onDismiss={antiFraud.dismissWarning}
            onRequestFullscreen={antiFraud.requestFullscreen}
          />
        )}

        {/* Modal confirmación entregar/avanzar sesión */}
        {confirmarEntrega && (
          <div className="sim-modal-overlay">
            <div className="sim-modal">
              <div className="sim-modal-icon">{isLastSession ? "⚠️" : "✅"}</div>
              <h3 className="sim-modal-titulo">
                {isLastSession ? "¿Entregar el simulacro?" : `¿Finalizar ${currentSession?.label}?`}
              </h3>
              <p className="sim-modal-desc">
                {isLastSession ? (
                  <>Has respondido <strong>{sessionRespondidas}</strong> de <strong>{displayOrden.length}</strong> preguntas
                    {sessionRespondidas < displayOrden.length && <> · <strong>{displayOrden.length - sessionRespondidas}</strong> sin responder</>}.
                  </>
                ) : (
                  <>Has respondido <strong>{sessionRespondidas}</strong> de <strong>{displayOrden.length}</strong> preguntas en esta sesión.
                    Pasarás a la <strong>{nextSession?.label}</strong>.
                  </>
                )}
              </p>
              <div className="sim-modal-btns">
                <button className="sim-modal-cancelar" onClick={() => setConfirmarEntrega(false)}>Cancelar</button>
                <button className="sim-modal-confirmar" disabled={submitting || advancingSession}
                  onClick={() => isLastSession ? entregar(false) : finalizarSesion()}>
                  {submitting || advancingSession ? "Procesando…" : isLastSession ? "Sí, entregar" : "Continuar"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  /* ════════════════════════════════════════════
     FASE: RESULTADOS
  ════════════════════════════════════════════ */
  if (fase === "resultados" && resultados) {
    const puntaje = resultados.score ?? 0;
    const puntajeRedondeado = Math.round(puntaje);
    const isExpired = resultados.status === "EXPIRED";
    const colorPuntaje = puntaje >= 70 ? "#059669" : puntaje >= 50 ? "#d97706" : "#dc2626";
    const mensajeMotivacional = isExpired
      ? "El tiempo expiró. Tus respuestas guardadas hasta ese momento fueron enviadas automáticamente."
      : puntaje >= 80 ? "¡Excelente resultado! Estás muy bien preparado para el ICFES."
      : puntaje >= 70 ? "¡Buen trabajo! Con un poco más de práctica llegarás al puntaje ideal."
      : puntaje >= 50 ? "Vas por buen camino. Repasa las áreas con menor puntaje y vuelve a intentarlo."
      : "No te desanimes. Revisa las explicaciones de cada pregunta y vuelve a practicar.";
    const nivelLabel = puntaje >= 80 ? "Excelente" : puntaje >= 70 ? "Muy bien" : puntaje >= 50 ? "Regular" : "Mejorable";

    const correctasTotales = resultados.preguntas.filter(p => p.isCorrect).length;
    const incorrectasTotales = resultados.preguntas.filter(p => !p.isCorrect).length;
    const sinResponderTotales = definicion.totalPreguntas - resultados.preguntas.length;

    // Sesiones derivadas desde las preguntas (funciona aunque sessions[] esté vacío)
    const sessionsFromQuestions = (() => {
      const map = new Map<number, { order: number; label: string; type: "MANANA" | "TARDE"; id: string }>();
      for (const q of questions) {
        if (!map.has(q.sessionOrder)) {
          map.set(q.sessionOrder, { order: q.sessionOrder, label: q.sessionLabel, type: q.sessionType, id: q.sessionId });
        }
      }
      return Array.from(map.values()).sort((a, b) => a.order - b.order);
    })();
    const showSessionBreakdown = sessionsFromQuestions.length > 1;

    const R = 42;
    const CIRC = 2 * Math.PI * R;
    const strokeDash = (puntaje / 100) * CIRC;

    const answeredIds = new Set(resultados.preguntas.map(p => p.questionId));
    const preguntasCompletas = [
      ...resultados.preguntas,
      ...questions.filter(q => !answeredIds.has(q.id)).map(q => ({
        questionId: q.id, area: q.area, enunciado: q.enunciado, contexto: q.contexto,
        explicacion: null, selectedOptionId: null, selectedLetra: null, isCorrect: false,
        options: q.options.map(o => ({ ...o, isCorrect: false })),
      })),
    ];

    return (
      <>
        <Navbar />
        <div className="sim-result-page">
          <div className="sim-result-container">

            {/* HERO */}
            <div className="sim-result-hero">
              <div className="sim-result-hero-info">
                <div className="sim-result-hero-tag">
                  <span>{definicion.emoji ?? "📝"}</span>
                  {isExpired ? "Simulacro — Tiempo agotado" : "Resultados del Simulacro"}
                  {isExpired && (
                    <span style={{ marginLeft: 8, background: "#dc2626", color: "#fff", fontSize: "0.7rem", padding: "2px 8px", borderRadius: 20, fontWeight: 700 }}>
                      TIEMPO EXPIRADO
                    </span>
                  )}
                </div>
                <h1 className="sim-result-hero-titulo">{definicion.titulo}</h1>
                <p className="sim-result-hero-mensaje">{mensajeMotivacional}</p>

                <div className="sim-result-mini-stats">
                  <div className="sim-ms-card sim-ms-verde">
                    <div className="sim-ms-num">{correctasTotales}</div>
                    <div className="sim-ms-label">Correctas</div>
                  </div>
                  <div className="sim-ms-card sim-ms-rojo">
                    <div className="sim-ms-num">{incorrectasTotales}</div>
                    <div className="sim-ms-label">Incorrectas</div>
                  </div>
                  <div className="sim-ms-card sim-ms-gris">
                    <div className="sim-ms-num">{sinResponderTotales}</div>
                    <div className="sim-ms-label">Sin responder</div>
                  </div>
                </div>
              </div>

              {/* Círculo puntaje */}
              <div className="sim-result-score-wrap">
                <svg className="sim-result-svg" viewBox="0 0 100 100" aria-hidden>
                  <circle cx="50" cy="50" r={R} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="8" />
                  <circle cx="50" cy="50" r={R} fill="none" stroke={colorPuntaje} strokeWidth="8"
                    strokeDasharray={`${strokeDash} ${CIRC}`} strokeLinecap="round"
                    transform="rotate(-90 50 50)" className="sim-result-svg-arc" />
                </svg>
                <div className="sim-result-score-center">
                  <div className="sim-result-score-num" style={{ color: colorPuntaje }}>{puntajeRedondeado}%</div>
                  <div className="sim-result-score-nivel" style={{ color: colorPuntaje }}>{nivelLabel}</div>
                  <div className="sim-result-score-sub">{correctasTotales}/{definicion.totalPreguntas} correctas</div>
                </div>
              </div>
            </div>

            {/* DESEMPEÑO POR ÁREA */}
            <div className="sim-result-section">
              <h2 className="sim-result-section-titulo">Desempeño por área</h2>
              <div className="sim-result-areas-grid">
                {Object.entries(resultados.porArea).map(([area, data]) => {
                  const { correctas, total, scaled } = data as { correctas: number; total: number; scaled?: number | null };
                  const pct = Math.round((correctas / total) * 100);
                  const color = AREA_COLORES[area] ?? "#004aad";
                  const nivelArea = pct >= 80 ? "Excelente" : pct >= 60 ? "Bien" : pct >= 40 ? "Regular" : "A mejorar";
                  return (
                    <div key={area} className="sim-result-area-card">
                      <div className="sim-result-area-header">
                        <div className="sim-result-area-nombre" style={{ color }}>{area}</div>
                        <div className="sim-result-area-pct" style={{ color }}>
                          {scaled != null ? <span title={`${pct}% correcto`}>{scaled} pts</span> : `${pct}%`}
                        </div>
                      </div>
                      <div className="sim-result-area-barra-bg">
                        <div className="sim-result-area-barra" style={{ width: `${pct}%`, background: color }} />
                      </div>
                      <div className="sim-result-area-footer">
                        <span className="sim-result-area-score">{correctas}/{total} correctas</span>
                        <span className="sim-result-area-nivel" style={{ color }}>{nivelArea}</span>
                      </div>
                      {scaled != null && (
                        <div style={{ marginTop: 6, fontSize: "0.72rem", color: "#64748b" }}>
                          Puntaje ICFES escalado: <strong style={{ color }}>{scaled}/500</strong>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* DESGLOSE POR SESIÓN */}
            {showSessionBreakdown && (
              <div className="sim-result-section">
                <h2 className="sim-result-section-titulo">Desglose por sesión</h2>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 20 }}>
                  {sessionsFromQuestions.map(session => {
                    const sessionQIds = new Set(questions.filter(q => q.sessionOrder === session.order).map(q => q.id));
                    const sessionResults = preguntasCompletas.filter(p => sessionQIds.has(p.questionId));
                    const correctas = sessionResults.filter(p => p.isCorrect).length;
                    const total = sessionResults.length;
                    const pct = total > 0 ? Math.round((correctas / total) * 100) : 0;
                    const areaMap: Record<string, { correctas: number; total: number }> = {};
                    for (const p of sessionResults) {
                      if (!areaMap[p.area]) areaMap[p.area] = { correctas: 0, total: 0 };
                      areaMap[p.area].total++;
                      if (p.isCorrect) areaMap[p.area].correctas++;
                    }
                    const colorPct = pct >= 70 ? "#059669" : pct >= 50 ? "#d97706" : "#dc2626";
                    return (
                      <div key={session.id} style={{ background: "#fff", border: "1px solid #e2eaf7", borderRadius: 16, padding: "20px 22px", boxShadow: "0 2px 10px rgba(0,74,173,0.06)" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
                          <span style={{ fontSize: "1.6rem" }}>{session.type === "MANANA" ? "🌅" : "🌆"}</span>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 800, color: "#1e293b", fontSize: "0.95rem" }}>{session.label}</div>
                            <div style={{ fontSize: "0.75rem", color: "#64748b" }}>{total} preguntas</div>
                          </div>
                          <div style={{ textAlign: "right", flexShrink: 0 }}>
                            <div style={{ fontSize: "1.7rem", fontWeight: 800, color: colorPct, lineHeight: 1 }}>{pct}%</div>
                            <div style={{ fontSize: "0.72rem", color: "#94a3b8" }}>{correctas}/{total}</div>
                          </div>
                        </div>
                        <div style={{ height: 6, background: "#f1f5f9", borderRadius: 3, marginBottom: 14 }}>
                          <div style={{ height: "100%", width: `${pct}%`, background: colorPct, borderRadius: 3 }} />
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                          {Object.entries(areaMap).map(([area, data]) => {
                            const areaPct = Math.round((data.correctas / data.total) * 100);
                            const areaColor = AREA_COLORES[area] ?? "#004aad";
                            return (
                              <div key={area} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <span style={{ fontSize: "0.78rem", color: areaColor, fontWeight: 600, flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{area}</span>
                                <div style={{ flex: "0 0 72px", height: 4, background: "#f1f5f9", borderRadius: 2 }}>
                                  <div style={{ height: "100%", width: `${areaPct}%`, background: areaColor, borderRadius: 2 }} />
                                </div>
                                <span style={{ fontSize: "0.72rem", color: "#64748b", flex: "0 0 36px", textAlign: "right" }}>{areaPct}%</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {(resultados.tabSwitchCount ?? 0) > 0 && (
              <div style={{ background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: 12, padding: "14px 20px", marginBottom: 24, display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontSize: "1.3rem" }}>⚠️</span>
                <div>
                  <div style={{ fontWeight: 700, color: "#c2410c", fontSize: "0.9rem" }}>Cambios de pestaña detectados</div>
                  <div style={{ color: "#92400e", fontSize: "0.82rem" }}>
                    Se detectaron <strong>{resultados.tabSwitchCount}</strong> cambio{resultados.tabSwitchCount !== 1 ? "s" : ""} durante el examen. Esto queda registrado para el administrador.
                  </div>
                </div>
              </div>
            )}

            {/* REVISIÓN DETALLADA */}
            <div className="sim-result-section">
              <h2 className="sim-result-section-titulo">Revisión detallada</h2>
              <div className="sim-result-preguntas-lista">
                {preguntasCompletas.map((p, idx) => {
                  const sinResponder = p.selectedOptionId === null;
                  const esCorrecta = p.isCorrect;
                  const correctaOption = p.options.find(o => o.isCorrect);
                  return (
                    <div key={p.questionId}
                      className={`sim-result-pregunta-item ${esCorrecta ? "sim-rp-correcta" : sinResponder ? "sim-rp-sin" : "sim-rp-incorrecta"}`}>
                      <div className="sim-rp-header">
                        <span className="sim-rp-num">P{idx + 1}</span>
                        <span className="sim-rp-area" style={{ color: AREA_COLORES[p.area] ?? "#004aad" }}>{p.area}</span>
                        <span className={`sim-rp-icono ${esCorrecta ? "sim-rp-ok" : sinResponder ? "sim-rp-neutro" : "sim-rp-mal"}`}>
                          {sinResponder ? "—" : esCorrecta ? "✓" : "✗"}
                        </span>
                      </div>
                      <div className="sim-rp-enunciado">
                        {p.enunciado.length > 120 ? p.enunciado.slice(0, 120) + "…" : p.enunciado}
                      </div>
                      <div className="sim-rp-respuestas">
                        {!sinResponder && (
                          <span className={`sim-rp-resp ${esCorrecta ? "sim-resp-ok" : "sim-resp-mal"}`}>
                            Tu respuesta: {p.selectedLetra}
                          </span>
                        )}
                        {!esCorrecta && correctaOption && (
                          <span className="sim-rp-resp sim-resp-correcta">Correcta: {correctaOption.letra}</span>
                        )}
                      </div>
                      {p.explicacion && (
                        <div>
                          <button className="sim-rp-explicacion-toggle"
                            onClick={() => setExpandExplicacion(expandExplicacion === p.questionId ? null : p.questionId)}>
                            {expandExplicacion === p.questionId ? "▲ Ocultar" : "▼ Ver"} explicación
                          </button>
                          {expandExplicacion === p.questionId && (
                            <div className="sim-rp-explicacion">{p.explicacion}</div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="sim-result-footer">
              <Link href="/dashboard/simulacros" className="sim-result-volver-btn">← Volver a mis simulacros</Link>
            </div>
          </div>
        </div>
      </>
    );
  }

  /* ════════════════════════════════════════════
     FASE: ENTREGADO
  ════════════════════════════════════════════ */
  if (fase === "entregado") {
    return (
      <>
        <Navbar />
        <div style={{ minHeight: "100vh", background: "#f0f4ff", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div style={{ background: "#fff", borderRadius: 20, border: "1px solid #e2eaf7", boxShadow: "0 4px 24px rgba(0,74,173,0.08)", padding: "48px 40px", maxWidth: 480, width: "100%", textAlign: "center" }}>
            <div style={{ fontSize: "3rem", marginBottom: 16 }}>✅</div>
            <h1 style={{ fontSize: "1.4rem", fontWeight: 800, color: "#1e293b", margin: "0 0 10px" }}>¡Simulacro entregado!</h1>
            <p style={{ color: "#64748b", fontSize: "0.9rem", lineHeight: 1.6, margin: "0 0 28px" }}>
              Tu respuesta fue enviada correctamente. Los resultados serán publicados por tu profesor próximamente.
            </p>
            <div style={{ background: "#eff6ff", borderRadius: 12, padding: "14px 20px", marginBottom: 28, display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: "1.2rem" }}>📋</span>
              <div style={{ textAlign: "left" }}>
                <div style={{ fontWeight: 700, color: "#004aad", fontSize: "0.88rem" }}>{definicion.titulo}</div>
                <div style={{ color: "#3b82f6", fontSize: "0.78rem", marginTop: 2 }}>{definicion.totalPreguntas} preguntas · {definicion.duracionMinutos} min</div>
              </div>
            </div>
            <Link href="/dashboard/simulacros"
              style={{ display: "inline-block", padding: "12px 28px", background: "#004aad", color: "#fff", borderRadius: 10, fontWeight: 700, textDecoration: "none", fontSize: "0.9rem" }}>
              Volver a mis simulacros
            </Link>
          </div>
        </div>
      </>
    );
  }

  return null;
}
