"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import SchoolAdminSidebar from "@/components/school-admin/SchoolAdminSidebar";
import { Pagination } from "@/components/admin/Pagination";

// ─── Types ────────────────────────────────────────────────────────────────────

interface LogEntry {
  id: string;
  userId: string;
  attemptId: string;
  evaluationType: string;
  evaluationId: string;
  eventType: string;
  severity: string;
  scoreContribution: number;
  metadata: Record<string, unknown> | null;
  timestamp: string;
  user: { id: string; firstName: string; lastName: string; email: string };
}

interface SecurityStatus {
  attemptId: string;
  userId: string;
  evaluationType: string;
  evaluationId: string;
  fraudScore: number;
  riskLevel: string;
  violationCount: number;
  fullscreenExits: number;
  tabSwitches: number;
  copyAttempts: number;
  webcamEvents: number;
  autoSubmitted: boolean;
  reviewedAt: string | null;
  reviewNotes: string | null;
  lastEventAt: string | null;
  user: { id: string; firstName: string; lastName: string; email: string };
}

interface Paged<T> { data: T[]; total: number; page: number; pages: number }

const LIMIT = 50;

const SEVERITY_COLORS: Record<string, string> = {
  LOW:      "#16a34a",
  MEDIUM:   "#d97706",
  HIGH:     "#dc2626",
  CRITICAL: "#7c3aed",
};

const RISK_COLORS: Record<string, string> = {
  CLEAN:    "#16a34a",
  LOW:      "#65a30d",
  MEDIUM:   "#d97706",
  HIGH:     "#dc2626",
  CRITICAL: "#7c3aed",
};

