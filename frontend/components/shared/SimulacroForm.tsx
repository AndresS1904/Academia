"use client";

import { useState } from "react";
import { api } from "@/lib/api";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ExamType = "ICFES" | "UDEA";
export type SessionType = "MANANA" | "TARDE";
export type Difficulty = "FACIL" | "MEDIA" | "DIFICIL";

export interface SectionDraft {
  id: string;
  area: string;
  questionCount: number;
  duracionMinutos: number;
  difficulty: Difficulty | "";
}

export interface SessionDraft {
  id: string;
  type: SessionType;
  label: string;
  order: number;
  instructions: string;
  pauseMinutes: number;
  durationMinutes: number;
  sections: SectionDraft[];
  showAdvanced: boolean;
}

interface SimulacroFormProps {
  onSuccess: () => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

let _id = 0;
const uid = () => String(++_id);

const AREA_PRESETS = [
  "Lectura crítica",
  "Matemáticas",
  "Ciencias naturales",
  "Sociales y ciudadanas",
  "Inglés",
  "Razonamiento cuantitativo",
];

const defaultSection = (): SectionDraft => ({
  id: uid(),
  area: "",
  questionCount: 1,
  duracionMinutos: 0,
  difficulty: "",
});

const defaultSession = (type: SessionType, order: number): SessionDraft => ({
  id: uid(),
  type,
  label: type === "MANANA" ? "Sesión Mañana" : "Sesión Tarde",
  order,
  instructions: "",
  pauseMinutes: 0,
  durationMinutes: 0,
  sections: [defaultSection()],
  showAdvanced: false,
});

// ─── Styles ───────────────────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  height: 40,
  padding: "0 14px",
  border: "1px solid #dde4f0",
  borderRadius: 10,
  fontSize: "0.875rem",
  color: "#1e293b",
  width: "100%",
  boxSizing: "border-box",
  outline: "none",
  background: "#fff",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "0.8rem",
  fontWeight: 600,
  color: "#475569",
  marginBottom: 6,
};

// ─── Component ────────────────────────────────────────────────────────────────

