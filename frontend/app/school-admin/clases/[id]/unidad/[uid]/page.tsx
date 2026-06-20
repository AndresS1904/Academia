"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import SchoolAdminSidebar from "@/components/school-admin/SchoolAdminSidebar";
import { api } from "@/lib/api";

// ── types ─────────────────────────────────────────────────────────────────────

interface UnitMaterial {
  id: string; title: string; description?: string; type: string;
  externalUrl?: string; allowDownload: boolean; order: number;
}
interface UnitActivity {
  id: string; title: string; description?: string; instructions?: string;
  dueDate?: string; maxScore: number; isPublished: boolean; order: number;
  _count: { submissions: number };
}
interface UnitQuiz {
  id: string; title: string; description?: string; status: string;
  timeLimit?: number; maxAttempts: number; passingScore: number;
  order: number; _count: { questions: number; attempts: number };
}
interface UnitForum {
  id: string; title: string; description?: string; isLocked: boolean;
  _count: { threads: number };
}
interface UnitFull {
  id: string; title: string; type: string; content?: string; videoUrl?: string;
  isPublished: boolean; materials: UnitMaterial[]; activities: UnitActivity[];
  quizzes: UnitQuiz[]; forums: UnitForum[];
}

const TYPE_ICONS: Record<string, string> = { PDF: "📄", WORD: "📝", IMAGE: "🖼️", VIDEO: "🎬", LINK: "🔗", OTHER: "📎" };
const QUIZ_STATUS: Record<string, string> = { DRAFT: "Borrador", PUBLISHED: "Publicado", ARCHIVED: "Archivado" };

const inputStyle: React.CSSProperties = { padding: "8px 11px", borderRadius: 8, border: "1.5px solid #e2e8f0", fontSize: "0.83rem", boxSizing: "border-box", width: "100%" };

// ── component ─────────────────────────────────────────────────────────────────

