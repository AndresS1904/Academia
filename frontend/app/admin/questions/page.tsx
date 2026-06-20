"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";

interface QuestionOption {
  id: string;
  letra: string;
  texto: string;
  isCorrect: boolean;
}

interface QuestionRow {
  id: string;
  enunciado: string;
  area: string;
  examType: string;
  difficulty: string;
  isActive: boolean;
  createdAt: string;
  _count: { simulacroQuestions: number };
  options: QuestionOption[];
}

interface QuestionsResponse {
  total: number;
  questions: QuestionRow[];
}

interface QuestionsStats {
  total: number;
  active: number;
  inactive: number;
  byArea: Record<string, number>;
  byDifficulty: Record<string, number>;
  byExamType: Record<string, number>;
}

function AdminSidebar({ logout, router, isSuperAdmin }: { logout: () => void; router: ReturnType<typeof useRouter>; isSuperAdmin?: boolean }) {
  return (
    <aside className="admin-sidebar">
      <div className="admin-sidebar-logo">
        <div className="admin-sidebar-logo-text">Ap<span>rova</span></div>
        <div className="admin-sidebar-badge">Panel Admin</div>
      </div>
      <nav className="sidebar-nav">
        {isSuperAdmin && <>
          <div className="sidebar-nav-label" style={{ color: "#f59e0b" }}>Super Admin</div>
          <Link href="/admin/schools" className="sidebar-link"><span className="sidebar-link-icon">🏫</span> Instituciones</Link>
          <Link href="/admin/products" className="sidebar-link"><span className="sidebar-link-icon">📦</span> Productos</Link>
          <Link href="/admin/licenses" className="sidebar-link"><span className="sidebar-link-icon">🔑</span> Licencias</Link>
        </>}
        <div className="sidebar-nav-label">Gestión</div>
        <Link href="/admin" className="sidebar-link"><span className="sidebar-link-icon">📊</span> Dashboard</Link>
        <Link href="/admin/users" className="sidebar-link"><span className="sidebar-link-icon">👥</span> Usuarios</Link>
        <Link href="/admin/courses" className="sidebar-link"><span className="sidebar-link-icon">📚</span> Cursos</Link>
        <Link href="/admin/enrollments" className="sidebar-link"><span className="sidebar-link-icon">📝</span> Inscripciones</Link>
        <Link href="/admin/leads" className="sidebar-link"><span className="sidebar-link-icon">📞</span> Leads</Link>
        <Link href="/admin/questions" className="sidebar-link active"><span className="sidebar-link-icon">🧠</span> Preguntas</Link>
        <Link href="/admin/simulacros" className="sidebar-link"><span className="sidebar-link-icon">📋</span> Simulacros</Link>
        <div className="sidebar-nav-label">Contenido</div>
        <Link href="/admin/site-content" className="sidebar-link"><span className="sidebar-link-icon">🖼</span> Contenido del sitio</Link>
        <div className="sidebar-nav-label">Cuenta</div>
                <button
          className="sidebar-link"
          style={{ width: "100%", background: "none", border: "none", cursor: "pointer", textAlign: "left" }}
          onClick={() => { logout(); router.push("/"); }}
        >
          <span className="sidebar-link-icon">🚪</span> Cerrar sesión
        </button>
      </nav>
    </aside>
  );
}

const DIFFICULTY_LABELS: Record<string, string> = { FACIL: "Fácil", MEDIA: "Media", DIFICIL: "Difícil" };
const DIFFICULTY_COLORS: Record<string, { bg: string; color: string }> = {
  FACIL: { bg: "#dcfce7", color: "#16a34a" },
  MEDIA: { bg: "#fef9c3", color: "#a16207" },
  DIFICIL: { bg: "#fee2e2", color: "#dc2626" },
};
const EXAM_TYPE_LABELS: Record<string, string> = { ICFES: "ICFES", UDEA: "UDEA" };

