"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import SchoolAdminSidebar from "@/components/school-admin/SchoolAdminSidebar";
import { api } from "@/lib/api";
import ImagePicker from "@/components/ImagePicker";

interface OptionForm { letra: string; texto: string; imageUrl: string; isCorrect: boolean; }
interface QuestionTag { id: string; name: string; color?: string; }

const COMMON_AREAS = ["Lectura Crítica", "Matemáticas", "Ciencias Naturales", "Ciencias Sociales", "Inglés", "Razonamiento Cuantitativo"];
const SOURCE_TYPES = [
  { value: "PROPIA", label: "Propia" },
  { value: "ICFES", label: "ICFES" },
  { value: "UDEA", label: "U de A" },
  { value: "SABER", label: "Saber" },
  { value: "OTRA", label: "Otra" },
];

function buildOptions(count: number, existing: OptionForm[]): OptionForm[] {
  return Array.from({ length: count }, (_, i) => {
    const letra = String.fromCharCode(65 + i);
    const found = existing.find(o => o.letra === letra);
    return found ?? { letra, texto: "", imageUrl: "", isCorrect: false };
  });
}

export default function NuevaPreguntaSchoolPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [saving, setSaving] = useState(false);
  const [area, setArea] = useState("");
  const [areaCustom, setAreaCustom] = useState("");
  const [examType, setExamType] = useState("ICFES");
  const [difficulty, setDifficulty] = useState("MEDIA");
  const [enunciado, setEnunciado] = useState("");
  const [contexto, setContexto] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [explicacion, setExplicacion] = useState("");
  const [options, setOptions] = useState<OptionForm[]>(buildOptions(4, []));

  const [questionType, setQuestionType] = useState<"SINGLE_CHOICE" | "MULTIPLE_CHOICE" | "TRUE_FALSE">("SINGLE_CHOICE");
  const [optionCount, setOptionCount] = useState(4);
  const [subject, setSubject] = useState("");

  const [topic, setTopic] = useState("");
  const [subtopic, setSubtopic] = useState("");
  const [competence, setCompetence] = useState("");
  const [component, setComponent] = useState("");
  const [gradeLevel, setGradeLevel] = useState("");
  const [year, setYear] = useState("");
  const [sourceType, setSourceType] = useState("PROPIA");

  const [allTags, setAllTags] = useState<QuestionTag[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);

  useEffect(() => {
    if (!loading && !user) router.replace("/auth/login");
    if (!loading && user && user.role !== "ADMIN") router.replace("/dashboard");
  }, [user, loading]);

  useEffect(() => {
    if (!user) return;
    api.get<QuestionTag[]>("/question-tags").then(r => setAllTags(Array.isArray(r) ? r : [])).catch(() => {});
  }, [user]);

  useEffect(() => {
    if (questionType === "TRUE_FALSE") {
      setOptionCount(2);
      setOptions([
        { letra: "A", texto: "Verdadero", imageUrl: "", isCorrect: true },
        { letra: "B", texto: "Falso", imageUrl: "", isCorrect: false },
      ]);
    } else {
      setOptions(prev => buildOptions(optionCount, prev));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [questionType]);

  useEffect(() => {
    if (questionType === "TRUE_FALSE") return;
    setOptions(prev => buildOptions(optionCount, prev));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [optionCount]);

  function setOptionField(idx: number, field: keyof OptionForm, value: string | boolean) {
    setOptions(prev => prev.map((o, i) => i === idx ? { ...o, [field]: value } : o));
  }

  function setCorrectOption(idx: number) {
    if (questionType === "MULTIPLE_CHOICE") {
      setOptions(prev => prev.map((o, i) => i === idx ? { ...o, isCorrect: !o.isCorrect } : o));
    } else {
      setOptions(prev => prev.map((o, i) => ({ ...o, isCorrect: i === idx })));
    }
  }

  function validateOptions(): boolean {
    const correctCount = options.filter(o => o.isCorrect).length;
    if (questionType === "SINGLE_CHOICE" || questionType === "TRUE_FALSE") return correctCount === 1;
    if (questionType === "MULTIPLE_CHOICE") return correctCount >= 1;
    return true;
  }

  function toggleTag(id: string) {
    setSelectedTagIds(prev => prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]);
  }

  const resolvedArea = area === "__custom__" ? areaCustom : area;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!enunciado.trim()) { alert("El enunciado es requerido."); return; }
    if (!resolvedArea.trim()) { alert("El área es requerida."); return; }
    if (!validateOptions()) { alert(questionType === "MULTIPLE_CHOICE" ? "Selecciona al menos una respuesta correcta" : "Debes marcar exactamente una opción como correcta"); return; }
    if (questionType !== "TRUE_FALSE" && options.some(o => !o.texto.trim())) { alert("Todas las opciones deben tener texto."); return; }

    setSaving(true);
    try {
      await api.post("/questions", {
        enunciado: enunciado.trim(),
        contexto: contexto.trim() || undefined,
        imageUrl: imageUrl.trim() || undefined,
        area: resolvedArea.trim(),
        examType,
        difficulty,
        explicacion: explicacion.trim() || undefined,
        topic: topic.trim() || undefined,
        subtopic: subtopic.trim() || undefined,
        competence: competence.trim() || undefined,
        component: component.trim() || undefined,
        gradeLevel: gradeLevel ? parseInt(gradeLevel) : undefined,
        year: year ? parseInt(year) : undefined,
        sourceType,
        subject: subject.trim() || undefined,
        questionType,
        tagIds: selectedTagIds.length > 0 ? selectedTagIds : undefined,
        options: options.map(o => ({ letra: o.letra, texto: o.texto.trim(), imageUrl: o.imageUrl.trim() || undefined, isCorrect: o.isCorrect })),
      });
      router.push("/school-admin/preguntas");
    } catch (e: any) {
      alert("Error al guardar: " + (e.message ?? ""));
      setSaving(false);
    }
  }

  if (loading || !user) return null;

  const qtypeLabel: Record<string, string> = {
    SINGLE_CHOICE: "Selección única",
    MULTIPLE_CHOICE: "Selección múltiple",
    TRUE_FALSE: "Verdadero / Falso",
  };

  return (
    <div className="admin-layout">
      <SchoolAdminSidebar />
      <main className="admin-main">
        <div className="admin-content">

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
            <div>
              <Link href="/school-admin/preguntas" style={{ color: "#64748b", textDecoration: "none", fontSize: "0.875rem" }}>← Banco de preguntas</Link>
              <h1 style={{ fontSize: "1.5rem", fontWeight: 800, color: "#1e293b", margin: "6px 0 4px" }}>Nueva pregunta</h1>
              <p style={{ color: "#64748b", fontSize: "0.875rem", margin: 0 }}>Se guardará en el banco de tu institución.</p>
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: 24, alignItems: "start" }}>

              {/* LEFT */}
              <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>

                {/* Info general */}
                <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e2eaf7", padding: "24px 28px" }}>
                  <h2 style={sectionTitle}>Información general</h2>

                  {/* Tipo de pregunta */}
                  <div style={{ marginBottom: 20 }}>
                    <label style={labelStyle}>Tipo de pregunta</label>
                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                      {[
                        { value: "SINGLE_CHOICE", label: "Selección única", desc: "Una sola respuesta correcta", icon: "◉" },
                        { value: "TRUE_FALSE", label: "Verdadero / Falso", desc: "Dos opciones fijas", icon: "⊙" },
                        { value: "MULTIPLE_CHOICE", label: "Selección múltiple", desc: "Varias respuestas correctas", icon: "☑" },
                      ].map(t => (
                        <button key={t.value} type="button" onClick={() => setQuestionType(t.value as any)}
                          style={{ padding: "10px 16px", borderRadius: 10, border: `2px solid ${questionType === t.value ? "#004aad" : "#e2eaf7"}`, background: questionType === t.value ? "#eff6ff" : "#fafafa", cursor: "pointer", textAlign: "left", minWidth: 160 }}>
                          <div style={{ fontWeight: 700, fontSize: "0.85rem", color: questionType === t.value ? "#004aad" : "#1e293b" }}>{t.icon} {t.label}</div>
                          <div style={{ fontSize: "0.72rem", color: "#94a3b8", marginTop: 2 }}>{t.desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
                    <div>
                      <label style={labelStyle}>Área *</label>
                      <select value={area} onChange={e => setArea(e.target.value)} required style={inputStyle}>
                        <option value="">Seleccionar…</option>
                        {COMMON_AREAS.map(a => <option key={a} value={a}>{a}</option>)}
                        <option value="__custom__">Otra (escribir)</option>
                      </select>
                      {area === "__custom__" && (
                        <input type="text" value={areaCustom} onChange={e => setAreaCustom(e.target.value)} placeholder="Escribe el área" style={{ ...inputStyle, marginTop: 8 }} required />
                      )}
                    </div>
                    <div>
                      <label style={labelStyle}>Asignatura</label>
                      <input type="text" value={subject} onChange={e => setSubject(e.target.value)}
                        placeholder="Ej: Biología, Trigonometría…"
                        style={inputStyle} />
                    </div>
                    <div>
                      <label style={labelStyle}>Tipo de examen *</label>
                      <select value={examType} onChange={e => setExamType(e.target.value)} style={inputStyle}>
                        <option value="ICFES">ICFES</option>
                        <option value="UDEA">UDEA</option>
                      </select>
                    </div>
                    <div>
                      <label style={labelStyle}>Dificultad *</label>
                      <select value={difficulty} onChange={e => setDifficulty(e.target.value)} style={inputStyle}>
                        <option value="FACIL">Fácil</option>
                        <option value="MEDIA">Media</option>
                        <option value="DIFICIL">Difícil</option>
                      </select>
                    </div>
                  </div>

                  <div style={{ marginBottom: 16 }}>
                    <label style={labelStyle}>Enunciado *</label>
                    <textarea value={enunciado} onChange={e => setEnunciado(e.target.value)} rows={4} required placeholder="Escribe el enunciado…" style={{ ...inputStyle, resize: "vertical" }} />
                  </div>
                  <div style={{ marginBottom: 16 }}>
                    <label style={labelStyle}>Contexto (opcional)</label>
                    <textarea value={contexto} onChange={e => setContexto(e.target.value)} rows={3} placeholder="Texto de contexto o lectura…" style={{ ...inputStyle, resize: "vertical" }} />
                  </div>
                  <div style={{ marginBottom: 16 }}>
                    <label style={labelStyle}>Imagen del enunciado (opcional)</label>
                    <ImagePicker value={imageUrl} onChange={setImageUrl} />
                  </div>
                  <div>
                    <label style={labelStyle}>Explicación de la respuesta (opcional)</label>
                    <textarea value={explicacion} onChange={e => setExplicacion(e.target.value)} rows={3} placeholder="¿Por qué la respuesta correcta es correcta?" style={{ ...inputStyle, resize: "vertical" }} />
                  </div>
                </div>

                {/* Metadata */}
                <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e2eaf7", padding: "24px 28px" }}>
                  <h2 style={sectionTitle}>Metadata académica</h2>
                  <p style={{ fontSize: "0.8rem", color: "#94a3b8", margin: "0 0 16px" }}>Usada para analítica. Todos opcionales.</p>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
                    <div><label style={labelStyle}>Competencia</label><input type="text" value={competence} onChange={e => setCompetence(e.target.value)} placeholder="Ej: Comprensión lectora" style={inputStyle} /></div>
                    <div><label style={labelStyle}>Componente</label><input type="text" value={component} onChange={e => setComponent(e.target.value)} placeholder="Ej: Semántico" style={inputStyle} /></div>
                    <div><label style={labelStyle}>Tema</label><input type="text" value={topic} onChange={e => setTopic(e.target.value)} placeholder="Ej: Álgebra" style={inputStyle} /></div>
                    <div><label style={labelStyle}>Subtema</label><input type="text" value={subtopic} onChange={e => setSubtopic(e.target.value)} placeholder="Ej: Ecuaciones lineales" style={inputStyle} /></div>
                    <div>
                      <label style={labelStyle}>Grado</label>
                      <select value={gradeLevel} onChange={e => setGradeLevel(e.target.value)} style={inputStyle}>
                        <option value="">Sin especificar</option>
                        {[6,7,8,9,10,11].map(g => <option key={g} value={g}>Grado {g}</option>)}
                      </select>
                    </div>
                    <div><label style={labelStyle}>Año</label><input type="number" value={year} onChange={e => setYear(e.target.value)} placeholder="Ej: 2024" min={2000} max={2030} style={inputStyle} /></div>
                  </div>
                  <div>
                    <label style={labelStyle}>Fuente</label>
                    <select value={sourceType} onChange={e => setSourceType(e.target.value)} style={{ ...inputStyle, width: "50%" }}>
                      {SOURCE_TYPES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                  </div>
                </div>

                {/* Tags */}
                {allTags.length > 0 && (
                  <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e2eaf7", padding: "24px 28px" }}>
                    <h2 style={sectionTitle}>Etiquetas</h2>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                      {allTags.map(tag => {
                        const sel = selectedTagIds.includes(tag.id);
                        return (
                          <button key={tag.id} type="button" onClick={() => toggleTag(tag.id)} style={{ padding: "5px 14px", borderRadius: 20, border: `2px solid ${sel ? (tag.color ?? "#004aad") : "#e2eaf7"}`, background: sel ? (tag.color ?? "#004aad") : "#f8fafc", color: sel ? "#fff" : "#475569", fontSize: "0.8rem", fontWeight: 600, cursor: "pointer" }}>
                            {tag.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Options */}
                <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e2eaf7", padding: "24px 28px" }}>
                  <h2 style={sectionTitle}>Opciones de respuesta</h2>
                  <p style={{ fontSize: "0.8rem", color: "#94a3b8", margin: "0 0 16px" }}>
                    {questionType === "MULTIPLE_CHOICE" ? "Marca todos los checkboxes correctos." : "Marca el radio de la opción correcta."}
                  </p>

                  {questionType !== "TRUE_FALSE" && (
                    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                      <label style={{ ...labelStyle, marginBottom: 0, whiteSpace: "nowrap" }}>Número de opciones:</label>
                      <div style={{ display: "flex", gap: 6 }}>
                        {[2,3,4,5,6,7,8,9,10].map(n => (
                          <button key={n} type="button" onClick={() => setOptionCount(n)}
                            style={{ width: 34, height: 34, borderRadius: 8, border: `2px solid ${optionCount === n ? "#004aad" : "#e2eaf7"}`, background: optionCount === n ? "#eff6ff" : "#fff", color: optionCount === n ? "#004aad" : "#64748b", fontWeight: 700, fontSize: "0.82rem", cursor: "pointer" }}>
                            {n}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    {options.map((opt, idx) => (
                      <div key={opt.letra} style={{ display: "flex", gap: 12, alignItems: "flex-start", padding: "14px 16px", borderRadius: 12, border: `2px solid ${opt.isCorrect ? "#004aad" : "#e2eaf7"}`, background: opt.isCorrect ? "#eff6ff" : "#fafafa" }}>
                        {questionType === "MULTIPLE_CHOICE" ? (
                          <input type="checkbox" checked={opt.isCorrect} onChange={() => setCorrectOption(idx)} style={{ width: 18, height: 18, cursor: "pointer", accentColor: "#004aad", marginTop: 4 }} />
                        ) : (
                          <input type="radio" name="correctOption" checked={opt.isCorrect} onChange={() => setCorrectOption(idx)} style={{ width: 18, height: 18, cursor: "pointer", accentColor: "#004aad", marginTop: 4 }} />
                        )}
                        <div style={{ minWidth: 28, height: 28, borderRadius: "50%", background: opt.isCorrect ? "#004aad" : "#e2eaf7", color: opt.isCorrect ? "#fff" : "#64748b", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: "0.85rem", flexShrink: 0 }}>
                          {opt.letra}
                        </div>
                        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
                          <input type="text" value={opt.texto}
                            onChange={e => questionType !== "TRUE_FALSE" ? setOptionField(idx, "texto", e.target.value) : null}
                            readOnly={questionType === "TRUE_FALSE"}
                            placeholder={`Opción ${opt.letra} *`}
                            style={{ ...inputStyle, marginBottom: 0, background: questionType === "TRUE_FALSE" ? "#f8fafc" : "#fff" }} />
                          <ImagePicker value={opt.imageUrl} onChange={url => setOptionField(idx, "imageUrl", url)} compact />
                        </div>
                      </div>
                    ))}
                  </div>

                  {!validateOptions() && (
                    <div style={{ marginTop: 8, fontSize: "0.75rem", color: "#f59e0b", fontWeight: 600 }}>
                      ⚠ {questionType === "MULTIPLE_CHOICE" ? "Selecciona al menos una respuesta correcta" : "Selecciona exactamente una respuesta correcta"}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
                  <Link href="/school-admin/preguntas" style={{ padding: "12px 24px", background: "#f1f5f9", color: "#475569", borderRadius: 12, textDecoration: "none", fontWeight: 600, fontSize: "0.9rem" }}>
                    Cancelar
                  </Link>
                  <button type="submit" disabled={saving} style={{ padding: "12px 28px", background: saving ? "#93c5fd" : "#004aad", color: "#fff", borderRadius: 12, border: "none", fontWeight: 700, fontSize: "0.9rem", cursor: saving ? "not-allowed" : "pointer" }}>
                    {saving ? "Guardando…" : "Guardar pregunta"}
                  </button>
                </div>
              </div>

              {/* RIGHT: Preview */}
              <div style={{ position: "sticky", top: 24 }}>
                <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e2eaf7", padding: "24px 28px" }}>
                  <h2 style={{ ...sectionTitle, marginBottom: 16 }}>Vista previa</h2>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
                    {resolvedArea && <span style={{ padding: "3px 10px", background: "#eff6ff", color: "#004aad", borderRadius: 20, fontSize: "0.74rem", fontWeight: 600 }}>{resolvedArea}</span>}
                    {difficulty && <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: "0.74rem", fontWeight: 600, background: difficulty === "FACIL" ? "#dcfce7" : difficulty === "MEDIA" ? "#fef9c3" : "#fee2e2", color: difficulty === "FACIL" ? "#16a34a" : difficulty === "MEDIA" ? "#a16207" : "#dc2626" }}>{difficulty === "FACIL" ? "Fácil" : difficulty === "MEDIA" ? "Media" : "Difícil"}</span>}
                    <span style={{ padding: "3px 10px", background: "#f0f9ff", color: "#0369a1", borderRadius: 20, fontSize: "0.74rem", fontWeight: 600 }}>
                      {qtypeLabel[questionType]}
                    </span>
                    {subject && <span style={{ padding: "3px 10px", background: "#fdf4ff", color: "#7e22ce", borderRadius: 20, fontSize: "0.74rem", fontWeight: 600 }}>{subject}</span>}
                  </div>
                  {contexto && <div style={{ background: "#f8fafc", borderRadius: 8, padding: "10px 14px", fontSize: "0.82rem", color: "#475569", lineHeight: 1.6, marginBottom: 12, borderLeft: "3px solid #004aad" }}>{contexto}</div>}
                  <div style={{ fontSize: "0.9rem", color: "#1e293b", fontWeight: 500, lineHeight: 1.6, marginBottom: 16, minHeight: 40 }}>
                    {enunciado || <span style={{ color: "#cbd5e1", fontStyle: "italic" }}>El enunciado aparecerá aquí…</span>}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {options.map(opt => (
                      <div key={opt.letra} style={{ display: "flex", gap: 10, alignItems: "center", padding: "8px 12px", borderRadius: 8, border: `1px solid ${opt.isCorrect ? "#004aad" : "#e2eaf7"}`, background: opt.isCorrect ? "#eff6ff" : "#fafafa" }}>
                        <div style={{ minWidth: 22, height: 22, borderRadius: "50%", background: opt.isCorrect ? "#004aad" : "#e2eaf7", color: opt.isCorrect ? "#fff" : "#64748b", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: "0.75rem", flexShrink: 0 }}>
                          {opt.letra}
                        </div>
                        <span style={{ fontSize: "0.83rem", color: opt.isCorrect ? "#004aad" : "#475569", fontWeight: opt.isCorrect ? 600 : 400 }}>
                          {opt.texto || <span style={{ color: "#cbd5e1", fontStyle: "italic" }}>Opción {opt.letra}…</span>}
                        </span>
                        {opt.isCorrect && <span style={{ marginLeft: "auto", fontSize: "0.7rem", color: "#16a34a", fontWeight: 700 }}>✓ Correcta</span>}
                      </div>
                    ))}
                  </div>
                  {!options.some(o => o.isCorrect) && (
                    <div style={{ marginTop: 12, fontSize: "0.75rem", color: "#f59e0b", fontWeight: 600 }}>
                      ⚠ Ninguna opción marcada como correcta
                    </div>
                  )}
                  {explicacion && <div style={{ marginTop: 14, background: "#f0fdf4", borderRadius: 8, padding: "10px 14px", fontSize: "0.8rem", color: "#166534", lineHeight: 1.6, borderLeft: "3px solid #16a34a" }}><strong>Explicación:</strong> {explicacion}</div>}
                </div>
              </div>

            </div>
          </form>
        </div>
      </main>
    </div>
  );
}

const sectionTitle: React.CSSProperties = { fontSize: "1rem", fontWeight: 700, color: "#1e293b", margin: "0 0 16px" };
const labelStyle: React.CSSProperties = { display: "block", fontSize: "0.78rem", fontWeight: 600, color: "#475569", marginBottom: 6 };
const inputStyle: React.CSSProperties = { width: "100%", padding: "9px 12px", border: "1px solid #e2eaf7", borderRadius: 8, fontSize: "0.875rem", outline: "none", boxSizing: "border-box", background: "#fff" };
