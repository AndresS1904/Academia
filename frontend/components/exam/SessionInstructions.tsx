"use client";

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
  session: SessionInfo;
  sessionIndex: number;
  totalSessions: number;
  onStart: () => void;
}

export default function SessionInstructions({ session, sessionIndex, totalSessions, onStart }: Props) {
  const isManana = session.type === "MANANA";
  const totalPreguntas = session.sections.reduce((s, x) => s + x.questionCount, 0);
  const totalMinutos = session.durationMinutes
    || session.sections.reduce((s, x) => s + x.duracionMinutos, 0);
  const horas = Math.floor(totalMinutos / 60);
  const minutos = totalMinutos % 60;
  const tiempoLabel = horas > 0
    ? `${horas}h${minutos > 0 ? ` ${minutos}min` : ""}`
    : `${minutos} minutos`;

  const defaultInstructions = isManana
    ? `Bienvenido a la sesión de la mañana. Esta sesión evalúa ${session.sections.map(s => s.area).join(" y ")}.\n\nLee cuidadosamente cada pregunta antes de responder. Puedes navegar entre las preguntas usando el panel lateral. Administra bien tu tiempo — tienes ${tiempoLabel} para esta sesión.\n\nNo está permitido consultar apuntes, teléfonos ni ningún material externo durante el examen.`
    : `Bienvenido a la sesión de la tarde. Esta sesión evalúa ${session.sections.map(s => s.area).join(", ")}.\n\nSigue las mismas reglas de la sesión anterior. Mantén la concentración y responde todas las preguntas. Recuerda que puedes marcar preguntas para revisarlas después.`;

  const instrucciones = session.instructions || defaultInstructions;

  return (
    <div style={{
      minHeight: "100vh",
      background: "#f8fafc",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "32px 20px",
    }}>
      <div style={{ maxWidth: 680, width: "100%" }}>

        {/* Header oficial */}
        <div style={{
          background: "#fff",
          borderRadius: 16,
          border: "2px solid #004aad",
          overflow: "hidden",
          boxShadow: "0 4px 24px rgba(0,74,173,0.10)",
        }}>
          {/* Banner sesión */}
          <div style={{
            background: isManana
              ? "linear-gradient(135deg, #004aad 0%, #1e40af 100%)"
              : "linear-gradient(135deg, #1e3a5f 0%, #004aad 100%)",
            padding: "28px 36px",
            color: "#fff",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
              <span style={{ fontSize: "2rem" }}>{isManana ? "🌅" : "🌆"}</span>
              <div>
                <div style={{ fontSize: "0.75rem", fontWeight: 600, opacity: 0.7, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                  Sesión {sessionIndex + 1} de {totalSessions}
                </div>
                <h1 style={{ fontSize: "1.6rem", fontWeight: 800, margin: 0 }}>{session.label}</h1>
              </div>
            </div>
            <div style={{ display: "flex", gap: 20, marginTop: 16, flexWrap: "wrap" }}>
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <span style={{ fontSize: "1rem" }}>📋</span>
                <span style={{ fontSize: "0.9rem", fontWeight: 600 }}>{totalPreguntas} preguntas</span>
              </div>
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <span style={{ fontSize: "1rem" }}>⏱</span>
                <span style={{ fontSize: "0.9rem", fontWeight: 600 }}>{tiempoLabel}</span>
              </div>
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <span style={{ fontSize: "1rem" }}>📚</span>
                <span style={{ fontSize: "0.9rem", fontWeight: 600 }}>{session.sections.length} {session.sections.length === 1 ? "área" : "áreas"}</span>
              </div>
            </div>
          </div>

          {/* Bloques por área */}
          <div style={{ padding: "24px 36px", borderBottom: "1px solid #e2eaf7" }}>
            <h3 style={{ fontSize: "0.8rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 14px" }}>
              Áreas evaluadas
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {session.sections.map((sec, i) => {
                const secHoras = Math.floor(sec.duracionMinutos / 60);
                const secMins = sec.duracionMinutos % 60;
                const secTiempo = secHoras > 0 ? `${secHoras}h${secMins > 0 ? ` ${secMins}min` : ""}` : `${secMins} min`;
                return (
                  <div key={i} style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "12px 16px",
                    background: "#f8fafc",
                    borderRadius: 10,
                    border: "1px solid #e2eaf7",
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{
                        width: 8, height: 8, borderRadius: "50%",
                        background: ["#004aad", "#7c3aed", "#059669", "#dc2626", "#d97706"][i % 5],
                      }} />
                      <span style={{ fontWeight: 600, color: "#1e293b", fontSize: "0.9rem" }}>{sec.area}</span>
                    </div>
                    <div style={{ display: "flex", gap: 16, fontSize: "0.82rem", color: "#64748b" }}>
                      <span>{sec.questionCount} preguntas</span>
                      {sec.duracionMinutos > 0 && <span>{secTiempo}</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Instrucciones */}
          <div style={{ padding: "24px 36px", borderBottom: "1px solid #e2eaf7" }}>
            <h3 style={{ fontSize: "0.8rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 14px" }}>
              Instrucciones
            </h3>
            <div style={{ fontSize: "0.9rem", color: "#334155", lineHeight: 1.8 }}>
              {instrucciones.split("\n").map((line, i) => (
                <p key={i} style={{ margin: "0 0 8px" }}>{line}</p>
              ))}
            </div>
          </div>

          {/* Reglas rápidas */}
          <div style={{ padding: "20px 36px", borderBottom: "1px solid #e2eaf7", background: "#fffbeb" }}>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              {[
                "⛔ No cambies de pestaña",
                "📵 Sin materiales externos",
                "🔒 Mantén pantalla completa",
                "💾 Respuestas guardadas automáticamente",
              ].map((rule, i) => (
                <span key={i} style={{
                  padding: "4px 12px",
                  background: "#fef9c3",
                  border: "1px solid #fde047",
                  borderRadius: 20,
                  fontSize: "0.78rem",
                  color: "#854d0e",
                  fontWeight: 600,
                }}>
                  {rule}
                </span>
              ))}
            </div>
          </div>

          {/* Botón iniciar */}
          <div style={{ padding: "24px 36px", display: "flex", justifyContent: "flex-end" }}>
            <button
              onClick={onStart}
              style={{
                padding: "14px 40px",
                background: "linear-gradient(135deg, #004aad 0%, #1e40af 100%)",
                color: "#fff",
                border: "none",
                borderRadius: 12,
                fontWeight: 700,
                fontSize: "1rem",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 10,
                boxShadow: "0 4px 14px rgba(0,74,173,0.35)",
              }}
            >
              {sessionIndex === 0 ? "Comenzar sesión" : "Iniciar sesión de la tarde"} →
            </button>
          </div>
        </div>

        <p style={{ textAlign: "center", color: "#94a3b8", fontSize: "0.78rem", marginTop: 16 }}>
          Una vez que inicies la sesión, el temporizador comenzará a correr.
        </p>
      </div>
    </div>
  );
}
