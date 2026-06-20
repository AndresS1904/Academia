"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";

type MaterialType = "PDF" | "VIDEO_YOUTUBE" | "VIDEO_VIMEO" | "LINK" | "FILE" | "IMAGE" | "AUDIO" | "PRESENTATION" | "WORD" | "EXCEL";

interface Material { id: string; title: string; type: MaterialType; externalUrl?: string; description?: string; order: number }
interface Submission { id: string; studentId: string; status: string; score?: number; submittedAt?: string }
interface Activity { id: string; title: string; description?: string; dueDate?: string; maxScore: number; isPublished: boolean; submissions: Submission[] }
interface Quiz { id: string; title: string; status: string; timeLimit?: number; maxAttempts: number; passingScore: number; questions: { id: string }[]; attempts: { id: string }[] }
interface Forum { id: string; title: string; description?: string; threads: { id: string }[] }
interface ResourceFull {
  id: string; title: string; type: string; url?: string; filePath?: string;
  lesson: { id: string; title: string; courseId: string };
  materials: Material[]; activities: Activity[]; quizzes: Quiz[]; forums: Forum[];
}

const MAT_TYPES: { value: MaterialType; label: string }[] = [
  { value: "PDF", label: "PDF" },
  { value: "VIDEO_YOUTUBE", label: "Video YouTube" },
  { value: "VIDEO_VIMEO", label: "Video Vimeo" },
  { value: "LINK", label: "Enlace web" },
  { value: "FILE", label: "Archivo" },
  { value: "IMAGE", label: "Imagen" },
  { value: "PRESENTATION", label: "Presentación" },
  { value: "WORD", label: "Word" },
  { value: "EXCEL", label: "Excel" },
];

const MAT_ICONS: Record<string, string> = {
  PDF: "📄", VIDEO_YOUTUBE: "▶️", VIDEO_VIMEO: "▶️", LINK: "🔗", FILE: "📎",
  IMAGE: "🖼️", AUDIO: "🎵", PRESENTATION: "📊", WORD: "📝", EXCEL: "📊",
};

const inp: React.CSSProperties = { width: "100%", padding: "9px 13px", border: "1px solid #dde4f0", borderRadius: 9, fontSize: "0.875rem", color: "#1e293b", background: "#fff", boxSizing: "border-box" };
const lbl: React.CSSProperties = { fontSize: "0.75rem", fontWeight: 600, color: "#475569", marginBottom: 4, display: "block" };
const card: React.CSSProperties = { background: "#fff", borderRadius: 14, border: "1px solid #e2eaf7", padding: "20px", marginBottom: 16 };

function AdminSidebar() {
  const { logout } = useAuth();
  const router = useRouter();
  return (
    <aside className="admin-sidebar">
      <div className="admin-sidebar-logo">
        <div className="admin-sidebar-logo-text">Ap<span>rova</span></div>
        <div className="admin-sidebar-badge">Panel Admin</div>
      </div>
      <nav className="sidebar-nav">
        <div className="sidebar-nav-label">Gestión</div>
        <Link href="/admin" className="sidebar-link"><span className="sidebar-link-icon">📊</span> Dashboard</Link>
        <Link href="/admin/users" className="sidebar-link"><span className="sidebar-link-icon">👥</span> Usuarios</Link>
        <Link href="/admin/courses" className="sidebar-link active"><span className="sidebar-link-icon">📚</span> Cursos</Link>
        <Link href="/admin/enrollments" className="sidebar-link"><span className="sidebar-link-icon">📝</span> Inscripciones</Link>
        <Link href="/admin/leads" className="sidebar-link"><span className="sidebar-link-icon">📞</span> Leads</Link>
        <div className="sidebar-nav-label">Cuenta</div>
        <button className="sidebar-link" style={{ width: "100%", background: "none", border: "none", cursor: "pointer", textAlign: "left" }}
          onClick={() => { logout(); router.push("/"); }}>
          <span className="sidebar-link-icon">🚪</span> Cerrar sesión
        </button>
      </nav>
    </aside>
  );
}

