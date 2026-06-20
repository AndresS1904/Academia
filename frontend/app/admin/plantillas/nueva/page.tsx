"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";

interface RuleDraft {
  count: number;
  difficulty?: string;
  topic?: string;
  subtopic?: string;
  competence?: string;
  component?: string;
  sourceType?: string;
  excludeRecentDays: number;
}

interface SectionDraft {
  area: string;
  durationMinutes: number;
  rules: RuleDraft[];
}

interface SessionDraft {
  type: "MANANA" | "TARDE";
  label: string;
  durationMinutes: number;
  sections: SectionDraft[];
}

const AREAS_ICFES = [
  "Lectura crítica",
  "Matemáticas",
  "Ciencias Naturales",
  "Sociales y Ciudadanas",
  "Inglés",
];

const AREAS_UDEA = [
  "Comprensión Lectora",
  "Razonamiento Lógico",
  "Ciencias Básicas",
];

const DIFICULTADES = ["FACIL", "MEDIA", "DIFICIL"];
const SOURCE_TYPES = ["ICFES", "UDEA", "PROPIA", "SABER", "OTRA"];

function emptyRule(): RuleDraft {
  return { count: 5, excludeRecentDays: 0 };
}

function emptySection(area?: string): SectionDraft {
  return { area: area ?? "", durationMinutes: 30, rules: [emptyRule()] };
}

function emptySession(type: "MANANA" | "TARDE"): SessionDraft {
  return {
    type,
    label: type === "MANANA" ? "Sesión Mañana" : "Sesión Tarde",
    durationMinutes: 120,
    sections: [emptySection()],
  };
}