const EVENT_LABELS: Record<string, string> = {
  FULLSCREEN_EXIT:       "Salida de pantalla completa",
  TAB_SWITCH:            "Cambio de pestaña",
  WINDOW_BLUR:           "Pérdida de foco",
  COPY_ATTEMPT:          "Intento de copiar",
  PASTE_ATTEMPT:         "Intento de pegar",
  RIGHTCLICK_ATTEMPT:    "Clic derecho",
  KEYBOARD_SHORTCUT:     "Atajo bloqueado",
  WEBCAM_DISCONNECT:     "Cámara desconectada",
  WEBCAM_NO_FACE:        "Sin rostro detectado",
  WEBCAM_MULTIPLE_FACES: "Múltiples rostros",
  AUTO_SUBMIT_FRAUD:     "Envío automático por fraude",
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function AntiFraudePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [tab, setTab] = useState<"statuses" | "logs">("statuses");

  // Statuses
  const [statuses, setStatuses]       = useState<SecurityStatus[]>([]);
  const [statusPage, setStatusPage]   = useState(1);
  const [statusTotal, setStatusTotal] = useState(0);
  const [statusPages, setStatusPages] = useState(1);

  // Logs
  const [logs, setLogs]       = useState<LogEntry[]>([]);
  const [logsPage, setLogsPage] = useState(1);
  const [logsTotal, setLogsTotal] = useState(0);
  const [logsPages, setLogsPages] = useState(1);
  const [filterSeverity, setFilterSeverity] = useState("");
  const [filterEvent, setFilterEvent]       = useState("");

  // Review modal
  const [reviewing, setReviewing]   = useState<SecurityStatus | null>(null);
  const [reviewNotes, setReviewNotes] = useState("");
  const [reviewLoading, setReviewLoading] = useState(false);

  const [fetching, setFetching] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.replace("/auth/login");
    if (!loading && user && user.role !== "ADMIN" && user.role !== "SUPER_ADMIN") router.replace("/dashboard");
  }, [user, loading, router]);

  const fetchStatuses = useCallback((p: number) => {
    if (!user) return;
    setFetching(true);
    const params = new URLSearchParams({ page: String(p), limit: String(LIMIT) });
    api.get<Paged<SecurityStatus>>(`/anti-fraud/statuses?${params}`)
      .then(res => { setStatuses(res.data); setStatusTotal(res.total); setStatusPages(res.pages); })
      .finally(() => setFetching(false));
  }, [user]);

  const fetchLogs = useCallback((p: number, severity: string, eventType: string) => {
    if (!user) return;
    setFetching(true);
    const params = new URLSearchParams({ page: String(p), limit: String(LIMIT) });
    if (severity)  params.set("severity",  severity);
    if (eventType) params.set("eventType", eventType);
    api.get<Paged<LogEntry>>(`/anti-fraud/logs?${params}`)
      .then(res => { setLogs(res.data); setLogsTotal(res.total); setLogsPages(res.pages); })
      .finally(() => setFetching(false));
  }, [user]);

  useEffect(() => {
    if (tab === "statuses") fetchStatuses(statusPage);
    else fetchLogs(logsPage, filterSeverity, filterEvent);
  }, [tab, statusPage, logsPage, filterSeverity, filterEvent, fetchStatuses, fetchLogs]);

  async function handleReview() {
    if (!reviewing) return;
    setReviewLoading(true);
    try {
      await api.post(`/anti-fraud/attempts/${reviewing.attemptId}/review`, { notes: reviewNotes });
      setStatuses(prev => prev.map(s =>
        s.attemptId === reviewing.attemptId
          ? { ...s, reviewedAt: new Date().toISOString(), reviewNotes }
          : s
      ));
      setReviewing(null);
      setReviewNotes("");
    } catch { /* silencioso */ }
    setReviewLoading(false);
  }

  if (loading || !user) return null;

  return (
    <div style={{ minHeight: "100vh", background: "#f0f4ff" }}>
      <SchoolAdminSidebar />
      <main style={{ marginLeft: 260, padding: "32px 36px", minHeight: "100vh", boxSizing: "border-box" }}>

        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 800, color: "#1e293b", margin: 0 }}>
            Panel Anti-Fraude
          </h1>
          <p style={{ color: "#64748b", fontSize: "0.875rem", margin: "4px 0 0" }}>
            Monitoreo de comportamiento durante simulacros y evaluaciones.
          </p>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
          {([
            { key: "statuses", label: "Resumen por intento" },
            { key: "logs",     label: "Log de eventos" },
          ] as const).map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              style={{
                padding: "9px 18px", borderRadius: 10, border: "none", cursor: "pointer",
                fontWeight: 700, fontSize: "0.85rem",
                background: tab === t.key ? "#004aad" : "#fff",
                color:      tab === t.key ? "#fff" : "#475569",
                boxShadow: tab === t.key ? "0 2px 8px rgba(0,74,173,0.2)" : "none",
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* ── STATUSES TAB ── */}
        {tab === "statuses" && (
          <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e2eaf7", overflow: "hidden" }}>
            {fetching ? (
              <div style={{ padding: "48px 24px", textAlign: "center", color: "#64748b" }}>⏳ Cargando…</div>
            ) : statuses.length === 0 ? (
              <div style={{ padding: "48px 24px", textAlign: "center", color: "#94a3b8" }}>
                Sin datos de seguridad aún.
              </div>
            ) : (
              <>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: "#f8faff", borderBottom: "1px solid #e2eaf7" }}>
                      {["Estudiante", "Intento", "Riesgo", "Score", "Infracciones", "Pantalla", "Pestañas", "Copias", "Revisado", "Acciones"].map(h => (
                        <th key={h} style={{ padding: "12px 14px", textAlign: "left", fontSize: "0.75rem", fontWeight: 700, color: "#475569" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {statuses.map((s, i) => (
                      <tr key={s.attemptId} style={{ borderBottom: i < statuses.length - 1 ? "1px solid #f1f5f9" : "none" }}>
                        <td style={{ padding: "12px 14px" }}>
                          <div style={{ fontWeight: 600, color: "#1e293b", fontSize: "0.875rem" }}>
                            {s.user.firstName} {s.user.lastName}
                          </div>
                          <div style={{ fontSize: "0.75rem", color: "#94a3b8" }}>{s.user.email}</div>
                        </td>
                        <td style={{ padding: "12px 14px", fontSize: "0.78rem", color: "#64748b", fontFamily: "monospace" }}>
                          {s.attemptId.slice(0, 8)}…
                        </td>
                        <td style={{ padding: "12px 14px" }}>
                          <span style={{
                            padding: "3px 10px", borderRadius: 20, fontSize: "0.75rem", fontWeight: 700,
                            background: `${RISK_COLORS[s.riskLevel] ?? "#64748b"}18`,
                            color: RISK_COLORS[s.riskLevel] ?? "#64748b",
                          }}>
                            {s.riskLevel}
                          </span>
                          {s.autoSubmitted && (
                            <span style={{ marginLeft: 4, padding: "2px 6px", borderRadius: 20, fontSize: "0.68rem", background: "#fef2f2", color: "#dc2626", fontWeight: 700 }}>
                              AUTO
                            </span>
                          )}
                        </td>
                        <td style={{ padding: "12px 14px", fontWeight: 700, color: RISK_COLORS[s.riskLevel] ?? "#64748b", fontSize: "0.875rem" }}>
                          {s.fraudScore}
                        </td>
                        <td style={{ padding: "12px 14px", textAlign: "center", fontWeight: 600, color: s.violationCount > 0 ? "#dc2626" : "#16a34a", fontSize: "0.875rem" }}>
                          {s.violationCount}
                        </td>
                        <td style={{ padding: "12px 14px", textAlign: "center", color: "#64748b", fontSize: "0.875rem" }}>{s.fullscreenExits}</td>
                        <td style={{ padding: "12px 14px", textAlign: "center", color: "#64748b", fontSize: "0.875rem" }}>{s.tabSwitches}</td>
                        <td style={{ padding: "12px 14px", textAlign: "center", color: "#64748b", fontSize: "0.875rem" }}>{s.copyAttempts}</td>
                        <td style={{ padding: "12px 14px" }}>
                          {s.reviewedAt ? (
                            <span style={{ fontSize: "0.75rem", color: "#16a34a", fontWeight: 600 }}>✓ Revisado</span>
                          ) : (
                            <span style={{ fontSize: "0.75rem", color: "#94a3b8" }}>Pendiente</span>
                          )}
                        </td>
                        <td style={{ padding: "12px 14px" }}>
                          <button
                            onClick={() => { setReviewing(s); setReviewNotes(s.reviewNotes ?? ""); }}
                            style={{ padding: "5px 12px", background: "#eff6ff", color: "#004aad", border: "1px solid #bfdbfe", borderRadius: 8, cursor: "pointer", fontSize: "0.78rem", fontWeight: 600 }}
                          >
                            Revisar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <Pagination page={statusPage} pages={statusPages} total={statusTotal} limit={LIMIT} onPageChange={p => setStatusPage(p)} />
              </>
            )}
          </div>
        )}

        {/* ── LOGS TAB ── */}
        {tab === "logs" && (
          <>
            <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
              <select
                value={filterSeverity}
                onChange={e => { setFilterSeverity(e.target.value); setLogsPage(1); }}
                style={{ padding: "9px 12px", border: "1px solid #dde4f0", borderRadius: 10, fontSize: "0.85rem", color: "#1e293b" }}
              >
                <option value="">Todas las severidades</option>
                {["LOW", "MEDIUM", "HIGH", "CRITICAL"].map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              <select
                value={filterEvent}
                onChange={e => { setFilterEvent(e.target.value); setLogsPage(1); }}
                style={{ padding: "9px 12px", border: "1px solid #dde4f0", borderRadius: 10, fontSize: "0.85rem", color: "#1e293b" }}
              >
                <option value="">Todos los eventos</option>
                {Object.entries(EVENT_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>

            <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e2eaf7", overflow: "hidden" }}>
              {fetching ? (
                <div style={{ padding: "48px 24px", textAlign: "center", color: "#64748b" }}>⏳ Cargando…</div>
              ) : logs.length === 0 ? (
                <div style={{ padding: "48px 24px", textAlign: "center", color: "#94a3b8" }}>Sin logs.</div>
              ) : (
                <>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ background: "#f8faff", borderBottom: "1px solid #e2eaf7" }}>
                        {["Estudiante", "Evento", "Severidad", "+Score", "Timestamp", "Metadata"].map(h => (
                          <th key={h} style={{ padding: "12px 14px", textAlign: "left", fontSize: "0.75rem", fontWeight: 700, color: "#475569" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {logs.map((l, i) => (
                        <tr key={l.id} style={{ borderBottom: i < logs.length - 1 ? "1px solid #f1f5f9" : "none" }}>
                          <td style={{ padding: "10px 14px" }}>
                            <div style={{ fontWeight: 600, color: "#1e293b", fontSize: "0.85rem" }}>
                              {l.user.firstName} {l.user.lastName}
                            </div>
                          </td>
                          <td style={{ padding: "10px 14px" }}>
                            <span style={{ fontSize: "0.82rem", fontWeight: 600, color: "#1e293b" }}>
                              {EVENT_LABELS[l.eventType] ?? l.eventType}
                            </span>
                          </td>
                          <td style={{ padding: "10px 14px" }}>
                            <span style={{
                              padding: "2px 8px", borderRadius: 20, fontSize: "0.72rem", fontWeight: 700,
                              background: `${SEVERITY_COLORS[l.severity] ?? "#64748b"}18`,
                              color: SEVERITY_COLORS[l.severity] ?? "#64748b",
                            }}>
                              {l.severity}
                            </span>
                          </td>
                          <td style={{ padding: "10px 14px", fontWeight: 700, color: "#dc2626", fontSize: "0.85rem" }}>
                            +{l.scoreContribution}
                          </td>
                          <td style={{ padding: "10px 14px", fontSize: "0.78rem", color: "#64748b" }}>
                            {new Date(l.timestamp).toLocaleString("es-CO")}
                          </td>
                          <td style={{ padding: "10px 14px", fontSize: "0.75rem", color: "#94a3b8", fontFamily: "monospace" }}>
                            {l.metadata ? JSON.stringify(l.metadata).slice(0, 60) : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <Pagination page={logsPage} pages={logsPages} total={logsTotal} limit={LIMIT} onPageChange={p => setLogsPage(p)} />
                </>
              )}
            </div>
          </>
        )}
      </main>

      {/* Review modal */}
      {reviewing && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, padding: 24 }}>
          <div style={{ background: "#fff", borderRadius: 16, maxWidth: 480, width: "100%", padding: 28 }}>
            <h3 style={{ margin: "0 0 8px", fontSize: "1.1rem", fontWeight: 800, color: "#1e293b" }}>
              Revisar intento
            </h3>
            <p style={{ color: "#64748b", fontSize: "0.85rem", margin: "0 0 16px" }}>
              {reviewing.user.firstName} {reviewing.user.lastName} — Score: {reviewing.fraudScore} ({reviewing.riskLevel})
            </p>

            <div style={{ background: "#f8faff", borderRadius: 10, padding: "12px 16px", marginBottom: 16, fontSize: "0.82rem", color: "#475569" }}>
              <div>Infracciones: <strong>{reviewing.violationCount}</strong></div>
              <div>Salidas fullscreen: <strong>{reviewing.fullscreenExits}</strong></div>
              <div>Cambios de pestaña: <strong>{reviewing.tabSwitches}</strong></div>
              <div>Intentos de copia: <strong>{reviewing.copyAttempts}</strong></div>
            </div>

            <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 600, color: "#475569", marginBottom: 6 }}>
              Notas de revisión
            </label>
            <textarea
              value={reviewNotes}
              onChange={e => setReviewNotes(e.target.value)}
              rows={3}
              placeholder="Ej: comportamiento sospechoso revisado, sin acción requerida."
              style={{ width: "100%", padding: "10px 14px", border: "1px solid #dde4f0", borderRadius: 10, fontSize: "0.85rem", resize: "vertical", boxSizing: "border-box" }}
            />

            <div style={{ display: "flex", gap: 8, marginTop: 16, justifyContent: "flex-end" }}>
              <button
                onClick={() => setReviewing(null)}
                style={{ padding: "9px 18px", background: "#f1f5f9", color: "#475569", border: "none", borderRadius: 10, cursor: "pointer", fontWeight: 600, fontSize: "0.85rem" }}
              >
                Cancelar
              </button>
              <button
                onClick={handleReview}
                disabled={reviewLoading}
                style={{ padding: "9px 18px", background: "#004aad", color: "#fff", border: "none", borderRadius: 10, cursor: "pointer", fontWeight: 700, fontSize: "0.85rem" }}
              >
                {reviewLoading ? "Guardando…" : "Marcar como revisado"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