export default function AdminQuestionsPage() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();

  const [questions, setQuestions] = useState<QuestionRow[]>([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState<QuestionsStats | null>(null);
  const [fetching, setFetching] = useState(true);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [examType, setExamType] = useState("");
  const [area, setArea] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [isActive, setIsActive] = useState("");

  // Unique areas derived from loaded questions
  const [allAreas, setAllAreas] = useState<string[]>([]);

  useEffect(() => {
    if (!loading && !user) router.replace("/auth/login");
    if (!loading && user && user.role !== "ADMIN" && user.role !== "SUPER_ADMIN") router.replace("/dashboard");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, loading]);

  const fetchStats = useCallback(() => {
    api.get<QuestionsStats>("/questions/stats")
      .then(setStats)
      .catch(() => { /* silencioso */ });
  }, []);

  const fetchQuestions = useCallback(() => {
    if (!user) return;
    setFetching(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (examType) params.set("examType", examType);
    if (area) params.set("area", area);
    if (difficulty) params.set("difficulty", difficulty);
    if (isActive !== "") params.set("isActive", isActive);
    const qs = params.toString();
    api.get<QuestionsResponse>(`/questions${qs ? "?" + qs : ""}`)
      .then(data => {
        setQuestions(data.questions);
        setTotal(data.total);
        // Collect unique areas
        const areas = Array.from(new Set(data.questions.map(q => q.area).filter(Boolean))).sort();
        setAllAreas(areas);
      })
      .catch(e => alert("Error al cargar preguntas: " + (e.message ?? "")))
      .finally(() => setFetching(false));
  }, [user, search, examType, area, difficulty, isActive]);

  useEffect(() => {
    if (!user || (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN")) return;
    fetchQuestions();
    fetchStats();
  }, [user, fetchQuestions, fetchStats]);

  async function handleToggleActive(q: QuestionRow) {
    setTogglingId(q.id);
    try {
      await api.patch(`/questions/${q.id}/toggle-active`, {});
      setQuestions(prev => prev.map(item => item.id === q.id ? { ...item, isActive: !item.isActive } : item));
      fetchStats();
    } catch (e: any) {
      alert("Error al cambiar estado: " + (e.message ?? ""));
    }
    setTogglingId(null);
  }

  async function handleDelete(q: QuestionRow) {
    if (!confirm(`¿Eliminar la pregunta? Esta acción no se puede deshacer.\n\n"${q.enunciado.slice(0, 80)}..."`)) return;
    setDeletingId(q.id);
    try {
      await api.delete(`/questions/${q.id}`);
      setQuestions(prev => prev.filter(item => item.id !== q.id));
      setTotal(prev => prev - 1);
      fetchStats();
    } catch (e: any) {
      alert("Error al eliminar: " + (e.message ?? ""));
    }
    setDeletingId(null);
  }

  if (loading || !user) return null;

  return (
    <div style={{ minHeight: "100vh", background: "#f0f4ff" }}>
      <AdminSidebar logout={logout} router={router} isSuperAdmin={user.role === "SUPER_ADMIN"} />

      <main style={{ marginLeft: 260, padding: "32px 36px", minHeight: "100vh", boxSizing: "border-box" }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: "1.5rem", fontWeight: 800, color: "#1e293b", margin: 0 }}>Banco de preguntas</h1>
            <p style={{ color: "#64748b", fontSize: "0.875rem", margin: "4px 0 0" }}>
              {total} pregunta{total !== 1 ? "s" : ""} en total
            </p>
          </div>
          <Link
            href="/admin/questions/nueva"
            style={{ padding: "10px 20px", background: "#004aad", color: "#fff", borderRadius: 12, textDecoration: "none", fontWeight: 700, fontSize: "0.9rem" }}
          >
            + Nueva pregunta
          </Link>
        </div>

        {/* Stats row */}
        {stats && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 14, marginBottom: 24 }}>
            {[
              { label: "Total", value: stats.total, color: "#004aad", bg: "#eff6ff" },
              { label: "Activas", value: stats.active, color: "#16a34a", bg: "#f0fdf4" },
              { label: "Inactivas", value: stats.inactive, color: "#64748b", bg: "#f8fafc" },
              { label: "ICFES", value: stats.byExamType?.ICFES ?? 0, color: "#7c3aed", bg: "#f5f3ff" },
              { label: "UDEA", value: stats.byExamType?.UDEA ?? 0, color: "#0891b2", bg: "#ecfeff" },
            ].map(s => (
              <div key={s.label} style={{ background: s.bg, border: `1px solid ${s.bg}`, borderRadius: 12, padding: "14px 18px" }}>
                <div style={{ fontSize: "1.6rem", fontWeight: 800, color: s.color }}>{s.value}</div>
                <div style={{ fontSize: "0.78rem", color: "#64748b", fontWeight: 600, marginTop: 2 }}>{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Filter bar */}
        <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #e2eaf7", padding: "16px 20px", marginBottom: 20, display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
          <div style={{ flex: "1 1 200px" }}>
            <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, color: "#475569", marginBottom: 4 }}>Buscar</label>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Enunciado, área…"
              style={{ width: "100%", padding: "8px 12px", border: "1px solid #e2eaf7", borderRadius: 8, fontSize: "0.875rem", outline: "none", boxSizing: "border-box" }}
            />
          </div>
          <div style={{ flex: "0 1 160px" }}>
            <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, color: "#475569", marginBottom: 4 }}>Tipo de examen</label>
            <select
              value={examType}
              onChange={e => setExamType(e.target.value)}
              style={{ width: "100%", padding: "8px 12px", border: "1px solid #e2eaf7", borderRadius: 8, fontSize: "0.875rem", background: "#fff", outline: "none" }}
            >
              <option value="">Todos</option>
              <option value="ICFES">ICFES</option>
              <option value="UDEA">UDEA</option>
            </select>
          </div>
          <div style={{ flex: "0 1 180px" }}>
            <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, color: "#475569", marginBottom: 4 }}>Área</label>
            <select
              value={area}
              onChange={e => setArea(e.target.value)}
              style={{ width: "100%", padding: "8px 12px", border: "1px solid #e2eaf7", borderRadius: 8, fontSize: "0.875rem", background: "#fff", outline: "none" }}
            >
              <option value="">Todas</option>
              {allAreas.map(a => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>
          <div style={{ flex: "0 1 150px" }}>
            <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, color: "#475569", marginBottom: 4 }}>Dificultad</label>
            <select
              value={difficulty}
              onChange={e => setDifficulty(e.target.value)}
              style={{ width: "100%", padding: "8px 12px", border: "1px solid #e2eaf7", borderRadius: 8, fontSize: "0.875rem", background: "#fff", outline: "none" }}
            >
              <option value="">Todas</option>
              <option value="FACIL">Fácil</option>
              <option value="MEDIA">Media</option>
              <option value="DIFICIL">Difícil</option>
            </select>
          </div>
          <div style={{ flex: "0 1 140px" }}>
            <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, color: "#475569", marginBottom: 4 }}>Estado</label>
            <select
              value={isActive}
              onChange={e => setIsActive(e.target.value)}
              style={{ width: "100%", padding: "8px 12px", border: "1px solid #e2eaf7", borderRadius: 8, fontSize: "0.875rem", background: "#fff", outline: "none" }}
            >
              <option value="">Todos</option>
              <option value="true">Activa</option>
              <option value="false">Inactiva</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e2eaf7", boxShadow: "0 2px 8px rgba(0,74,173,0.06)", overflow: "hidden" }}>
          {fetching ? (
            <div style={{ padding: "56px 24px", textAlign: "center", color: "#64748b" }}>⏳ Cargando preguntas…</div>
          ) : questions.length === 0 ? (
            <div style={{ padding: "56px 24px", textAlign: "center", color: "#94a3b8" }}>
              No hay preguntas.{" "}
              <Link href="/admin/questions/nueva" style={{ color: "#004aad", fontWeight: 600 }}>Crea la primera</Link>
            </div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#f8faff", borderBottom: "1px solid #e2eaf7" }}>
                  {["Enunciado", "Área", "Tipo", "Dificultad", "Estado", "Usada en", "Acciones"].map(h => (
                    <th key={h} style={{ padding: "14px 16px", textAlign: "left", fontSize: "0.78rem", fontWeight: 700, color: "#475569", whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {questions.map((q, idx) => {
                  const diffStyle = DIFFICULTY_COLORS[q.difficulty] ?? { bg: "#f1f5f9", color: "#64748b" };
                  return (
                    <tr
                      key={q.id}
                      style={{ borderBottom: idx < questions.length - 1 ? "1px solid #f1f5f9" : "none", transition: "background 0.15s" }}
                      onMouseEnter={e => (e.currentTarget.style.background = "#f8faff")}
                      onMouseLeave={e => (e.currentTarget.style.background = "")}
                    >
                      <td style={{ padding: "14px 16px", maxWidth: 320 }}>
                        <div style={{ fontWeight: 500, color: "#1e293b", fontSize: "0.875rem", lineHeight: 1.4 }}>
                          {q.enunciado.length > 80 ? q.enunciado.slice(0, 80) + "…" : q.enunciado}
                        </div>
                        <div style={{ fontSize: "0.72rem", color: "#94a3b8", marginTop: 3 }}>
                          {new Date(q.createdAt).toLocaleDateString("es-CO", { day: "numeric", month: "short", year: "numeric" })}
                        </div>
                      </td>
                      <td style={{ padding: "14px 16px", fontSize: "0.82rem", color: "#475569", whiteSpace: "nowrap" }}>
                        {q.area || <span style={{ color: "#cbd5e1" }}>—</span>}
                      </td>
                      <td style={{ padding: "14px 16px", fontSize: "0.82rem", color: "#475569", whiteSpace: "nowrap" }}>
                        {EXAM_TYPE_LABELS[q.examType] ?? q.examType}
                      </td>
                      <td style={{ padding: "14px 16px" }}>
                        <span style={{
                          display: "inline-block",
                          padding: "3px 10px",
                          borderRadius: 20,
                          fontSize: "0.74rem",
                          fontWeight: 600,
                          background: diffStyle.bg,
                          color: diffStyle.color,
                        }}>
                          {DIFFICULTY_LABELS[q.difficulty] ?? q.difficulty}
                        </span>
                      </td>
                      <td style={{ padding: "14px 16px" }}>
                        <span style={{
                          display: "inline-block",
                          padding: "3px 10px",
                          borderRadius: 20,
                          fontSize: "0.74rem",
                          fontWeight: 600,
                          background: q.isActive ? "#dcfce7" : "#f1f5f9",
                          color: q.isActive ? "#16a34a" : "#64748b",
                        }}>
                          {q.isActive ? "● Activa" : "○ Inactiva"}
                        </span>
                      </td>
                      <td style={{ padding: "14px 16px", fontSize: "0.85rem", color: "#475569", textAlign: "center" }}>
                        {q._count.simulacroQuestions > 0 ? (
                          <span style={{ fontWeight: 600 }}>{q._count.simulacroQuestions}</span>
                        ) : (
                          <span style={{ color: "#cbd5e1" }}>—</span>
                        )}
                      </td>
                      <td style={{ padding: "14px 16px" }}>
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                          <Link
                            href={`/admin/questions/${q.id}`}
                            style={{ padding: "6px 12px", background: "#eff6ff", color: "#004aad", border: "1px solid #bfdbfe", borderRadius: 8, fontSize: "0.78rem", fontWeight: 600, textDecoration: "none", whiteSpace: "nowrap" }}
                          >
                            Editar
                          </Link>
                          <button
                            onClick={() => handleToggleActive(q)}
                            disabled={togglingId === q.id}
                            style={{ padding: "6px 12px", background: q.isActive ? "#fff7ed" : "#f0fdf4", color: q.isActive ? "#c2410c" : "#16a34a", border: `1px solid ${q.isActive ? "#fed7aa" : "#bbf7d0"}`, borderRadius: 8, fontSize: "0.78rem", fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}
                          >
                            {togglingId === q.id ? "…" : q.isActive ? "Desactivar" : "Activar"}
                          </button>
                          <button
                            onClick={() => handleDelete(q)}
                            disabled={deletingId === q.id}
                            style={{ padding: "6px 12px", background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca", borderRadius: 8, fontSize: "0.78rem", fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}
                          >
                            {deletingId === q.id ? "…" : "Eliminar"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </main>
    </div>
  );
}
