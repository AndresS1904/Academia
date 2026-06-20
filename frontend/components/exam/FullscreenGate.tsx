"use client";

interface Props {
  onAccept: () => void;
  simulacroTitle: string;
}

export function FullscreenGate({ onAccept, simulacroTitle }: Props) {
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9998,
      background: "#0d1117",
      display: "flex", alignItems: "center", justifyContent: "center", padding: 24,
    }}>
      <div style={{
        background: "#1a2236", borderRadius: 20, maxWidth: 500, width: "100%",
        padding: "40px 36px", textAlign: "center",
        border: "1px solid rgba(255,255,255,0.1)",
      }}>
        <div style={{ fontSize: "3rem", marginBottom: 16 }}>🖥️</div>
        <h2 style={{ fontSize: "1.4rem", fontWeight: 800, color: "#fff", margin: "0 0 12px" }}>
          Este simulacro requiere pantalla completa
        </h2>
        <p style={{ color: "#94a3b8", fontSize: "0.9rem", lineHeight: 1.6, margin: "0 0 28px" }}>
          <strong style={{ color: "#e2e8f0" }}>{simulacroTitle}</strong> debe realizarse en
          modo pantalla completa. Si sales durante el examen se registrará como infracción.
        </p>

        <div style={{
          background: "rgba(0,74,173,0.15)", border: "1px solid rgba(0,74,173,0.3)",
          borderRadius: 12, padding: "14px 18px", marginBottom: 28, textAlign: "left",
        }}>
          <div style={{ fontWeight: 700, color: "#60a5fa", fontSize: "0.82rem", marginBottom: 8 }}>
            Al continuar aceptas que:
          </div>
          {[
            "El sistema detectará si sales de pantalla completa",
            "Se registrarán cambios de pestaña o pérdida de foco",
            "Copiar o pegar texto estará bloqueado",
            "Las infracciones quedan registradas y visibles para el docente",
          ].map(t => (
            <div key={t} style={{ display: "flex", gap: 8, marginBottom: 6, color: "#94a3b8", fontSize: "0.82rem" }}>
              <span style={{ color: "#34d399", flexShrink: 0 }}>✓</span> {t}
            </div>
          ))}
        </div>

        <button
          onClick={onAccept}
          style={{
            width: "100%", padding: "14px 24px",
            background: "linear-gradient(135deg,#004aad,#0059d1)",
            color: "#fff", border: "none", borderRadius: 12,
            fontWeight: 800, fontSize: "1rem", cursor: "pointer",
          }}
        >
          Entendido — entrar en pantalla completa
        </button>
      </div>
    </div>
  );
}