export default function AdminRecursoPage() {
  const { user } = useAuth();
  const params = useParams();
  const searchParams = useSearchParams();
  const courseId = params.id as string;
  const resourceId = params.rid as string;

  const validTabs = ["materiales", "tareas", "pruebas", "foros"] as const;
  type TabId = typeof validTabs[number];
  const initialTab = (validTabs.includes(searchParams.get("tab") as TabId) ? searchParams.get("tab") : "materiales") as TabId;

  const [data, setData] = useState<ResourceFull | null>(null);
  const [fetching, setFetching] = useState(true);
  const [tab, setTab] = useState<TabId>(initialTab);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const [matTitle, setMatTitle] = useState("");
  const [matType, setMatType] = useState<MaterialType>("VIDEO_YOUTUBE");
  const [matUrl, setMatUrl] = useState("");
  const [matDesc, setMatDesc] = useState("");

  const [actTitle, setActTitle] = useState("");
  const [actDesc, setActDesc] = useState("");
  const [actInstr, setActInstr] = useState("");
  const [actDue, setActDue] = useState("");
  const [actScore, setActScore] = useState("10");

  const [quizTitle, setQuizTitle] = useState("");
  const [quizDesc, setQuizDesc] = useState("");
  const [quizTime, setQuizTime] = useState("");
  const [quizAttempts, setQuizAttempts] = useState("1");
  const [quizPass, setQuizPass] = useState("60");

  const [forumTitle, setForumTitle] = useState("");
  const [forumDesc, setForumDesc] = useState("");

  useEffect(() => { if (!user || !resourceId) return; load(); }, [user, resourceId]);

  async function load() {
    setFetching(true);
    const res = await api.get<ResourceFull>(`/resources/${resourceId}/full`).catch(() => null);
    if (res) setData(res);
    setFetching(false);
  }

  async function addMaterial() {
    if (!matTitle.trim() || !matUrl.trim()) { setErr("Título y URL son requeridos"); return; }
    setSaving(true); setErr("");
    const res = await api.post<Material>(`/resources/${resourceId}/materials`, { title: matTitle.trim(), type: matType, externalUrl: matUrl.trim(), description: matDesc.trim() || undefined }).catch(() => null);
    if (res) { setData(prev => prev ? { ...prev, materials: [...prev.materials, res] } : prev); setMatTitle(""); setMatUrl(""); setMatDesc(""); }
    setSaving(false);
  }

  async function deleteMaterial(id: string) {
    await api.delete(`/resource-materials/${id}`).catch(() => null);
    setData(prev => prev ? { ...prev, materials: prev.materials.filter(m => m.id !== id) } : prev);
  }

  async function addActivity() {
    if (!actTitle.trim()) { setErr("El título es requerido"); return; }
    setSaving(true); setErr("");
    const res = await api.post<Activity>(`/resources/${resourceId}/activities`, {
      title: actTitle.trim(), description: actDesc.trim() || undefined, instructions: actInstr.trim() || undefined,
      dueDate: actDue || undefined, maxScore: Number(actScore) || 10,
    }).catch(() => null);
    if (res) { setData(prev => prev ? { ...prev, activities: [...prev.activities, { ...res, submissions: [] }] } : prev); setActTitle(""); setActDesc(""); setActInstr(""); setActDue(""); setActScore("10"); }
    setSaving(false);
  }

  async function addQuiz() {
    if (!quizTitle.trim()) { setErr("El título es requerido"); return; }
    setSaving(true); setErr("");
    const res = await api.post<Quiz>(`/resources/${resourceId}/quizzes`, {
      title: quizTitle.trim(), description: quizDesc.trim() || undefined,
      timeLimit: quizTime ? Number(quizTime) : undefined, maxAttempts: Number(quizAttempts) || 1, passingScore: Number(quizPass) || 60,
    }).catch(() => null);
    if (res) { setData(prev => prev ? { ...prev, quizzes: [...prev.quizzes, { ...res, questions: [], attempts: [] }] } : prev); setQuizTitle(""); setQuizDesc(""); setQuizTime(""); setQuizAttempts("1"); setQuizPass("60"); }
    setSaving(false);
  }

  async function addForum() {
    if (!forumTitle.trim()) { setErr("El título es requerido"); return; }
    setSaving(true); setErr("");
    const res = await api.post<Forum>(`/resources/${resourceId}/forums`, { title: forumTitle.trim(), description: forumDesc.trim() || undefined }).catch(() => null);
    if (res) { setData(prev => prev ? { ...prev, forums: [...prev.forums, { ...res, threads: [] }] } : prev); setForumTitle(""); setForumDesc(""); }
    setSaving(false);
  }

  const tabs = [
    { id: "materiales", label: "📁 Materiales" },
    { id: "tareas",     label: "📋 Tareas" },
    { id: "pruebas",    label: "🧪 Pruebas" },
    { id: "foros",      label: "💬 Foros" },
  ] as const;

  if (fetching) return (
    <div style={{ minHeight: "100vh", background: "#f0f4ff" }}>
      <AdminSidebar />
      <main style={{ marginLeft: 260, padding: "48px 36px", textAlign: "center", color: "#94a3b8" }}>Cargando recurso…</main>
    </div>
  );

  if (!data) return (
    <div style={{ minHeight: "100vh", background: "#f0f4ff" }}>
      <AdminSidebar />
      <main style={{ marginLeft: 260, padding: "48px 36px", textAlign: "center", color: "#94a3b8" }}>Recurso no encontrado.</main>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "#f0f4ff" }}>
      <AdminSidebar />
      <main style={{ marginLeft: 260, padding: "28px 36px", minHeight: "100vh", boxSizing: "border-box" }}>

        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 24 }}>
          <Link href={`/admin/courses/${courseId}`} style={{ padding: "7px 13px", background: "#fff", border: "1px solid #e2eaf7", borderRadius: 9, color: "#475569", textDecoration: "none", fontSize: "0.83rem", fontWeight: 600 }}>← Volver</Link>
          <div>
            <div style={{ fontSize: "0.75rem", color: "#94a3b8" }}>Recurso · {data.lesson.title}</div>
            <h1 style={{ fontWeight: 800, fontSize: "1.25rem", color: "#1e293b", margin: 0 }}>{data.title}</h1>
          </div>
        </div>

        {err && <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, padding: "10px 16px", color: "#dc2626", marginBottom: 16, fontSize: "0.875rem" }}>⚠ {err}</div>}

        <div style={{ display: "flex", gap: 4, marginBottom: 20, background: "#e8eef8", borderRadius: 12, padding: 4 }}>
          {tabs.map(t => (
            <button key={t.id} onClick={() => { setTab(t.id); setErr(""); }}
              style={{ flex: 1, padding: "9px 8px", border: "none", borderRadius: 9, cursor: "pointer", fontWeight: tab === t.id ? 700 : 500, fontSize: "0.83rem", background: tab === t.id ? "#fff" : "transparent", color: tab === t.id ? "#004aad" : "#64748b", boxShadow: tab === t.id ? "0 1px 4px #0001" : "none", transition: "all 0.15s" }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ── Tab: Materiales ── */}
        {tab === "materiales" && (
          <>
            <div style={card}>
              <div style={{ fontWeight: 700, fontSize: "0.9rem", color: "#1e293b", marginBottom: 16 }}>Agregar material</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 160px", gap: 12, marginBottom: 12 }}>
                <div><label style={lbl}>Título</label><input style={inp} value={matTitle} onChange={e => setMatTitle(e.target.value)} placeholder="Nombre del material" /></div>
                <div>
                  <label style={lbl}>Tipo</label>
                  <select style={{ ...inp, cursor: "pointer" }} value={matType} onChange={e => setMatType(e.target.value as MaterialType)}>
                    {MAT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ marginBottom: 12 }}><label style={lbl}>URL</label><input style={inp} value={matUrl} onChange={e => setMatUrl(e.target.value)} placeholder="https://..." /></div>
              <div style={{ marginBottom: 14 }}><label style={lbl}>Descripción (opcional)</label><input style={inp} value={matDesc} onChange={e => setMatDesc(e.target.value)} placeholder="Descripción breve" /></div>
              <button onClick={addMaterial} disabled={saving} style={{ padding: "9px 20px", background: "#004aad", color: "#fff", border: "none", borderRadius: 9, cursor: "pointer", fontWeight: 700, fontSize: "0.875rem" }}>
                {saving ? "Guardando…" : "+ Agregar"}
              </button>
            </div>

            {data.materials.length === 0
              ? <div style={{ ...card, textAlign: "center", color: "#94a3b8", padding: 32 }}>Sin materiales aún.</div>
              : data.materials.map(m => (
                <div key={m.id} style={{ ...card, padding: "14px 18px", display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ fontSize: "1.2rem" }}>{MAT_ICONS[m.type] ?? "📎"}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: "0.9rem" }}>{m.title}</div>
                    {m.description && <div style={{ fontSize: "0.75rem", color: "#64748b" }}>{m.description}</div>}
                    {m.externalUrl && <a href={m.externalUrl} target="_blank" rel="noreferrer" style={{ fontSize: "0.72rem", color: "#004aad" }}>{m.externalUrl.slice(0, 60)}…</a>}
                  </div>
                  <button onClick={() => deleteMaterial(m.id)} style={{ padding: "5px 10px", background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca", borderRadius: 7, cursor: "pointer", fontSize: "0.78rem", fontWeight: 600 }}>Eliminar</button>
                </div>
              ))
            }
          </>
        )}

        {/* ── Tab: Tareas ── */}
        {tab === "tareas" && (
          <>
            <div style={card}>
              <div style={{ fontWeight: 700, fontSize: "0.9rem", color: "#1e293b", marginBottom: 16 }}>Nueva tarea</div>
              <div style={{ marginBottom: 12 }}><label style={lbl}>Título *</label><input style={inp} value={actTitle} onChange={e => setActTitle(e.target.value)} placeholder="Ej: Ejercicio de práctica" /></div>
              <div style={{ marginBottom: 12 }}><label style={lbl}>Descripción</label><textarea style={{ ...inp, minHeight: 72, resize: "vertical" } as any} value={actDesc} onChange={e => setActDesc(e.target.value)} placeholder="Describe la tarea…" /></div>
              <div style={{ marginBottom: 12 }}><label style={lbl}>Instrucciones</label><textarea style={{ ...inp, minHeight: 60, resize: "vertical" } as any} value={actInstr} onChange={e => setActInstr(e.target.value)} placeholder="Instrucciones detalladas…" /></div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
                <div><label style={lbl}>Fecha límite</label><input type="datetime-local" style={inp} value={actDue} onChange={e => setActDue(e.target.value)} /></div>
                <div><label style={lbl}>Puntaje máximo</label><input type="number" style={inp} value={actScore} onChange={e => setActScore(e.target.value)} min={1} /></div>
              </div>
              <button onClick={addActivity} disabled={saving} style={{ padding: "9px 20px", background: "#004aad", color: "#fff", border: "none", borderRadius: 9, cursor: "pointer", fontWeight: 700, fontSize: "0.875rem" }}>
                {saving ? "Guardando…" : "+ Crear tarea"}
              </button>
            </div>

            {data.activities.length === 0
              ? <div style={{ ...card, textAlign: "center", color: "#94a3b8", padding: 32 }}>Sin tareas aún.</div>
              : data.activities.map(a => (
                <div key={a.id} style={{ ...card, padding: "14px 18px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: "0.9rem" }}>📋 {a.title}</div>
                      {a.description && <div style={{ fontSize: "0.78rem", color: "#64748b", marginTop: 2 }}>{a.description}</div>}
                      <div style={{ fontSize: "0.72rem", color: "#94a3b8", marginTop: 4 }}>Puntaje: {a.maxScore} · {a.submissions.length} entrega(s)</div>
                    </div>
                    <Link href={`/admin/courses/${courseId}/actividad/${a.id}`}
                      style={{ padding: "6px 14px", background: "#f0f4ff", color: "#004aad", border: "1px solid #c7d7f0", borderRadius: 8, textDecoration: "none", fontSize: "0.78rem", fontWeight: 700, whiteSpace: "nowrap" }}>
                      Ver entregas →
                    </Link>
                  </div>
                </div>
              ))
            }
          </>
        )}

        {/* ── Tab: Pruebas ── */}
        {tab === "pruebas" && (
          <>
            <div style={card}>
              <div style={{ fontWeight: 700, fontSize: "0.9rem", color: "#1e293b", marginBottom: 16 }}>Nueva prueba</div>
              <div style={{ marginBottom: 12 }}><label style={lbl}>Título *</label><input style={inp} value={quizTitle} onChange={e => setQuizTitle(e.target.value)} placeholder="Ej: Quiz de comprensión" /></div>
              <div style={{ marginBottom: 12 }}><label style={lbl}>Descripción</label><input style={inp} value={quizDesc} onChange={e => setQuizDesc(e.target.value)} placeholder="Descripción breve" /></div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 14 }}>
                <div><label style={lbl}>Tiempo límite (min)</label><input type="number" style={inp} value={quizTime} onChange={e => setQuizTime(e.target.value)} placeholder="Sin límite" min={1} /></div>
                <div><label style={lbl}>Intentos máx.</label><input type="number" style={inp} value={quizAttempts} onChange={e => setQuizAttempts(e.target.value)} min={1} /></div>
                <div><label style={lbl}>Puntaje mínimo (%)</label><input type="number" style={inp} value={quizPass} onChange={e => setQuizPass(e.target.value)} min={0} max={100} /></div>
              </div>
              <button onClick={addQuiz} disabled={saving} style={{ padding: "9px 20px", background: "#004aad", color: "#fff", border: "none", borderRadius: 9, cursor: "pointer", fontWeight: 700, fontSize: "0.875rem" }}>
                {saving ? "Guardando…" : "+ Crear prueba"}
              </button>
            </div>

            {data.quizzes.length === 0
              ? <div style={{ ...card, textAlign: "center", color: "#94a3b8", padding: 32 }}>Sin pruebas aún.</div>
              : data.quizzes.map(q => (
                <div key={q.id} style={{ ...card, padding: "14px 18px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: "0.9rem" }}>🧪 {q.title}</div>
                      <div style={{ fontSize: "0.72rem", color: "#94a3b8", marginTop: 2 }}>
                        {q.questions.length} preguntas · {q.timeLimit ? `${q.timeLimit} min` : "Sin límite"} · Pasa con {q.passingScore}%
                      </div>
                    </div>
                    <Link href={`/admin/courses/${courseId}/quiz/${q.id}`}
                      style={{ padding: "6px 14px", background: "#f0f4ff", color: "#004aad", border: "1px solid #c7d7f0", borderRadius: 8, textDecoration: "none", fontSize: "0.78rem", fontWeight: 700 }}>
                      Editar →
                    </Link>
                  </div>
                </div>
              ))
            }
          </>
        )}

        {/* ── Tab: Foros ── */}
        {tab === "foros" && (
          <>
            <div style={card}>
              <div style={{ fontWeight: 700, fontSize: "0.9rem", color: "#1e293b", marginBottom: 16 }}>Nuevo foro</div>
              <div style={{ marginBottom: 12 }}><label style={lbl}>Título *</label><input style={inp} value={forumTitle} onChange={e => setForumTitle(e.target.value)} placeholder="Ej: Preguntas sobre el recurso" /></div>
              <div style={{ marginBottom: 14 }}><label style={lbl}>Descripción</label><input style={inp} value={forumDesc} onChange={e => setForumDesc(e.target.value)} placeholder="Descripción del foro" /></div>
              <button onClick={addForum} disabled={saving} style={{ padding: "9px 20px", background: "#004aad", color: "#fff", border: "none", borderRadius: 9, cursor: "pointer", fontWeight: 700, fontSize: "0.875rem" }}>
                {saving ? "Guardando…" : "+ Crear foro"}
              </button>
            </div>

            {data.forums.length === 0
              ? <div style={{ ...card, textAlign: "center", color: "#94a3b8", padding: 32 }}>Sin foros aún.</div>
              : data.forums.map(f => (
                <div key={f.id} style={{ ...card, padding: "14px 18px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: "0.9rem" }}>💬 {f.title}</div>
                      {f.description && <div style={{ fontSize: "0.78rem", color: "#64748b", marginTop: 2 }}>{f.description}</div>}
                      <div style={{ fontSize: "0.72rem", color: "#94a3b8", marginTop: 2 }}>{f.threads.length} hilo(s)</div>
                    </div>
                    <Link href={`/admin/courses/${courseId}/foro/${f.id}`}
                      style={{ padding: "6px 14px", background: "#f0f4ff", color: "#004aad", border: "1px solid #c7d7f0", borderRadius: 8, textDecoration: "none", fontSize: "0.78rem", fontWeight: 700 }}>
                      Gestionar →
                    </Link>
                  </div>
                </div>
              ))
            }
          </>
        )}

      </main>
    </div>
  );
}