export default function AdminUnitDetailPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const classroomId = params.id as string;
  const unitId = params.uid as string;

  const [unit, setUnit] = useState<UnitFull | null>(null);
  const [fetching, setFetching] = useState(true);
  const [tab, setTab] = useState<"materiales" | "pruebas" | "foros" | "tareas">("materiales");

  // Material form
  const [matTitle, setMatTitle] = useState(""); const [matType, setMatType] = useState("LINK");
  const [matUrl, setMatUrl] = useState(""); const [matDesc, setMatDesc] = useState(""); const [savingMat, setSavingMat] = useState(false);

  // Activity form
  const [actTitle, setActTitle] = useState(""); const [actDesc, setActDesc] = useState("");
  const [actInstr, setActInstr] = useState(""); const [actDue, setActDue] = useState("");
  const [actScore, setActScore] = useState("10"); const [savingAct, setSavingAct] = useState(false);

  // Quiz form
  const [quizTitle, setQuizTitle] = useState(""); const [quizDesc, setQuizDesc] = useState("");
  const [quizTime, setQuizTime] = useState(""); const [quizAttempts, setQuizAttempts] = useState("1");
  const [quizPassing, setQuizPassing] = useState("60"); const [savingQuiz, setSavingQuiz] = useState(false);

  // Forum form
  const [forumTitle, setForumTitle] = useState(""); const [forumDesc, setForumDesc] = useState("");
  const [savingForum, setSavingForum] = useState(false);

  useEffect(() => { if (!loading && (!user || user.role !== "ADMIN")) router.replace("/auth/login"); }, [user, loading]);

  function loadUnit() {
    api.get<UnitFull>(`/classrooms/admin/units/${unitId}/full`)
      .then(setUnit).catch(() => {}).finally(() => setFetching(false));
  }
  useEffect(() => { if (!user || !unitId) return; loadUnit(); }, [user, unitId]);

  // ── Material CRUD ──────────────────────────────────────────────────────────

  async function saveMaterial() {
    if (!matTitle.trim() || !matUrl.trim()) { alert("Ingresa título y URL"); return; }
    setSavingMat(true);
    const mat = await api.post<UnitMaterial>(`/classrooms/admin/units/${unitId}/materials`, {
      title: matTitle.trim(), type: matType, externalUrl: matUrl.trim(),
      description: matDesc.trim() || undefined, allowDownload: true,
    }).catch(() => null);
    if (mat) {
      setUnit((p) => p ? { ...p, materials: [...p.materials, mat] } : p);
      setMatTitle(""); setMatUrl(""); setMatDesc("");
    }
    setSavingMat(false);
  }

  async function deleteMaterial(id: string) {
    if (!confirm("¿Eliminar este material?")) return;
    await api.delete(`/classrooms/admin/unit-materials/${id}`);
    setUnit((p) => p ? { ...p, materials: p.materials.filter((m) => m.id !== id) } : p);
  }

  // ── Activity CRUD ──────────────────────────────────────────────────────────

  async function saveActivity() {
    if (!actTitle.trim()) return;
    setSavingAct(true);
    const act = await api.post<UnitActivity>(`/classrooms/admin/units/${unitId}/activities`, {
      title: actTitle.trim(), description: actDesc.trim() || undefined,
      instructions: actInstr.trim() || undefined, dueDate: actDue || undefined,
      maxScore: actScore ? Number(actScore) : 10, isPublished: false,
    }).catch(() => null);
    if (act) {
      setUnit((p) => p ? { ...p, activities: [...p.activities, { ...act, _count: { submissions: 0 } }] } : p);
      setActTitle(""); setActDesc(""); setActInstr(""); setActDue(""); setActScore("10");
    }
    setSavingAct(false);
  }

  // ── Quiz CRUD ──────────────────────────────────────────────────────────────

  async function saveQuiz() {
    if (!quizTitle.trim()) return;
    setSavingQuiz(true);
    const quiz = await api.post<UnitQuiz>(`/classrooms/admin/units/${unitId}/quizzes`, {
      title: quizTitle.trim(), description: quizDesc.trim() || undefined,
      timeLimit: quizTime ? Number(quizTime) : undefined,
      maxAttempts: Number(quizAttempts) || 1,
      passingScore: Number(quizPassing) || 60,
      showResults: true,
    }).catch(() => null);
    if (quiz) {
      setUnit((p) => p ? { ...p, quizzes: [...p.quizzes, { ...quiz, _count: { questions: 0, attempts: 0 } }] } : p);
      setQuizTitle(""); setQuizDesc(""); setQuizTime(""); setQuizAttempts("1"); setQuizPassing("60");
    }
    setSavingQuiz(false);
  }

  // ── Forum CRUD ─────────────────────────────────────────────────────────────

  async function saveForum() {
    if (!forumTitle.trim()) return;
    setSavingForum(true);
    const forum = await api.post<UnitForum>(`/classrooms/admin/units/${unitId}/forums`, {
      title: forumTitle.trim(), description: forumDesc.trim() || undefined,
    }).catch(() => null);
    if (forum) {
      setUnit((p) => p ? { ...p, forums: [...p.forums, { ...forum, _count: { threads: 0 } }] } : p);
      setForumTitle(""); setForumDesc("");
    }
    setSavingForum(false);
  }

  if (loading || fetching || !unit) return (
    <div className="admin-layout"><SchoolAdminSidebar />
      <main className="admin-main"><div style={{ padding: 48, textAlign: "center", color: "#94a3b8" }}>Cargando unidad…</div></main>
    </div>
  );

  const tabStyle = (t: string): React.CSSProperties => ({
    padding: "9px 18px", border: "none", background: "none", cursor: "pointer", fontWeight: 700,
    fontSize: "0.875rem", color: tab === t ? "#004aad" : "#94a3b8",
    borderBottom: tab === t ? "2px solid #004aad" : "2px solid transparent", marginBottom: -2,
  });

  return (
    <div className="admin-layout">
      <SchoolAdminSidebar />
      <main className="admin-main">
        <div className="admin-content" style={{ maxWidth: 900 }}>

          {/* Header */}
          <div style={{ marginBottom: 24 }}>
            <Link href={`/school-admin/clases/${classroomId}`} style={{ fontSize: "0.85rem", color: "#64748b", textDecoration: "none" }}>← Volver al aula</Link>
            <h1 style={{ fontFamily: "var(--font-poppins)", fontWeight: 800, fontSize: "1.25rem", color: "#1e293b", margin: "8px 0 4px" }}>
              📚 {unit.title}
            </h1>
            <span style={{ padding: "2px 10px", background: unit.isPublished ? "#dcfce7" : "#f1f5f9", color: unit.isPublished ? "#15803d" : "#64748b", borderRadius: 20, fontSize: "0.72rem", fontWeight: 700 }}>
              {unit.isPublished ? "Publicada" : "Borrador"}
            </span>
          </div>

          {/* Tabs */}
          <div style={{ display: "flex", gap: 4, borderBottom: "2px solid #f1f5f9", marginBottom: 24 }}>
            {(["materiales", "pruebas", "foros", "tareas"] as const).map((t) => (
              <button key={t} style={tabStyle(t)} onClick={() => setTab(t)}>
                {t === "materiales" ? "📁 Materiales" : t === "pruebas" ? "🧪 Pruebas" : t === "foros" ? "💬 Foros" : "📋 Tareas"}
              </button>
            ))}
          </div>

          {/* ── MATERIALES ─────────────────────────────────────────────── */}
          {tab === "materiales" && (
            <div>
              {/* Add form */}
              <div style={{ background: "#f0f4ff", borderRadius: 12, border: "1px solid #c7d7f0", padding: 16, marginBottom: 20 }}>
                <div style={{ fontWeight: 700, fontSize: "0.82rem", color: "#374151", marginBottom: 12 }}>Agregar material</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 8, marginBottom: 8 }}>
                  <input placeholder="Título *" value={matTitle} onChange={(e) => setMatTitle(e.target.value)} style={{ ...inputStyle, borderColor: "#c7d7f0" }} />
                  <select value={matType} onChange={(e) => setMatType(e.target.value)} style={{ padding: "8px 11px", borderRadius: 8, border: "1.5px solid #c7d7f0", fontSize: "0.83rem" }}>
                    {["LINK", "PDF", "WORD", "IMAGE", "VIDEO", "OTHER"].map((t) => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <input placeholder="URL del recurso *" value={matUrl} onChange={(e) => setMatUrl(e.target.value)} style={{ ...inputStyle, marginBottom: 8, borderColor: "#c7d7f0" }} />
                <input placeholder="Descripción (opcional)" value={matDesc} onChange={(e) => setMatDesc(e.target.value)} style={{ ...inputStyle, marginBottom: 12, borderColor: "#c7d7f0" }} />
                <button onClick={saveMaterial} disabled={savingMat} style={{ padding: "8px 18px", background: "#004aad", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 700, fontSize: "0.82rem" }}>
                  {savingMat ? "Guardando…" : "+ Agregar material"}
                </button>
              </div>

              {/* List */}
              {unit.materials.length === 0 ? (
                <div style={{ textAlign: "center", padding: "32px 0", color: "#94a3b8" }}><div style={{ fontSize: "2rem", marginBottom: 8 }}>📁</div>Sin materiales aún.</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {unit.materials.map((m) => (
                    <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", background: "#fff", borderRadius: 10, border: "1px solid #e2e8f0" }}>
                      <span style={{ fontSize: "1.4rem" }}>{TYPE_ICONS[m.type] ?? "📎"}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: "0.88rem", color: "#1e293b" }}>{m.title}</div>
                        {m.description && <div style={{ fontSize: "0.75rem", color: "#64748b" }}>{m.description}</div>}
                        {m.externalUrl && (
                          <a href={m.externalUrl} target="_blank" rel="noreferrer" style={{ fontSize: "0.72rem", color: "#004aad", wordBreak: "break-all" }}>{m.externalUrl}</a>
                        )}
                      </div>
                      <span style={{ padding: "2px 8px", background: "#f0f4ff", color: "#004aad", borderRadius: 10, fontSize: "0.68rem", fontWeight: 700 }}>{m.type}</span>
                      <button onClick={() => deleteMaterial(m.id)} style={{ border: "none", background: "none", cursor: "pointer", color: "#94a3b8", fontSize: "1rem" }}>✕</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── PRUEBAS ──────────────────────────────────────────────────── */}
          {tab === "pruebas" && (
            <div>
              {/* Create quiz form */}
              <div style={{ background: "#faf5ff", borderRadius: 12, border: "1px solid #ddd6fe", padding: 16, marginBottom: 20 }}>
                <div style={{ fontWeight: 700, fontSize: "0.82rem", color: "#6d28d9", marginBottom: 12 }}>Crear prueba</div>
                <input placeholder="Título de la prueba *" value={quizTitle} onChange={(e) => setQuizTitle(e.target.value)} style={{ ...inputStyle, marginBottom: 8, borderColor: "#ddd6fe" }} />
                <input placeholder="Descripción (opcional)" value={quizDesc} onChange={(e) => setQuizDesc(e.target.value)} style={{ ...inputStyle, marginBottom: 8, borderColor: "#ddd6fe" }} />
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 12 }}>
                  <div>
                    <label style={{ fontSize: "0.72rem", fontWeight: 600, color: "#6d28d9" }}>Tiempo (min)</label>
                    <input type="number" placeholder="Sin límite" value={quizTime} onChange={(e) => setQuizTime(e.target.value)} style={{ ...inputStyle, marginTop: 4, borderColor: "#ddd6fe" }} />
                  </div>
                  <div>
                    <label style={{ fontSize: "0.72rem", fontWeight: 600, color: "#6d28d9" }}>Intentos máx.</label>
                    <input type="number" min="1" value={quizAttempts} onChange={(e) => setQuizAttempts(e.target.value)} style={{ ...inputStyle, marginTop: 4, borderColor: "#ddd6fe" }} />
                  </div>
                  <div>
                    <label style={{ fontSize: "0.72rem", fontWeight: 600, color: "#6d28d9" }}>Puntaje aprobatorio (%)</label>
                    <input type="number" min="0" max="100" value={quizPassing} onChange={(e) => setQuizPassing(e.target.value)} style={{ ...inputStyle, marginTop: 4, borderColor: "#ddd6fe" }} />
                  </div>
                </div>
                <button onClick={saveQuiz} disabled={savingQuiz} style={{ padding: "8px 18px", background: "#7c3aed", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 700, fontSize: "0.82rem" }}>
                  {savingQuiz ? "Creando…" : "+ Crear prueba"}
                </button>
              </div>

              {/* List */}
              {unit.quizzes.length === 0 ? (
                <div style={{ textAlign: "center", padding: "32px 0", color: "#94a3b8" }}><div style={{ fontSize: "2rem", marginBottom: 8 }}>🧪</div>Sin pruebas aún.</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {unit.quizzes.map((q) => (
                    <div key={q.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", background: "#fff", borderRadius: 10, border: "1px solid #e2e8f0" }}>
                      <div style={{ width: 40, height: 40, borderRadius: 10, background: "#faf5ff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.3rem", flexShrink: 0 }}>🧪</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: "0.92rem", color: "#1e293b" }}>{q.title}</div>
                        <div style={{ fontSize: "0.72rem", color: "#64748b" }}>
                          {q._count.questions} preguntas · {q.maxAttempts} intento(s) · Mín: {q.passingScore}%
                          {q.timeLimit && ` · ${q.timeLimit} min`}
                        </div>
                      </div>
                      <span style={{ padding: "2px 8px", background: q.status === "PUBLISHED" ? "#dcfce7" : "#f1f5f9", color: q.status === "PUBLISHED" ? "#15803d" : "#64748b", borderRadius: 10, fontSize: "0.68rem", fontWeight: 700 }}>
                        {QUIZ_STATUS[q.status]}
                      </span>
                      <span style={{ fontSize: "0.72rem", color: "#94a3b8" }}>{q._count.attempts} intento(s)</span>
                      <Link href={`/school-admin/clases/${classroomId}/quiz/${q.id}`} style={{ padding: "5px 12px", background: "#f0f4ff", color: "#004aad", border: "1px solid #c7d7f0", borderRadius: 7, textDecoration: "none", fontWeight: 700, fontSize: "0.78rem" }}>
                        Editar
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── FOROS ─────────────────────────────────────────────────────── */}
          {tab === "foros" && (
            <div>
              {/* Create form */}
              <div style={{ background: "#f0fdf4", borderRadius: 12, border: "1px solid #bbf7d0", padding: 16, marginBottom: 20 }}>
                <div style={{ fontWeight: 700, fontSize: "0.82rem", color: "#15803d", marginBottom: 12 }}>Crear foro para esta unidad</div>
                <input placeholder="Título del foro *" value={forumTitle} onChange={(e) => setForumTitle(e.target.value)} style={{ ...inputStyle, marginBottom: 8, borderColor: "#bbf7d0" }} />
                <input placeholder="Descripción o pregunta guía (opcional)" value={forumDesc} onChange={(e) => setForumDesc(e.target.value)} style={{ ...inputStyle, marginBottom: 12, borderColor: "#bbf7d0" }} />
                <button onClick={saveForum} disabled={savingForum} style={{ padding: "8px 18px", background: "#059669", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 700, fontSize: "0.82rem" }}>
                  {savingForum ? "Creando…" : "+ Crear foro"}
                </button>
              </div>

              {/* List */}
              {unit.forums.length === 0 ? (
                <div style={{ textAlign: "center", padding: "32px 0", color: "#94a3b8" }}><div style={{ fontSize: "2rem", marginBottom: 8 }}>💬</div>Sin foros aún.</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {unit.forums.map((f) => (
                    <div key={f.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", background: "#fff", borderRadius: 10, border: "1px solid #e2e8f0" }}>
                      <div style={{ width: 40, height: 40, borderRadius: 10, background: "#f0fdf4", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.3rem", flexShrink: 0 }}>💬</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: "0.92rem", color: "#1e293b" }}>{f.title}</div>
                        {f.description && <div style={{ fontSize: "0.75rem", color: "#64748b" }}>{f.description}</div>}
                        <div style={{ fontSize: "0.72rem", color: "#94a3b8", marginTop: 2 }}>{f._count.threads} hilo(s)</div>
                      </div>
                      {f.isLocked && <span style={{ padding: "2px 8px", background: "#fee2e2", color: "#dc2626", borderRadius: 10, fontSize: "0.68rem", fontWeight: 700 }}>Bloqueado</span>}
                      <Link href={`/school-admin/clases/${classroomId}/foro/${f.id}`} style={{ padding: "5px 12px", background: "#f0fdf4", color: "#059669", border: "1px solid #bbf7d0", borderRadius: 7, textDecoration: "none", fontWeight: 700, fontSize: "0.78rem" }}>
                        Ver hilos
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── TAREAS ─────────────────────────────────────────────────────── */}
          {tab === "tareas" && (
            <div>
              {/* Create form */}
              <div style={{ background: "#fffbeb", borderRadius: 12, border: "1px solid #fde68a", padding: 16, marginBottom: 20 }}>
                <div style={{ fontWeight: 700, fontSize: "0.82rem", color: "#92400e", marginBottom: 12 }}>Crear tarea</div>
                <input placeholder="Título de la tarea *" value={actTitle} onChange={(e) => setActTitle(e.target.value)} style={{ ...inputStyle, marginBottom: 8, borderColor: "#fde68a" }} />
                <textarea placeholder="Descripción" value={actDesc} onChange={(e) => setActDesc(e.target.value)} rows={2} style={{ ...inputStyle, marginBottom: 8, borderColor: "#fde68a", resize: "vertical" }} />
                <textarea placeholder="Instrucciones detalladas (opcional)" value={actInstr} onChange={(e) => setActInstr(e.target.value)} rows={3} style={{ ...inputStyle, marginBottom: 8, borderColor: "#fde68a", resize: "vertical" }} />
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
                  <div>
                    <label style={{ fontSize: "0.72rem", fontWeight: 600, color: "#92400e" }}>Fecha límite</label>
                    <input type="datetime-local" value={actDue} onChange={(e) => setActDue(e.target.value)} style={{ ...inputStyle, marginTop: 4, borderColor: "#fde68a" }} />
                  </div>
                  <div>
                    <label style={{ fontSize: "0.72rem", fontWeight: 600, color: "#92400e" }}>Puntaje máximo</label>
                    <input type="number" min="0" value={actScore} onChange={(e) => setActScore(e.target.value)} style={{ ...inputStyle, marginTop: 4, borderColor: "#fde68a" }} />
                  </div>
                </div>
                <button onClick={saveActivity} disabled={savingAct} style={{ padding: "8px 18px", background: "#d97706", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 700, fontSize: "0.82rem" }}>
                  {savingAct ? "Creando…" : "+ Crear tarea"}
                </button>
              </div>

              {/* List */}
              {unit.activities.length === 0 ? (
                <div style={{ textAlign: "center", padding: "32px 0", color: "#94a3b8" }}><div style={{ fontSize: "2rem", marginBottom: 8 }}>📋</div>Sin tareas aún.</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {unit.activities.map((a) => (
                    <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", background: "#fff", borderRadius: 10, border: "1px solid #e2e8f0" }}>
                      <div style={{ width: 40, height: 40, borderRadius: 10, background: "#fffbeb", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.3rem", flexShrink: 0 }}>📋</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: "0.92rem", color: "#1e293b" }}>{a.title}</div>
                        <div style={{ fontSize: "0.72rem", color: "#64748b" }}>
                          Puntaje: {a.maxScore} · {a._count.submissions} entrega(s)
                          {a.dueDate && ` · Límite: ${new Date(a.dueDate).toLocaleDateString("es-CO")}`}
                        </div>
                      </div>
                      <span style={{ padding: "2px 8px", background: a.isPublished ? "#dcfce7" : "#f1f5f9", color: a.isPublished ? "#15803d" : "#64748b", borderRadius: 10, fontSize: "0.68rem", fontWeight: 700 }}>
                        {a.isPublished ? "Visible" : "Borrador"}
                      </span>
                      <Link href={`/school-admin/clases/${classroomId}/tarea/${a.id}`} style={{ padding: "5px 12px", background: "#fffbeb", color: "#92400e", border: "1px solid #fde68a", borderRadius: 7, textDecoration: "none", fontWeight: 700, fontSize: "0.78rem" }}>
                        Entregas
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
