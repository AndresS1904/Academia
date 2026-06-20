"use client";

import { AntiFraudWarning as Warning } from "@/hooks/useAntiFraud";

interface Props {
  warning: Warning;
  maxViolations: number;
  isFullscreenRequired: boolean;
  onDismiss: () => void;
  onRequestFullscreen: () => void;
}

export function AntiFraudWarningModal({
  warning,
  maxViolations,
  isFullscreenRequired,
  onDismiss,
  onRequestFullscreen,
}: Props) {
  const isCritical = warning.isFinal || warning.violationNumber >= maxViolations;
  const needsFullscreen = warning.type === "FULLSCREEN_EXIT" && isFullscreenRequired;

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9999,
      background: isCritical ? "rgba(127,0,0,0.85)" : "rgba(0,0,0,0.75)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: 24,
    }}>
      <div style={{
        background: "#fff", borderRadius: 20, maxWidth: 480, width: "100%",
        padding: "36px 32px", textAlign: "center",
        boxShadow: "0 24px 80px rgba(0,0,0,0.4)",
        border: isCritical ? "3px solid #dc2626" : "2px solid #f59e0b",
      }}>
        <div style={{ fontSize: "2.8rem", marginBottom: 12 }}>
          {isCritical ? "🚨" : "⚠️"}
        </div>

        <h2 style={{
          fontSize: "1.2rem", fontWeight: 800, color: isCritical ? "#dc2626" : "#92400e",
          margin: "0 0 12px",
        }}>
          {isCritical ? "Límite de infracciones alcanzado" : "Advertencia de seguridad"}
        </h2>

        <p style={{ color: "#475569", fontSize: "0.9rem", lineHeight: 1.6, margin: "0 0 20px" }}>
          {warning.message}
        </p>

        {/* Violation progress bar */}
        {maxViolations > 0 && warning.violationNumber > 0 && (
          <div style={{ marginBottom: 20 }}>
            <div style={{
              display: "flex", justifyContent: "space-between",
              fontSize: "0.75rem", color: "#64748b", marginBottom: 6,
            }}>
              <span>Infracciones</span>
              <span style={{ fontWeight: 700, color: isCritical ? "#dc2626" : "#f59e0b" }}>
                {warning.violationNumber} / {maxViolations}
              </span>
            </div>
            <div style={{ height: 8, background: "#f1f5f9", borderRadius: 4, overflow: "hidden" }}>
              <div style={{
                height: "100%",
                width: `${Math.min(100, (warning.violationNumber / maxViolations) * 100)}%`,
                background: isCritical ? "#dc2626" : "#f59e0b",
                borderRadius: 4,
                transition: "width 0.3s",
              }} />
            </div>
          </div>
        )}

        {isCritical ? (
          <p style={{ color: "#dc2626", fontSize: "0.85rem", fontWeight: 700, margin: 0 }}>
            El simulacro fue enviado automáticamente.
          </p>
        ) : (
          <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
            {needsFullscreen && (
              <button
                onClick={() => { onRequestFullscreen(); onDismiss(); }}
                style={{
                  padding: "11px 22px", background: "#004aad", color: "#fff",
                  border: "none", borderRadius: 10, fontWeight: 700,
                  fontSize: "0.875rem", cursor: "pointer",
                }}
              >
                Volver a pantalla completa
              </button>
            )}
            {!needsFullscreen && (
              <button
                onClick={onDismiss}
                style={{
                  padding: "11px 22px", background: "#004aad", color: "#fff",
                  border: "none", borderRadius: 10, fontWeight: 700,
                  fontSize: "0.875rem", cursor: "pointer",
                }}
              >
                Entendido, continuar
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