export default function NuevaPlantillaPage() {
  const { user } = useAuth();
  const router = useRouter();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [examType, setExamType] = useState<"ICFES" | "UDEA">("ICFES");
  const [sessions, setSessions] = useState<SessionDraft[]>([emptySession("MANANA")]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const areas = examType === "ICFES" ? AREAS_ICFES : AREAS_UDEA;

  function updateSession(sIdx: number, patch: Partial<SessionDraft>) {
    setSessions(prev => prev.map((s, i) => i === sIdx ? { ...s, ...patch } : s));
  }

  function updateSection(sIdx: number, secIdx: number, patch: Partial<SectionDraft>) {
    setSessions(prev => prev.map((s, i) => {
      if (i !== sIdx) return s;
      return { ...s, sections: s.sections.map((sec, j) => j === secIdx ? { ...sec, ...patch } : sec) };
    }));
  }

  function updateRule(sIdx: number, secIdx: number, rIdx: number, patch: Partial<RuleDraft>) {
    setSessions(prev => prev.map((s, i) => {
      if (i !== sIdx) return s;
      return {
        ...s, sections: s.sections.map((sec, j) => {
          if (j !== secIdx) return sec;
          return { ...sec, rules: sec.rules.map((r, k) => k === rIdx ? { ...r, ...patch } : r) };
        }),
      };
    }));
  }

  function addRule(sIdx: number, secIdx: number) {
    setSessions(prev => prev.map((s, i) => {
      if (i !== sIdx) return s;
      return { ...s, sections: s.sections.map((sec, j) => j === secIdx ? { ...sec, rules: [...sec.rules, emptyRule()] } : sec) };
    }));
  }

  function removeRule(sIdx: number, secIdx: number, rIdx: number) {
    setSessions(prev => prev.map((s, i) => {
      if (i !== sIdx) return s;
      return { ...s, sections: s.sections.map((sec, j) => j === secIdx ? { ...sec, rules: sec.rules.filter((_, k) => k !== rIdx) } : sec) };
    }));
  }

  function addSection(sIdx: number) {
    const usedAreas = sessions[sIdx].sections.map(s => s.area);
    const nextArea = areas.find(a => !usedAreas.includes(a)) ?? "";
    setSessions(prev => prev.map((s, i) => i === sIdx ? { ...s, sections: [...s.sections, emptySection(nextArea)] } : s));
  }

  function removeSection(sIdx: number, secIdx: number) {
    setSessions(prev => prev.map((s, i) => i === sIdx ? { ...s, sections: s.sections.filter((_, j) => j !== secIdx) } : s));
  }

  function addSession() {
    const types = sessions.map(s => s.type);
    const next = types.includes("MANANA") && !types.includes("TARDE") ? "TARDE" : "MANANA";
    setSessions(prev => [...prev, emptySession(next)]);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return setError("El nombre es requerido");
    if (sessions.length === 0) return setError("Agrega al menos una sesión");

    setSaving(true);
    setError(null);
    try {
      const payload = {
        name: name.trim(),
        description: description.trim() || undefined,
        examType,
        sessions: sessions.map((sess, i) => ({
          type: sess.type,
          label: sess.label,
          order: i,
          durationMinutes: sess.durationMinutes,
          sections: sess.sections.map((sec, j) => ({
            area: sec.area,
            order: j,
            durationMinutes: sec.durationMinutes,
            rules: sec.rules.map(r => ({
              count: r.count,
              difficulty: r.difficulty || undefined,
              topic: r.topic || undefined,
              subtopic: r.subtopic || undefined,
              competence: r.competence || undefined,
              component: r.component || undefined,
              sourceType: r.sourceType || undefined,
              excludeRecentDays: r.excludeRecentDays,
            })),
          })),
        })),
      };

      await api.post("/simulacro-templates", payload);
      router.push("/admin/plantillas");
    } catch (e: any) {
      setError(e.message ?? "Error al crear la plantilla");
    } finally {
      setSaving(false);
    }
  }

  const INPUT = { padding: "9px 12px", borderRadius: 8, border: "1px solid #334155", background: "#0f172a", color: "#f1f5f9", fontSize: "0.875rem", width: "100%", boxSizing: "border-box" as const, outline: "none" };
  const SELECT = { ...INPUT };
  const LABEL = { fontSize: "0.75rem", fontWeight: 700, color: "#94a3b8", display: "block", marginBottom: 4 } as const;

  return (
    <div style={{ minHeight: "100vh", background: "#0f172a", color: "#f1f5f9" }}>
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "40px 24px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 32 }}>
          <button onClick={() => router.back()} style={{ padding: "8px 12px", background: "#1e293b", color: "#94a3b8", border: "1px solid #334155", borderRadius: 8, cursor: "pointer" }}>← Volver</button>
          <div>
            <h1 style={{ fontSize: "1.4rem", fontWeight: 800, margin: 0 }}>Nueva Plantilla</h1>
            <p style={{ color: "#64748b", fontSize: "0.85rem", margin: "4px 0 0" }}>Define la estructura para generar simulacros automáticamente</p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Basic info */}
          <div style={{ background: "#1e293b", borderRadius: 16, border: "1px solid #334155", padding: 24, marginBottom: 20 }}>
            <h2 style={{ fontSize: "1rem", fontWeight: 700, margin: "0 0 20px", color: "#e2e8f0" }}>Información general</h2>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
              <div>
                <label style={LABEL}>Nombre de la plantilla *</label>
                <input style={INPUT} value={name} onChange={e => setName(e.target.value)} placeholder="Ej: ICFES Estándar 2025" />
              </div>
              <div>
                <label style={LABEL}>Tipo de examen</label>
                <select style={SELECT} value={examType} onChange={e => setExamType(e.target.value as any)}>
                  <option value="ICFES">ICFES</option>
                  <option value="UDEA">UDEA</option>
                </select>
              </div>
            </div>
            <div>
              <label style={LABEL}>Descripción</label>
              <textarea style={{ ...INPUT, minHeight: 70, resize: "vertical" }} value={description} onChange={e => setDescription(e.target.value)} placeholder="Descripción opcional de la plantilla…" />
            </div>
          </div>

          {/* Sessions */}
          {sessions.map((sess, sIdx) => (
            <div key={sIdx} style={{ background: "#1e293b", borderRadius: 16, border: "1px solid #334155", padding: 24, marginBottom: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                  <span style={{ padding: "4px 10px", background: sess.type === "MANANA" ? "#78350f" : "#1e3a5f", color: sess.type === "MANANA" ? "#fcd34d" : "#93c5fd", borderRadius: 20, fontSize: "0.75rem", fontWeight: 700 }}>
                    {sess.type === "MANANA" ? "🌅 MAÑANA" : "🌆 TARDE"}
                  </span>
                  <h2 style={{ fontSize: "1rem", fontWeight: 700, margin: 0, color: "#e2e8f0" }}>Sesión {sIdx + 1}</h2>
                </div>
                {sessions.length > 1 && (
                  <button type="button" onClick={() => setSessions(prev => prev.filter((_, i) => i !== sIdx))} style={{ padding: "4px 10px", background: "#450a0a", color: "#f87171", border: "1px solid #7f1d1d", borderRadius: 6, cursor: "pointer", fontSize: "0.75rem" }}>
                    Eliminar sesión
                  </button>
                )}
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 120px", gap: 12, marginBottom: 20 }}>
                <div>
                  <label style={LABEL}>Tipo</label>
                  <select style={SELECT} value={sess.type} onChange={e => updateSession(sIdx, { type: e.target.value as any })}>
                    <option value="MANANA">Mañana</option>
                    <option value="TARDE">Tarde</option>
                  </select>
                </div>
                <div>
                  <label style={LABEL}>Etiqueta</label>
                  <input style={INPUT} value={sess.label} onChange={e => updateSession(sIdx, { label: e.target.value })} />
                </div>
                <div>
                  <label style={LABEL}>Duración (min)</label>
                  <input type="number" style={INPUT} value={sess.durationMinutes} onChange={e => updateSession(sIdx, { durationMinutes: +e.target.value })} min={0} />
                </div>
              </div>

              {/* Sections */}
              {sess.sections.map((sec, secIdx) => (
                <div key={secIdx} style={{ background: "#0f172a", borderRadius: 12, border: "1px solid #1e293b", padding: "16px 20px", marginBottom: 12 }}>
                  <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 16 }}>
                    <div style={{ flex: 1 }}>
                      <label style={LABEL}>Área</label>
                      <select style={SELECT} value={sec.area} onChange={e => updateSection(sIdx, secIdx, { area: e.target.value })}>
                        <option value="">— Seleccionar —</option>
                        {areas.map(a => <option key={a} value={a}>{a}</option>)}
                      </select>
                    </div>
                    <div style={{ width: 130 }}>
                      <label style={LABEL}>Duración (min)</label>
                      <input type="number" style={INPUT} value={sec.durationMinutes} onChange={e => updateSection(sIdx, secIdx, { durationMinutes: +e.target.value })} min={0} />
                    </div>
                    {sess.sections.length > 1 && (
                      <button type="button" onClick={() => removeSection(sIdx, secIdx)} style={{ marginTop: 20, padding: "8px 10px", background: "#450a0a", color: "#f87171", border: "none", borderRadius: 6, cursor: "pointer" }}>
                        ×
                      </button>
                    )}
                  </div>

                  {/* Rules */}
                  <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#64748b", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>Reglas de selección</div>
                  {sec.rules.map((rule, rIdx) => (
                    <div key={rIdx} style={{ background: "#1e293b", borderRadius: 8, padding: "12px 14px", marginBottom: 8, position: "relative" }}>
                      <div style={{ display: "grid", gridTemplateColumns: "80px 1fr 1fr 1fr 1fr 100px", gap: 10, alignItems: "end" }}>
                        <div>
                          <label style={LABEL}>Cant.</label>
                          <input type="number" style={INPUT} value={rule.count} onChange={e => updateRule(sIdx, secIdx, rIdx, { count: +e.target.value })} min={1} max={50} />
                        </div>
                        <div>
                          <label style={LABEL}>Dificultad</label>
                          <select style={SELECT} value={rule.difficulty ?? ""} onChange={e => updateRule(sIdx, secIdx, rIdx, { difficulty: e.target.value || undefined })}>
                            <option value="">Cualquiera</option>
                            {DIFICULTADES.map(d => <option key={d} value={d}>{d}</option>)}
                          </select>
                        </div>
                        <div>
                          <label style={LABEL}>Tema</label>
                          <input style={INPUT} value={rule.topic ?? ""} onChange={e => updateRule(sIdx, secIdx, rIdx, { topic: e.target.value || undefined })} placeholder="Cualquiera" />
                        </div>
                        <div>
                          <label style={LABEL}>Competencia</label>
                          <input style={INPUT} value={rule.competence ?? ""} onChange={e => updateRule(sIdx, secIdx, rIdx, { competence: e.target.value || undefined })} placeholder="Cualquiera" />
                        </div>
                        <div>
                          <label style={LABEL}>Fuente</label>
                          <select style={SELECT} value={rule.sourceType ?? ""} onChange={e => updateRule(sIdx, secIdx, rIdx, { sourceType: e.target.value || undefined })}>
                            <option value="">Cualquiera</option>
                            {SOURCE_TYPES.map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                        </div>
                        <div>
                          <label style={LABEL}>Excluir recientes (días)</label>
                          <input type="number" style={INPUT} value={rule.excludeRecentDays} onChange={e => updateRule(sIdx, secIdx, rIdx, { excludeRecentDays: +e.target.value })} min={0} />
                        </div>
                      </div>
                      {sec.rules.length > 1 && (
                        <button type="button" onClick={() => removeRule(sIdx, secIdx, rIdx)} style={{ position: "absolute", top: 8, right: 8, background: "none", border: "none", color: "#64748b", cursor: "pointer", fontSize: "1rem" }}>×</button>
                      )}
                    </div>
                  ))}

                  <button type="button" onClick={() => addRule(sIdx, secIdx)} style={{ padding: "6px 14px", background: "none", color: "#3b82f6", border: "1px dashed #1d4ed8", borderRadius: 6, cursor: "pointer", fontSize: "0.8rem", marginTop: 4 }}>
                    + Agregar regla
                  </button>
                </div>
              ))}

              <button type="button" onClick={() => addSection(sIdx)} style={{ width: "100%", padding: "10px", background: "none", color: "#64748b", border: "1px dashed #334155", borderRadius: 10, cursor: "pointer", fontSize: "0.85rem", marginTop: 4 }}>
                + Agregar sección
              </button>
            </div>
          ))}

          {sessions.length < 2 && (
            <button type="button" onClick={addSession} style={{ width: "100%", padding: "14px", background: "none", color: "#3b82f6", border: "1px dashed #1d4ed8", borderRadius: 12, cursor: "pointer", fontSize: "0.9rem", marginBottom: 20, fontWeight: 600 }}>
              + Agregar sesión {sessions.some(s => s.type === "MANANA") && !sessions.some(s => s.type === "TARDE") ? "(Tarde)" : ""}
            </button>
          )}

          {error && (
            <div style={{ padding: "12px 16px", background: "#450a0a", color: "#fca5a5", borderRadius: 10, marginBottom: 16, fontSize: "0.875rem" }}>
              {error}
            </div>
          )}

          <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
            <button type="button" onClick={() => router.back()} style={{ padding: "12px 24px", background: "#1e293b", color: "#94a3b8", border: "1px solid #334155", borderRadius: 10, cursor: "pointer", fontWeight: 600 }}>
              Cancelar
            </button>
            <button type="submit" disabled={saving} style={{ padding: "12px 28px", background: "#1d4ed8", color: "#fff", border: "none", borderRadius: 10, cursor: "pointer", fontWeight: 700, opacity: saving ? 0.6 : 1 }}>
              {saving ? "Guardando…" : "Crear plantilla"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
