"use client";

import { useState, useEffect } from "react";

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

interface Props {
  completedSession: SessionInfo;
  nextSession: SessionInfo;
  breakMinutes: number;            // duración de la pausa en minutos
  answeredInSession: number;
  totalInSession: number;
  onBreakEnd: () => void;
}

export default function SessionBreak({
  completedSession,
  nextSession,
  breakMinutes,
  answeredInSession,
  totalInSession,
  onBreakEnd,
}: Props) {
  const totalBreakSeconds = breakMinutes * 60;
  const [secondsLeft, setSecondsLeft] = useState(totalBreakSeconds);
  const canContinue = secondsLeft <= 0;

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const t = setInterval(() => {
      setSecondsLeft(s => {
        if (s <= 1) { clearInterval(t); return 0; }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, []);

  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, "0");
  const ss = String(secondsLeft % 60).padStart(2, "0");
  const progress = totalBreakSeconds > 0 ? (1 - secondsLeft / totalBreakSeconds) : 1;
  const pct = Math.round(answeredInSession / Math.max(totalInSession, 1) * 100);
  const nextTotalPreguntas = nextSession.sections.reduce((s, x) => s + x.questionCount, 0);
  const nextTotalMinutos = nextSession.durationMinutes
    || nextSession.sections.reduce((s, x) => s + x.duracionMinutos, 0);

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(160deg, #0f172a 0%, #1e293b 100%)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "32px 20px",
    }}>
      <div style={{ maxWidth: 560, width: "100%", textAlign: "center" }}>

        {/* Ícono de pausa */}
        <div style={{ fontSize: "4rem", marginBottom: 20 }}>☕</div>

        {/* Título */}
        <h1 style={{ fontSize: "1.8rem", fontWeight: 800, color: "#fff", margin: "0 0 8px" }}>
          Sesión de la mañana completada
        </h1>
        <p style={{ color: "#94a3b8", fontSize: "0.95rem", margin: "0 0 32px" }}>
          Tómate un descanso. La siguiente sesión comenzará pronto.
        </p>

        {/* Resumen sesión completada */}
        <div style={{
          background: "rgba(255,255,255,0.06)",
          border: "1px solid rgba(255,255,255,0.12)",
          borderRadius: 14,
          padding: "20px 24px",
          marginBottom: 24,
          textAlign: "left",
        }}>
          <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12 }}>
            Resumen — {completedSession.label}
          </div>
          <div style={{ display: "flex", gap: 32 }}>
            <div>
              <div style={{ fontSize: "1.8rem", fontWeight: 800, color: "#fff" }}>{answeredInSession}</div>
              <div style={{ fontSize: "0.8rem", color: "#94a3b8" }}>respondidas</div>
            </div>
            <div>
              <div style={{ fontSize: "1.8rem", fontWeight: 800, color: answeredInSession < totalInSession ? "#f59e0b" : "#22c55e" }}>
                {totalInSession - answeredInSession}
              </div>
              <div style={{ fontSize: "0.8rem", color: "#94a3b8" }}>sin responder</div>
            </div>
            <div>
              <div style={{ fontSize: "1.8rem", fontWeight: 800, color: pct >= 80 ? "#22c55e" : pct >= 50 ? "#f59e0b" : "#f87171" }}>
                {pct}%
              </div>
              <div style={{ fontSize: "0.8rem", color: "#94a3b8" }}>completado</div>
            </div>
          </div>
        </div>

        {/* Countdown */}
        {!canContinue && (
          <div style={{ marginBottom: 28 }}>
            <div style={{ fontSize: "0.8rem", color: "#64748b", marginBottom: 12 }}>Tiempo de descanso</div>
            <div style={{
              fontSize: "3.5rem",
              fontWeight: 800,
              color: "#fff",
              fontFamily: "monospace",
              letterSpacing: "0.04em",
            }}>
              {mm}:{ss}
            </div>
            {/* Barra de progreso */}
            <div style={{ height: 4, background: "rgba(255,255,255,0.1)", borderRadius: 4, marginTop: 16, overflow: "hidden" }}>
              <div style={{
                height: "100%",
                width: `${progress * 100}%`,
                background: "linear-gradient(90deg, #004aad, #3b82f6)",
                borderRadius: 4,
                transition: "width 1s linear",
              }} />
            </div>
          </div>
        )}

        {/* Info sesión siguiente */}
        <div style={{
          background: "rgba(0,74,173,0.15)",
          border: "1px solid rgba(0,74,173,0.4)",
          borderRadius: 14,
          padding: "18px 24px",
          marginBottom: 28,
          textAlign: "left",
        }}>
          <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "#93c5fd", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>
            A continuación
          </div>
          <div style={{ fontWeight: 700, color: "#fff", fontSize: "1rem", marginBottom: 8 }}>
            🌆 {nextSession.label}
          </div>
          <div style={{ display: "flex", gap: 20, fontSize: "0.85rem", color: "#94a3b8" }}>
            <span>📋 {nextTotalPreguntas} preguntas</span>
            {nextTotalMinutos > 0 && (
              <span>⏱ {Math.floor(nextTotalMinutos / 60) > 0 ? `${Math.floor(nextTotalMinutos / 60)}h ` : ""}{nextTotalMinutos % 60 > 0 ? `${nextTotalMinutos % 60}min` : ""}</span>
            )}
          </div>
          <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap" }}>
            {nextSession.sections.map((s, i) => (
              <span key={i} style={{ padding: "3px 10px", background: "rgba(59,130,246,0.2)", color: "#93c5fd", borderRadius: 20, fontSize: "0.75rem", fontWeight: 600 }}>
                {s.area}
              </span>
            ))}
          </div>
        </div>

        {/* Botón continuar */}
        <button
          onClick={onBreakEnd}
          disabled={!canContinue}
          style={{
            padding: "14px 48px",
            background: canContinue
              ? "linear-gradient(135deg, #004aad 0%, #1e40af 100%)"
              : "rgba(255,255,255,0.1)",
            color: canContinue ? "#fff" : "#475569",
            border: "none",
            borderRadius: 12,
            fontWeight: 700,
            fontSize: "1rem",
            cursor: canContinue ? "pointer" : "not-allowed",
            transition: "all 0.3s",
            boxShadow: canContinue ? "0 4px 14px rgba(0,74,173,0.4)" : "none",
          }}
        >
          {canContinue ? "Continuar con la sesión de la tarde →" : `Disponible en ${mm}:${ss}`}
        </button>

        {canContinue && (
          <p style={{ color: "#64748b", fontSize: "0.8rem", marginTop: 12 }}>
            El temporizador de la sesión comenzará cuando hagas clic.
          </p>
        )}
      </div>
    </div>
  );
}