export function SimulacroForm({ onSuccess }: SimulacroFormProps) {
  const [titulo, setTitulo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [examType, setExamType] = useState<ExamType>("ICFES");
  const [emoji, setEmoji] = useState("📝");
  const [color, setColor] = useState("#004aad");
  const [isPublished, setIsPublished] = useState(false);
  const [sessions, setSessions] = useState<SessionDraft[]>([
    defaultSession("MANANA", 1),
  ]);

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // ── Session helpers ──
  const usedTypes = sessions.map((s) => s.type);
  const canAddSession = sessions.length < 2;
  const nextType: SessionType | null =
    !usedTypes.includes("MANANA")
      ? "MANANA"
      : !usedTypes.includes("TARDE")
      ? "TARDE"
      : null;

  const addSession = () => {
    if (!canAddSession || !nextType) return;
    setSessions((prev) => [...prev, defaultSession(nextType, prev.length + 1)]);
  };

  const removeSession = (id: string) => {
    setSessions((prev) =>
      prev.filter((s) => s.id !== id).map((s, i) => ({ ...s, order: i + 1 }))
    );
  };

  const updateSession = (id: string, patch: Partial<SessionDraft>) => {
    setSessions((prev) =>
      prev.map((s) => (s.id === id ? { ...s, ...patch } : s))
    );
  };

  // ── Section helpers ──
  const addSection = (sessionId: string) => {
    setSessions((prev) =>
      prev.map((s) =>
        s.id === sessionId
          ? { ...s, sections: [...s.sections, defaultSection()] }
          : s
      )
    );
  };

  const removeSection = (sessionId: string, sectionId: string) => {
    setSessions((prev) =>
      prev.map((s) =>
        s.id === sessionId
          ? { ...s, sections: s.sections.filter((sec) => sec.id !== sectionId) }
          : s
      )
    );
  };

  const updateSection = (
    sessionId: string,
    sectionId: string,
    patch: Partial<SectionDraft>
  ) => {
    setSessions((prev) =>
      prev.map((s) =>
        s.id === sessionId
          ? {
              ...s,
              sections: s.sections.map((sec) =>
                sec.id === sectionId ? { ...sec, ...patch } : sec
              ),
            }
          : s
      )
    );
  };

  // ── Summary calculations ──
  const allSections = sessions.flatMap((s) => s.sections);
  const totalPreguntas = allSections.reduce(
    (sum, sec) => sum + (Number(sec.questionCount) || 0),
    0
  );
  const totalDuracion = allSections.reduce(
    (sum, sec) => sum + (Number(sec.duracionMinutos) || 0),
    0
  );
  const uniqueAreas = Array.from(
    new Set(allSections.map((s) => s.area).filter(Boolean))
  );

  // ── Submit ──
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!titulo.trim()) { setError("El título es obligatorio."); return; }
    if (sessions.length === 0) { setError("Debes agregar al menos una sesión."); return; }
    for (const session of sessions) {
      if (!session.label.trim()) { setError("Todas las sesiones deben tener una etiqueta."); return; }
      if (session.sections.length === 0) { setError("Cada sesión debe tener al menos una sección."); return; }
      for (const sec of session.sections) {
        if (!sec.area.trim()) { setError("Todas las secciones deben tener un área."); return; }
      }
    }

    const body = {
      titulo: titulo.trim(),
      descripcion: descripcion.trim() || undefined,
      examType,
      emoji: emoji.trim() || undefined,
      color: color || undefined,
      isPublished,
      sessions: sessions.map((s) => ({
        type: s.type,
        label: s.label,
        order: s.order,
        instructions: s.instructions.trim() || undefined,
        pauseMinutes: Number(s.pauseMinutes) || undefined,
        durationMinutes: Number(s.durationMinutes) || undefined,
        sections: s.sections.map((sec) => ({
          area: sec.area,
          questionCount: Number(sec.questionCount),
          duracionMinutos: Number(sec.duracionMinutos),
          difficulty: sec.difficulty || undefined,
        })),
      })),
    };

    setLoading(true);
    try {
      await api.post("/simulacros", body);
      onSuccess();
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Error al guardar el simulacro."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {error && (
        <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, padding: "12px 16px", color: "#dc2626", fontSize: "0.875rem", marginBottom: 24 }}>
          {error}
        </div>
      )}

      <div style={{ display: "flex", gap: 24, alignItems: "flex-start" }}>
        {/* ── LEFT COLUMN ── */}
        <div style={{ flex: "0 0 60%", minWidth: 0 }}>

          {/* Información básica */}
          <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e2eaf7", padding: 24, marginBottom: 24 }}>
            <h2 style={{ fontWeight: 800, color: "#1e293b", fontSize: "1rem", marginBottom: 16, marginTop: 0 }}>
              Información básica
            </h2>

            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label style={labelStyle}>Título <span style={{ color: "#ef4444" }}>*</span></label>
                <input style={inputStyle} type="text" value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ej: Simulacro ICFES 2026 — Jornada 1" required />
              </div>

              <div>
                <label style={labelStyle}>Descripción</label>
                <textarea
                  style={{ padding: "12px 14px", border: "1px solid #dde4f0", borderRadius: 10, fontSize: "0.875rem", color: "#1e293b", width: "100%", boxSizing: "border-box", outline: "none", resize: "vertical", minHeight: 80, background: "#fff" }}
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  placeholder="Descripción opcional del simulacro…"
                />
              </div>

              <div>
                <label style={labelStyle}>Tipo de examen <span style={{ color: "#ef4444" }}>*</span></label>
                <select style={inputStyle} value={examType} onChange={(e) => setExamType(e.target.value as ExamType)} required>
                  <option value="ICFES">ICFES</option>
                  <option value="UDEA">UDEA</option>
                </select>
              </div>

              <div style={{ display: "flex", gap: 16 }}>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>Emoji</label>
                  <input style={inputStyle} type="text" value={emoji} onChange={(e) => setEmoji(e.target.value)} placeholder="📝" maxLength={4} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>Color</label>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <input type="color" value={color} onChange={(e) => setColor(e.target.value)} style={{ height: 40, width: 48, border: "1px solid #dde4f0", borderRadius: 10, padding: 4, cursor: "pointer", background: "#fff" }} />
                    <input style={{ ...inputStyle, flex: 1 }} type="text" value={color} onChange={(e) => setColor(e.target.value)} placeholder="#004aad" maxLength={7} />
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <input id="isPublished" type="checkbox" checked={isPublished} onChange={(e) => setIsPublished(e.target.checked)} style={{ width: 16, height: 16, cursor: "pointer" }} />
                <label htmlFor="isPublished" style={{ ...labelStyle, marginBottom: 0, cursor: "pointer" }}>
                  Publicar simulacro inmediatamente
                </label>
              </div>
            </div>
          </div>

          {/* Sesiones y secciones */}
          <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e2eaf7", padding: 24, marginBottom: 24 }}>
            <h2 style={{ fontWeight: 800, color: "#1e293b", fontSize: "1rem", marginBottom: 16, marginTop: 0 }}>
              Sesiones y secciones
            </h2>

            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              {sessions.map((session) => (
                <div key={session.id} style={{ border: "1px solid #e2eaf7", borderRadius: 12, padding: 16, background: "#f8faff" }}>
                  {/* Session header */}
                  <div style={{ display: "flex", gap: 12, alignItems: "flex-end", marginBottom: 16 }}>
                    <div style={{ flex: "0 0 140px" }}>
                      <label style={labelStyle}>Jornada</label>
                      <select
                        style={inputStyle}
                        value={session.type}
                        onChange={(e) => {
                          const newType = e.target.value as SessionType;
                          const alreadyUsed = sessions.some((s) => s.id !== session.id && s.type === newType);
                          if (!alreadyUsed) {
                            updateSession(session.id, { type: newType, label: newType === "MANANA" ? "Sesión Mañana" : "Sesión Tarde" });
                          }
                        }}
                      >
                        <option value="MANANA" disabled={session.type !== "MANANA" && usedTypes.includes("MANANA")}>Mañana</option>
                        <option value="TARDE" disabled={session.type !== "TARDE" && usedTypes.includes("TARDE")}>Tarde</option>
                      </select>
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={labelStyle}>Etiqueta</label>
                      <input style={inputStyle} type="text" value={session.label} onChange={(e) => updateSession(session.id, { label: e.target.value })} placeholder="Ej: Sesión Mañana" />
                    </div>
                    <div style={{ flex: "0 0 80px" }}>
                      <label style={labelStyle}>Orden</label>
                      <input style={{ ...inputStyle, background: "#f1f5f9", color: "#94a3b8" }} type="number" value={session.order} readOnly />
                    </div>
                    {sessions.length > 1 && (
                      <button type="button" onClick={() => removeSession(session.id)} style={{ height: 40, padding: "0 14px", border: "1px solid #fecaca", borderRadius: 10, background: "#fef2f2", color: "#dc2626", fontSize: "0.8rem", fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0 }}>
                        Quitar sesión
                      </button>
                    )}
                  </div>

                  {/* Advanced toggle */}
                  <div style={{ marginBottom: 14 }}>
                    <button
                      type="button"
                      onClick={() => updateSession(session.id, { showAdvanced: !session.showAdvanced })}
                      style={{ fontSize: "0.78rem", fontWeight: 600, color: "#4f46e5", background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex", alignItems: "center", gap: 4 }}
                    >
                      {session.showAdvanced ? "▾" : "▸"} Configuración avanzada
                    </button>
                    {session.showAdvanced && (
                      <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 12 }}>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                          <div>
                            <label style={labelStyle}>Duración total sesión (min)</label>
                            <input
                              style={inputStyle}
                              type="number"
                              min={0}
                              value={session.durationMinutes}
                              onChange={(e) => updateSession(session.id, { durationMinutes: Number(e.target.value) })}
                              placeholder="0 = suma de secciones"
                            />
                            <span style={{ fontSize: "0.72rem", color: "#94a3b8" }}>Sobrescribe la suma de las secciones como temporizador</span>
                          </div>
                          {sessions.length > 1 && session.order < sessions.length && (
                            <div>
                              <label style={labelStyle}>Pausa antes de la siguiente sesión (min)</label>
                              <input
                                style={inputStyle}
                                type="number"
                                min={0}
                                value={session.pauseMinutes}
                                onChange={(e) => updateSession(session.id, { pauseMinutes: Number(e.target.value) })}
                                placeholder="0 = sin pausa"
                              />
                              <span style={{ fontSize: "0.72rem", color: "#94a3b8" }}>Tiempo de descanso entre sesiones</span>
                            </div>
                          )}
                        </div>
                        <div>
                          <label style={labelStyle}>Instrucciones personalizadas</label>
                          <textarea
                            style={{ padding: "10px 14px", border: "1px solid #dde4f0", borderRadius: 10, fontSize: "0.875rem", color: "#1e293b", width: "100%", boxSizing: "border-box", outline: "none", resize: "vertical", minHeight: 80, background: "#fff" }}
                            value={session.instructions}
                            onChange={(e) => updateSession(session.id, { instructions: e.target.value })}
                            placeholder="Instrucciones específicas para esta sesión. Si se deja vacío, se generan automáticamente."
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Sections */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {session.sections.map((sec, secIdx) => (
                      <div key={sec.id} style={{ background: "#fff", border: "1px solid #e2eaf7", borderRadius: 10, padding: 14 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                          <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "#64748b" }}>Sección {secIdx + 1}</span>
                          {session.sections.length > 1 && (
                            <button type="button" onClick={() => removeSection(session.id, sec.id)} style={{ fontSize: "0.75rem", fontWeight: 600, color: "#dc2626", background: "none", border: "none", cursor: "pointer", padding: "2px 6px" }}>
                              ✕ Quitar
                            </button>
                          )}
                        </div>

                        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: 10 }}>
                          <div>
                            <label style={labelStyle}>Área <span style={{ color: "#ef4444" }}>*</span></label>
                            <input
                              style={inputStyle}
                              type="text"
                              list={`areas-${sec.id}`}
                              value={sec.area}
                              onChange={(e) => updateSection(session.id, sec.id, { area: e.target.value })}
                              placeholder="Ej: Matemáticas"
                            />
                            <datalist id={`areas-${sec.id}`}>
                              {AREA_PRESETS.map((a) => <option key={a} value={a} />)}
                            </datalist>
                          </div>
                          <div>
                            <label style={labelStyle}>Nº preguntas</label>
                            <input style={inputStyle} type="number" min={1} value={sec.questionCount} onChange={(e) => updateSection(session.id, sec.id, { questionCount: Number(e.target.value) })} />
                          </div>
                          <div>
                            <label style={labelStyle}>Duración (min)</label>
                            <input style={inputStyle} type="number" min={0} value={sec.duracionMinutos} onChange={(e) => updateSection(session.id, sec.id, { duracionMinutos: Number(e.target.value) })} />
                          </div>
                          <div>
                            <label style={labelStyle}>Dificultad</label>
                            <select style={inputStyle} value={sec.difficulty} onChange={(e) => updateSection(session.id, sec.id, { difficulty: e.target.value as Difficulty | "" })}>
                              <option value="">Cualquiera</option>
                              <option value="FACIL">Fácil</option>
                              <option value="MEDIA">Media</option>
                              <option value="DIFICIL">Difícil</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    ))}

                    <button type="button" onClick={() => addSection(session.id)} style={{ alignSelf: "flex-start", padding: "8px 14px", border: "1px dashed #93c5fd", borderRadius: 10, background: "#eff6ff", color: "#2563eb", fontSize: "0.8rem", fontWeight: 600, cursor: "pointer" }}>
                      ＋ Agregar sección
                    </button>
                  </div>
                </div>
              ))}

              {canAddSession && nextType && (
                <button type="button" onClick={addSession} style={{ alignSelf: "flex-start", padding: "10px 18px", border: "1px dashed #a5b4fc", borderRadius: 12, background: "#f5f3ff", color: "#4f46e5", fontSize: "0.875rem", fontWeight: 700, cursor: "pointer" }}>
                  ＋ Agregar sesión ({nextType === "MANANA" ? "Mañana" : "Tarde"})
                </button>
              )}
            </div>
          </div>

          {/* Submit */}
          {error && (
            <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, padding: "12px 16px", color: "#dc2626", fontSize: "0.875rem", marginBottom: 12 }}>
              ⚠ {error}
            </div>
          )}
          <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
            <button type="submit" disabled={loading} style={{ padding: "11px 28px", background: loading ? "#93c5fd" : "#004aad", color: "#fff", border: "none", borderRadius: 10, fontSize: "0.9rem", fontWeight: 700, cursor: loading ? "not-allowed" : "pointer" }}>
              {loading ? "Guardando…" : "Guardar simulacro"}
            </button>
          </div>
        </div>

        {/* ── RIGHT COLUMN: Summary ── */}
        <div style={{ flex: "0 0 40%", minWidth: 0, position: "sticky", top: 32 }}>
          <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e2eaf7", padding: 24 }}>
            <h2 style={{ fontWeight: 800, color: "#1e293b", fontSize: "1rem", marginBottom: 20, marginTop: 0 }}>Resumen</h2>

            <div style={{ marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                <span style={{ width: 42, height: 42, borderRadius: 10, background: color + "22", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.4rem", border: `2px solid ${color}44` }}>
                  {emoji || "📝"}
                </span>
                <p style={{ fontWeight: 800, color: "#1e293b", fontSize: "0.95rem", margin: 0 }}>
                  {titulo || <span style={{ color: "#94a3b8", fontStyle: "italic" }}>Sin título</span>}
                </p>
              </div>
              <span style={{ display: "inline-block", padding: "3px 10px", borderRadius: 20, fontSize: "0.75rem", fontWeight: 700, background: examType === "ICFES" ? "#dbeafe" : "#fef3c7", color: examType === "ICFES" ? "#1d4ed8" : "#92400e", border: `1px solid ${examType === "ICFES" ? "#93c5fd" : "#fcd34d"}` }}>
                {examType}
              </span>
            </div>

            <hr style={{ border: "none", borderTop: "1px solid #e2eaf7", margin: "16px 0" }} />

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
              <div style={{ background: "#f0f4ff", borderRadius: 10, padding: "10px 14px" }}>
                <p style={{ fontSize: "0.7rem", fontWeight: 700, color: "#64748b", margin: "0 0 2px", textTransform: "uppercase" }}>Total preguntas</p>
                <p style={{ fontSize: "1.5rem", fontWeight: 800, color: "#004aad", margin: 0 }}>{totalPreguntas}</p>
              </div>
              <div style={{ background: "#f0fdf4", borderRadius: 10, padding: "10px 14px" }}>
                <p style={{ fontSize: "0.7rem", fontWeight: 700, color: "#64748b", margin: "0 0 2px", textTransform: "uppercase" }}>Duración total</p>
                <p style={{ fontSize: "1.5rem", fontWeight: 800, color: "#16a34a", margin: 0 }}>{totalDuracion}<span style={{ fontSize: "0.85rem", fontWeight: 600 }}> min</span></p>
              </div>
            </div>

            {sessions.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <p style={{ fontSize: "0.78rem", fontWeight: 700, color: "#475569", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>Sesiones</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {sessions.map((session) => (
                    <div key={session.id} style={{ border: "1px solid #e2eaf7", borderRadius: 10, padding: "10px 12px" }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                        <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "#1e293b" }}>
                          {session.type === "MANANA" ? "🌅" : "🌆"} {session.label || (session.type === "MANANA" ? "Sesión Mañana" : "Sesión Tarde")}
                        </span>
                        <span style={{ fontSize: "0.7rem", color: "#64748b", background: "#f1f5f9", borderRadius: 6, padding: "2px 7px", fontWeight: 600 }}>
                          {session.sections.reduce((s, sec) => s + (Number(sec.questionCount) || 0), 0)} preg.
                        </span>
                      </div>
                      {session.sections.map((sec, idx) => (
                        <div key={sec.id} style={{ fontSize: "0.75rem", color: "#64748b", display: "flex", justifyContent: "space-between", padding: "2px 0" }}>
                          <span>{idx + 1}. {sec.area || <em>Sin área</em>}</span>
                          <span style={{ color: "#94a3b8" }}>{sec.questionCount || 0} q · {sec.duracionMinutos || 0} min</span>
                        </div>
                      ))}
                      {(session.durationMinutes > 0 || session.pauseMinutes > 0) && (
                        <div style={{ marginTop: 6, display: "flex", gap: 8, flexWrap: "wrap" }}>
                          {session.durationMinutes > 0 && (
                            <span style={{ fontSize: "0.7rem", background: "#eff6ff", color: "#2563eb", borderRadius: 6, padding: "2px 7px", fontWeight: 600 }}>
                              ⏱ {session.durationMinutes} min (override)
                            </span>
                          )}
                          {session.pauseMinutes > 0 && (
                            <span style={{ fontSize: "0.7rem", background: "#fef3c7", color: "#92400e", borderRadius: 6, padding: "2px 7px", fontWeight: 600 }}>
                              ☕ {session.pauseMinutes} min pausa
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {uniqueAreas.length > 0 && (
              <div>
                <p style={{ fontSize: "0.78rem", fontWeight: 700, color: "#475569", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>Áreas incluidas</p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {uniqueAreas.map((area) => (
                    <span key={area} style={{ fontSize: "0.75rem", fontWeight: 600, padding: "3px 10px", borderRadius: 20, background: "#eff6ff", color: "#2563eb", border: "1px solid #bfdbfe" }}>
                      {area}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {sessions.length === 0 && (
              <p style={{ fontSize: "0.85rem", color: "#94a3b8", fontStyle: "italic", textAlign: "center", margin: 0 }}>
                Agrega sesiones para ver el resumen
              </p>
            )}
          </div>
        </div>
      </div>
    </form>
  );
}
