"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import SchoolAdminSidebar from "@/components/school-admin/SchoolAdminSidebar";
import { api } from "@/lib/api";

// ── Types ──────────────────────────────────────────────────────────────────

interface AreaConfig { area: string; count: number; difficulty: string }

interface QuestionPreview {
  id: string; enunciado: string; area: string; difficulty: string;
  topic: string | null; subtopic: string | null; year: number | null;
}

const COLORS = ["#7c3aed","#004aad","#059669","#d95e00","#0891b2","#be123c","#b45309","#1d4ed8"];
const EMOJIS = ["⚡","📝","🧪","📊","🎯","🧮","🔬","📐","🌍","📚","💡","🏆"];
const AREAS = ["Matemáticas","Lectura Crítica","Ciencias Naturales","Ciencias Sociales","Inglés","Razonamiento Cuantitativo"];
const DIFFS = [{ value: "", label: "Cualquiera" }, { value: "FACIL", label: "Fácil" }, { value: "MEDIA", label: "Media" }, { value: "DIFICIL", label: "Difícil" }];

// ── Component ──────────────────────────────────────────────────────────────

export default function NuevoLibrePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  // Step 1/2/3
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Step 1: Basic info
  const [titulo, setTitulo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [timeLimitMinutes, setTimeLimitMinutes] = useState(30);
  const [instructions, setInstructions] = useState("");
  const [showResults, setShowResults] = useState(true);
  const [allowBack, setAllowBack] = useState(true);
  const [color, setColor] = useState(COLORS[0]);
  const [emoji, setEmoji] = useState(EMOJIS[0]);

  // Step 2: Questions
  const [mode, setMode] = useState<"AUTO" | "MANUAL">("AUTO");
  const [areaConfigs, setAreaConfigs] = useState<AreaConfig[]>([
    { area: "MATEMATICAS", count: 10, difficulty: "" },
  ]);

  // Manual mode state
  const [bankSearch, setBankSearch] = useState("");
  const [bankArea, setBankArea] = useState("");
  const [bankDiff, setBankDiff] = useState("");
  const [bankPage, setBankPage] = useState(1);
  const [bankResults, setBankResults] = useState<QuestionPreview[]>([]);
  const [bankTotal, setBankTotal] = useState(0);
  const [bankLoading, setBankLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectedQuestions, setSelectedQuestions] = useState<QuestionPreview[]>([]);

  // Step 3: Review + save
  const [isPublished, setIsPublished] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!loading && (!user || user.role !== "ADMIN")) router.replace("/auth/login");
  }, [user, loading]);

  // ── Question bank fetch ────────────────────────────────────────────────
  const fetchBank = useCallback(async (page: number) => {
    setBankLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "15" });
      if (bankSearch) params.set("search", bankSearch);
      if (bankArea) params.set("area", bankArea);
      if (bankDiff) params.set("difficulty", bankDiff);
      const result = await api.get<{ total: number; questions: QuestionPreview[] }>(
        `/simulacros/questions/bank?${params}`
      );
      setBankResults(result.questions);
      setBankTotal(result.total);
    } catch { setBankResults([]); }
    finally { setBankLoading(false); }
  }, [bankSearch, bankArea, bankDiff]);

  useEffect(() => {
    if (mode === "MANUAL" && step === 2) fetchBank(bankPage);
  }, [mode, step, bankPage, fetchBank]);

  // ── Area config helpers ────────────────────────────────────────────────
  function addArea() {
    const used = new Set(areaConfigs.map(a => a.area));
    const next = AREAS.find(a => !used.has(a));
    if (next) setAreaConfigs(prev => [...prev, { area: next, count: 5, difficulty: "" }]);
  }

  function removeArea(i: number) { setAreaConfigs(prev => prev.filter((_, idx) => idx !== i)); }

  function updateArea(i: number, field: keyof AreaConfig, value: string | number) {
    setAreaConfigs(prev => prev.map((c, idx) => idx === i ? { ...c, [field]: value } : c));
  }

  // ── Manual selection helpers ───────────────────────────────────────────
  function toggleQuestion(q: QuestionPreview) {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(q.id)) {
        next.delete(q.id);
        setSelectedQuestions(sq => sq.filter(x => x.id !== q.id));
      } else {
        next.add(q.id);
        setSelectedQuestions(sq => [...sq, q]);
      }
      return next;
    });
  }

  // ── Step validation ────────────────────────────────────────────────────
  function step1Valid() { return titulo.trim().length > 0 && timeLimitMinutes >= 5; }
  function step2Valid() {
    if (mode === "AUTO") return areaConfigs.length > 0 && areaConfigs.every(c => c.count >= 1);
    return selectedIds.size >= 1;
  }

  // ── Submit ─────────────────────────────────────────────────────────────
  async function handleSave() {
    setSaving(true); setError("");
    try {
      const body: any = {
        titulo: titulo.trim(),
        descripcion: descripcion.trim() || undefined,
        timeLimitMinutes,
        instructions: instructions.trim() || undefined,
        emoji, color,
        showResultsImmediately: showResults,
        allowBackNavigation: allowBack,
        isPublished,
        mode,
      };
      if (mode === "AUTO") {
        body.autoConfig = areaConfigs.map(c => ({
          area: c.area,
          count: c.count,
          difficulty: c.difficulty || undefined,
        }));
      } else {
        body.questionIds = Array.from(selectedIds);
      }
      const result = await api.post<{ id: string }>("/simulacros/libre", body);
      router.push(`/school-admin/simulacros/${result.id}`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error al crear el simulacro");
      setSaving(false);
    }
  }

  const totalPreguntas = mode === "AUTO"
    ? areaConfigs.reduce((s, c) => s + (c.count || 0), 0)
    : selectedIds.size;

  if (loading) return null;

  return (
    <div className="admin-layout">
      <SchoolAdminSidebar />
      <main className="admin-main">
        <div className="admin-content" style={{ maxWidth: 760 }}>

          {/* Header */}
          <div style={{ marginBottom: 28 }}>
            <Link href="/school-admin/simulacros" style={{ color: "#64748b", textDecoration: "none", fontSize: "0.875rem" }}>
              ← Mis simulacros
            </Link>
            <h1 style={{ fontFamily: "var(--font-poppins)", fontWeight: 800, fontSize: "1.5rem", color: "#1e293b", margin: "8px 0 4px" }}>
              Nuevo simulacro libre
            </h1>
            <p style={{ color: "#64748b", fontSize: "0.9rem" }}>
              Crea un simulacro personalizado de cualquier tamaño y tiempo.
            </p>
          </div>

          {/* Steps */}
          <div style={{ display: "flex", gap: 0, marginBottom: 28 }}>
            {(["Información", "Preguntas", "Revisar"] as const).map((label, i) => {
              const num = i + 1;
              const active = step === num;
              const done = step > num;
              return (
                <div key={label} style={{ display: "flex", alignItems: "center", flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: "50%", display: "flex", alignItems: "center",
                      justifyContent: "center", fontWeight: 800, fontSize: "0.8rem",
                      background: active ? "#7c3aed" : done ? "#059669" : "#e2e8f0",
                      color: active || done ? "#fff" : "#94a3b8",
                    }}>
                      {done ? "✓" : num}
                    </div>
                    <span style={{ fontSize: "0.82rem", fontWeight: active ? 700 : 500, color: active ? "#1e293b" : "#94a3b8" }}>
                      {label}
                    </span>
                  </div>
                  {i < 2 && <div style={{ flex: 1, height: 2, background: done ? "#059669" : "#e2e8f0", margin: "0 8px" }} />}
                </div>
              );
            })}
          </div>

          {/* ── STEP 1: Basic info ──────────────────────────────────── */}
          {step === 1 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              {/* Preview card */}
              <div style={{ padding: "16px 20px", borderRadius: 14, border: "2px solid #e2e8f0", background: "#fff", display: "flex", alignItems: "center", gap: 14 }}>
                <div style={{ width: 48, height: 48, borderRadius: 12, background: `${color}18`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.6rem", border: `2px solid ${color}30` }}>
                  {emoji}
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: "1rem", color: "#1e293b" }}>{titulo || "Título del simulacro"}</div>
                  <div style={{ fontSize: "0.78rem", color: "#94a3b8", marginTop: 2 }}>{timeLimitMinutes} min · Simulacro libre</div>
                </div>
              </div>

              {/* Título */}
              <div>
                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, color: "#374151", marginBottom: 6 }}>Título *</label>
                <input value={titulo} onChange={e => setTitulo(e.target.value)} maxLength={120}
                  placeholder="Ej: Práctica Matemáticas — Semana 3"
                  style={{ width: "100%", padding: "11px 14px", borderRadius: 10, border: "1.5px solid #e2e8f0", fontSize: "0.95rem", boxSizing: "border-box" }}
                />
              </div>

              {/* Descripción */}
              <div>
                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, color: "#374151", marginBottom: 6 }}>Descripción</label>
                <textarea value={descripcion} onChange={e => setDescripcion(e.target.value)} rows={2}
                  placeholder="Breve descripción opcional…"
                  style={{ width: "100%", padding: "11px 14px", borderRadius: 10, border: "1.5px solid #e2e8f0", fontSize: "0.9rem", resize: "vertical", boxSizing: "border-box" }}
                />
              </div>

              {/* Tiempo límite */}
              <div>
                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, color: "#374151", marginBottom: 8 }}>Tiempo límite *</label>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  {[10, 15, 20, 30, 45, 60, 90, 120].map(t => (
                    <button key={t} type="button" onClick={() => setTimeLimitMinutes(t)}
                      style={{ padding: "8px 16px", borderRadius: 10, border: timeLimitMinutes === t ? "2px solid #7c3aed" : "1.5px solid #e2e8f0", background: timeLimitMinutes === t ? "#f5f3ff" : "#fff", color: timeLimitMinutes === t ? "#7c3aed" : "#374151", fontWeight: 700, fontSize: "0.85rem", cursor: "pointer" }}>
                      {t} min
                    </button>
                  ))}
                </div>
                <input type="number" value={timeLimitMinutes} onChange={e => setTimeLimitMinutes(Math.max(5, Math.min(480, parseInt(e.target.value) || 5)))}
                  min={5} max={480}
                  style={{ marginTop: 10, width: 120, padding: "8px 12px", borderRadius: 8, border: "1.5px solid #e2e8f0", fontSize: "0.9rem" }}
                />
                <span style={{ marginLeft: 8, fontSize: "0.82rem", color: "#94a3b8" }}>min (personalizado)</span>
              </div>

              {/* Instrucciones */}
              <div>
                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, color: "#374151", marginBottom: 6 }}>Instrucciones para el estudiante</label>
                <textarea value={instructions} onChange={e => setInstructions(e.target.value)} rows={2}
                  placeholder="Instrucciones que verá el estudiante antes de iniciar…"
                  style={{ width: "100%", padding: "11px 14px", borderRadius: 10, border: "1.5px solid #e2e8f0", fontSize: "0.9rem", resize: "vertical", boxSizing: "border-box" }}
                />
              </div>

              {/* Color */}
              <div>
                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, color: "#374151", marginBottom: 8 }}>Color</label>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  {COLORS.map(c => (
                    <button key={c} type="button" onClick={() => setColor(c)}
                      style={{ width: 32, height: 32, borderRadius: "50%", background: c, border: color === c ? `3px solid ${c}` : "3px solid transparent", outline: color === c ? "2px solid #1e293b" : "none", cursor: "pointer" }}
                    />
                  ))}
                </div>
              </div>

              {/* Emoji */}
              <div>
                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, color: "#374151", marginBottom: 8 }}>Ícono</label>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {EMOJIS.map(em => (
                    <button key={em} type="button" onClick={() => setEmoji(em)}
                      style={{ width: 38, height: 38, borderRadius: 10, fontSize: "1.2rem", background: emoji === em ? "#f5f3ff" : "#f8fafc", border: emoji === em ? "2px solid #7c3aed" : "2px solid transparent", cursor: "pointer" }}>
                      {em}
                    </button>
                  ))}
                </div>
              </div>

              {/* Opciones */}
              <div style={{ display: "flex", gap: 20 }}>
                {[
                  { label: "Mostrar resultados al final", value: showResults, setter: setShowResults },
                  { label: "Permitir navegar atrás", value: allowBack, setter: setAllowBack },
                ].map(({ label, value, setter }) => (
                  <label key={label} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: "0.875rem", color: "#374151" }}>
                    <input type="checkbox" checked={value} onChange={e => setter(e.target.checked)}
                      style={{ width: 16, height: 16, accentColor: "#7c3aed" }}
                    />
                    {label}
                  </label>
                ))}
              </div>

              <button onClick={() => setStep(2)} disabled={!step1Valid()}
                style={{ padding: "13px 0", background: step1Valid() ? "#7c3aed" : "#94a3b8", color: "#fff", borderRadius: 10, border: "none", cursor: step1Valid() ? "pointer" : "not-allowed", fontWeight: 800, fontSize: "0.95rem" }}>
                Siguiente → Preguntas
              </button>
            </div>
          )}

          {/* ── STEP 2: Questions ────────────────────────────────────── */}
          {step === 2 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

              {/* Mode tabs */}
              <div style={{ display: "flex", background: "#f1f5f9", borderRadius: 10, padding: 4, width: "fit-content" }}>
                {(["AUTO", "MANUAL"] as const).map(m => (
                  <button key={m} onClick={() => setMode(m)}
                    style={{ padding: "8px 22px", borderRadius: 8, border: "none", cursor: "pointer", fontWeight: 700, fontSize: "0.85rem", background: mode === m ? "#fff" : "transparent", color: mode === m ? "#7c3aed" : "#64748b", boxShadow: mode === m ? "0 1px 4px rgba(0,0,0,0.08)" : "none" }}>
                    {m === "AUTO" ? "Automático" : "Manual"}
                  </button>
                ))}
              </div>

              {/* AUTO mode */}
              {mode === "AUTO" && (
                <div>
                  <p style={{ fontSize: "0.85rem", color: "#64748b", marginBottom: 16 }}>
                    El sistema seleccionará preguntas del banco de forma automática usando el algoritmo LRU (menor uso reciente).
                  </p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {areaConfigs.map((cfg, i) => (
                      <div key={i} style={{ display: "flex", gap: 10, alignItems: "center", background: "#f8fafc", borderRadius: 10, padding: "12px 14px", border: "1px solid #e2e8f0" }}>
                        <select value={cfg.area} onChange={e => updateArea(i, "area", e.target.value)}
                          style={{ flex: 2, padding: "8px 10px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: "0.85rem" }}>
                          {AREAS.map(a => <option key={a} value={a}>{a}</option>)}
                        </select>
                        <input type="number" value={cfg.count} onChange={e => updateArea(i, "count", parseInt(e.target.value) || 1)}
                          min={1} max={200}
                          style={{ width: 70, padding: "8px 10px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: "0.85rem", textAlign: "center" }}
                        />
                        <span style={{ fontSize: "0.78rem", color: "#94a3b8" }}>pregs.</span>
                        <select value={cfg.difficulty} onChange={e => updateArea(i, "difficulty", e.target.value)}
                          style={{ flex: 1, padding: "8px 10px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: "0.85rem" }}>
                          {DIFFS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                        </select>
                        {areaConfigs.length > 1 && (
                          <button onClick={() => removeArea(i)}
                            style={{ padding: "6px 10px", background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca", borderRadius: 8, cursor: "pointer", fontWeight: 700, fontSize: "0.82rem" }}>
                            ✕
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  {areaConfigs.length < AREAS.length && (
                    <button onClick={addArea}
                      style={{ marginTop: 10, padding: "8px 18px", background: "#f5f3ff", color: "#7c3aed", border: "1.5px dashed #c4b5fd", borderRadius: 8, cursor: "pointer", fontWeight: 700, fontSize: "0.85rem" }}>
                      + Agregar área
                    </button>
                  )}

                  <div style={{ marginTop: 16, padding: "12px 16px", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 10, fontSize: "0.85rem", color: "#166534" }}>
                    Total: <strong>{totalPreguntas} preguntas</strong> en {areaConfigs.length} área{areaConfigs.length !== 1 ? "s" : ""}
                    {" "}· Tiempo: <strong>{timeLimitMinutes} min</strong>
                  </div>
                </div>
              )}

              {/* MANUAL mode */}
              {mode === "MANUAL" && (
                <div>
                  <p style={{ fontSize: "0.85rem", color: "#64748b", marginBottom: 12 }}>
                    Busca y selecciona preguntas específicas del banco. <strong>{selectedIds.size}</strong> seleccionada{selectedIds.size !== 1 ? "s" : ""}.
                  </p>

                  {/* Search bar */}
                  <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
                    <input value={bankSearch} onChange={e => setBankSearch(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter") { setBankPage(1); fetchBank(1); } }}
                      placeholder="Buscar por texto…"
                      style={{ flex: 2, minWidth: 160, padding: "8px 12px", borderRadius: 8, border: "1.5px solid #e2e8f0", fontSize: "0.85rem" }}
                    />
                    <select value={bankArea} onChange={e => { setBankArea(e.target.value); setBankPage(1); }}
                      style={{ flex: 1, minWidth: 130, padding: "8px 10px", borderRadius: 8, border: "1.5px solid #e2e8f0", fontSize: "0.85rem" }}>
                      <option value="">Todas las áreas</option>
                      {AREAS.map(a => <option key={a} value={a}>{a}</option>)}
                    </select>
                    <select value={bankDiff} onChange={e => { setBankDiff(e.target.value); setBankPage(1); }}
                      style={{ padding: "8px 10px", borderRadius: 8, border: "1.5px solid #e2e8f0", fontSize: "0.85rem" }}>
                      {DIFFS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                    </select>
                    <button onClick={() => { setBankPage(1); fetchBank(1); }}
                      style={{ padding: "8px 16px", background: "#7c3aed", color: "#fff", borderRadius: 8, border: "none", cursor: "pointer", fontWeight: 700, fontSize: "0.85rem" }}>
                      Buscar
                    </button>
                  </div>

                  {/* Results */}
                  <div style={{ border: "1px solid #e2e8f0", borderRadius: 10, overflow: "hidden", maxHeight: 340, overflowY: "auto" }}>
                    {bankLoading ? (
                      <div style={{ padding: 24, textAlign: "center", color: "#94a3b8", fontSize: "0.85rem" }}>Cargando…</div>
                    ) : bankResults.length === 0 ? (
                      <div style={{ padding: 24, textAlign: "center", color: "#94a3b8", fontSize: "0.85rem" }}>Sin resultados</div>
                    ) : bankResults.map(q => (
                      <div key={q.id} style={{ padding: "10px 14px", borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "flex-start", gap: 10, background: selectedIds.has(q.id) ? "#f5f3ff" : "#fff" }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: "0.82rem", color: "#1e293b", marginBottom: 3 }}>
                            {q.enunciado.length > 140 ? q.enunciado.slice(0, 140) + "…" : q.enunciado}
                          </div>
                          <div style={{ display: "flex", gap: 6 }}>
                            <span style={{ fontSize: "0.7rem", fontWeight: 700, color: "#7c3aed", background: "#f5f3ff", padding: "1px 7px", borderRadius: 12 }}>{q.area}</span>
                            <span style={{ fontSize: "0.7rem", color: "#64748b", background: "#f1f5f9", padding: "1px 7px", borderRadius: 12 }}>{q.difficulty}</span>
                            {q.topic && <span style={{ fontSize: "0.7rem", color: "#94a3b8" }}>{q.topic}</span>}
                          </div>
                        </div>
                        <button onClick={() => toggleQuestion(q)}
                          style={{ flexShrink: 0, padding: "5px 12px", borderRadius: 8, border: "none", cursor: "pointer", fontWeight: 700, fontSize: "0.78rem", background: selectedIds.has(q.id) ? "#dcfce7" : "#f0f4ff", color: selectedIds.has(q.id) ? "#15803d" : "#004aad" }}>
                          {selectedIds.has(q.id) ? "✓ Quitada" : "+ Añadir"}
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Pagination */}
                  {bankTotal > 15 && (
                    <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 10 }}>
                      <button onClick={() => setBankPage(p => Math.max(1, p - 1))} disabled={bankPage === 1}
                        style={{ padding: "5px 14px", borderRadius: 8, border: "1px solid #e2e8f0", background: "#fff", cursor: "pointer", fontSize: "0.8rem" }}>
                        ‹
                      </button>
                      <span style={{ padding: "5px 10px", fontSize: "0.8rem", color: "#64748b" }}>
                        {bankPage} / {Math.ceil(bankTotal / 15)}
                      </span>
                      <button onClick={() => setBankPage(p => p + 1)} disabled={bankPage >= Math.ceil(bankTotal / 15)}
                        style={{ padding: "5px 14px", borderRadius: 8, border: "1px solid #e2e8f0", background: "#fff", cursor: "pointer", fontSize: "0.8rem" }}>
                        ›
                      </button>
                    </div>
                  )}

                  {/* Selected summary */}
                  {selectedIds.size > 0 && (
                    <div style={{ marginTop: 14, padding: "12px 16px", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 10, fontSize: "0.85rem", color: "#166534" }}>
                      {selectedIds.size} pregunta{selectedIds.size !== 1 ? "s" : ""} seleccionada{selectedIds.size !== 1 ? "s" : ""}
                    </div>
                  )}
                </div>
              )}

              <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
                <button onClick={() => setStep(1)}
                  style={{ padding: "11px 20px", background: "#f1f5f9", color: "#475569", borderRadius: 10, border: "none", cursor: "pointer", fontWeight: 700, fontSize: "0.9rem" }}>
                  ← Atrás
                </button>
                <button onClick={() => setStep(3)} disabled={!step2Valid()}
                  style={{ flex: 1, padding: "11px 0", background: step2Valid() ? "#7c3aed" : "#94a3b8", color: "#fff", borderRadius: 10, border: "none", cursor: step2Valid() ? "pointer" : "not-allowed", fontWeight: 800, fontSize: "0.95rem" }}>
                  Siguiente → Revisar
                </button>
              </div>
            </div>
          )}

          {/* ── STEP 3: Review ───────────────────────────────────────── */}
          {step === 3 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              {/* Summary card */}
              <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #e2e8f0", padding: "20px 24px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }}>
                  <div style={{ width: 52, height: 52, borderRadius: 14, background: `${color}18`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.7rem", border: `2px solid ${color}30` }}>
                    {emoji}
                  </div>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: "1.1rem", color: "#1e293b" }}>{titulo}</div>
                    {descripcion && <div style={{ fontSize: "0.82rem", color: "#94a3b8", marginTop: 2 }}>{descripcion}</div>}
                  </div>
                  <span style={{ marginLeft: "auto", padding: "4px 12px", borderRadius: 20, fontSize: "0.75rem", fontWeight: 700, background: "#d1fae5", color: "#065f46" }}>
                    Simulacro Libre
                  </span>
                </div>
                <div style={{ display: "flex", gap: 20, flexWrap: "wrap", fontSize: "0.85rem", color: "#64748b" }}>
                  <span>⏱ {timeLimitMinutes} minutos</span>
                  <span>❓ {totalPreguntas} preguntas</span>
                  {mode === "AUTO" && <span>Áreas: {areaConfigs.map(c => c.area).join(", ")}</span>}
                  {mode === "MANUAL" && <span>Modo: selección manual</span>}
                  {showResults && <span>Resultados inmediatos</span>}
                  {allowBack && <span>Navegación libre</span>}
                </div>
              </div>

              {/* Publish toggle */}
              <div style={{ background: "#f8fafc", borderRadius: 12, border: "1px solid #e2e8f0", padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: "0.9rem", color: "#1e293b" }}>¿Publicar al guardar?</div>
                  <div style={{ fontSize: "0.8rem", color: "#94a3b8" }}>
                    {isPublished ? "Los estudiantes podrán verlo una vez asignado." : "Se guardará como borrador, puedes publicarlo después."}
                  </div>
                </div>
                <button onClick={() => setIsPublished(p => !p)}
                  style={{ padding: "8px 20px", borderRadius: 10, border: "none", cursor: "pointer", fontWeight: 700, fontSize: "0.85rem", background: isPublished ? "#059669" : "#f1f5f9", color: isPublished ? "#fff" : "#475569" }}>
                  {isPublished ? "Publicado" : "Borrador"}
                </button>
              </div>

              {error && (
                <div style={{ background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 10, padding: "10px 14px", color: "#991b1b", fontSize: "0.875rem" }}>
                  {error}
                </div>
              )}

              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={() => setStep(2)}
                  style={{ padding: "13px 20px", background: "#f1f5f9", color: "#475569", borderRadius: 10, border: "none", cursor: "pointer", fontWeight: 700, fontSize: "0.9rem" }}>
                  ← Atrás
                </button>
                <button onClick={handleSave} disabled={saving}
                  style={{ flex: 1, padding: "13px 0", background: saving ? "#94a3b8" : "#059669", color: "#fff", borderRadius: 10, border: "none", cursor: saving ? "not-allowed" : "pointer", fontWeight: 800, fontSize: "0.95rem", fontFamily: "var(--font-poppins)" }}>
                  {saving ? "Creando…" : "Crear simulacro libre"}
                </button>
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
