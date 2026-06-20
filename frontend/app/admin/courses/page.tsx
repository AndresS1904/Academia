"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";

interface CourseRow {
  id: string;
  title: string;
  slug: string;
  instructorName?: string;
  duration?: string;
  isPublished: boolean;
  createdAt: string;
  _count: { lessons: number; enrollments: number };
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
        <Link href="/admin/courses" className="sidebar-link active"><span className="sidebar-link-icon">📚</span> Cursos</Link>
        <Link href="/admin/enrollments" className="sidebar-link"><span className="sidebar-link-icon">📝</span> Inscripciones</Link>
        <Link href="/admin/leads" className="sidebar-link"><span className="sidebar-link-icon">📞</span> Leads</Link>
        <Link href="/admin/questions" className="sidebar-link"><span className="sidebar-link-icon">🧠</span> Preguntas</Link>
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

export default function AdminCoursesPage() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const [courses, setCourses] = useState<CourseRow[]>([]);
  const [fetching, setFetching] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) router.replace("/auth/login");
    if (!loading && user && user.role !== "ADMIN" && user.role !== "SUPER_ADMIN") router.replace("/dashboard");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, loading]);

  useEffect(() => {
    if (!user || (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN")) return;
    api.get<CourseRow[]>("/courses/admin/all")
      .then(setCourses)
      .finally(() => setFetching(false));
  }, [user]);

  async function handleTogglePublish(course: CourseRow) {
    setTogglingId(course.id);
    try {
      await api.patch(`/courses/${course.id}/publish`, {});
      setCourses(prev =>
        prev.map(c => c.id === course.id ? { ...c, isPublished: !c.isPublished } : c)
      );
    } catch { /* silencioso */ }
    setTogglingId(null);
  }

  async function handleDelete(course: CourseRow) {
    if (!confirm(`¿Eliminar el curso "${course.title}"? Esta acción no se puede deshacer.`)) return;
    setDeletingId(course.id);
    try {
      await api.delete(`/courses/${course.id}`);
      setCourses(prev => prev.filter(c => c.id !== course.id));
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
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
          <div>
            <h1 style={{ fontSize: "1.5rem", fontWeight: 800, color: "#1e293b", margin: 0 }}>Cursos</h1>
            <p style={{ color: "#64748b", fontSize: "0.875rem", margin: "4px 0 0" }}>
              {courses.length} curso{courses.length !== 1 ? "s" : ""} en total
            </p>
          </div>
          <Link
            href="/admin/courses/nuevo"
            style={{ padding: "10px 20px", background: "#004aad", color: "#fff", borderRadius: 12, textDecoration: "none", fontWeight: 700, fontSize: "0.9rem" }}
          >
            + Nuevo curso
          </Link>
        </div>

        {/* Tabla */}
        <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e2eaf7", boxShadow: "0 2px 8px rgba(0,74,173,0.06)", overflow: "hidden" }}>
          {fetching ? (
            <div style={{ padding: "56px 24px", textAlign: "center", color: "#64748b" }}>⏳ Cargando cursos…</div>
          ) : courses.length === 0 ? (
            <div style={{ padding: "56px 24px", textAlign: "center", color: "#94a3b8" }}>
              No hay cursos.{" "}
              <Link href="/admin/courses/nuevo" style={{ color: "#004aad", fontWeight: 600 }}>Crea el primero</Link>
            </div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#f8faff", borderBottom: "1px solid #e2eaf7" }}>
                  {["Curso", "Instructor", "Duración", "Secciones", "Inscritos", "Estado", "Fecha", "Acciones"].map(h => (
                    <th key={h} style={{ padding: "14px 16px", textAlign: "left", fontSize: "0.78rem", fontWeight: 700, color: "#475569", whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {courses.map((c, idx) => (
                  <tr
                    key={c.id}
                    style={{ borderBottom: idx < courses.length - 1 ? "1px solid #f1f5f9" : "none", transition: "background 0.15s" }}
                    onMouseEnter={e => (e.currentTarget.style.background = "#f8faff")}
                    onMouseLeave={e => (e.currentTarget.style.background = "")}
                  >
                    <td style={{ padding: "14px 16px" }}>
                      <div style={{ fontWeight: 600, color: "#1e293b", fontSize: "0.875rem" }}>{c.title}</div>
                      <div style={{ fontSize: "0.75rem", color: "#94a3b8" }}>{c.slug}</div>
                    </td>
                    <td style={{ padding: "14px 16px", fontSize: "0.85rem", color: "#475569" }}>
                      {c.instructorName || <span style={{ color: "#cbd5e1" }}>—</span>}
                    </td>
                    <td style={{ padding: "14px 16px", fontSize: "0.85rem", color: "#475569" }}>
                      {c.duration || <span style={{ color: "#cbd5e1" }}>—</span>}
                    </td>
                    <td style={{ padding: "14px 16px", fontSize: "0.85rem", color: "#475569", textAlign: "center" }}>
                      {c._count.lessons}
                    </td>
                    <td style={{ padding: "14px 16px", fontSize: "0.85rem", color: "#475569", textAlign: "center" }}>
                      {c._count.enrollments}
                    </td>
                    <td style={{ padding: "14px 16px" }}>
                      <span style={{
                        display: "inline-block",
                        padding: "3px 10px",
                        borderRadius: 20,
                        fontSize: "0.75rem",
                        fontWeight: 600,
                        background: c.isPublished ? "#dcfce7" : "#f1f5f9",
                        color: c.isPublished ? "#16a34a" : "#64748b",
                      }}>
                        {c.isPublished ? "● Publicado" : "○ Borrador"}
                      </span>
                    </td>
                    <td style={{ padding: "14px 16px", fontSize: "0.8rem", color: "#94a3b8", whiteSpace: "nowrap" }}>
                      {new Date(c.createdAt).toLocaleDateString("es-CO", { day: "numeric", month: "short", year: "numeric" })}
                    </td>
                    <td style={{ padding: "14px 16px" }}>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        <Link
                          href={`/admin/courses/${c.id}`}
                          style={{ padding: "6px 12px", background: "#eff6ff", color: "#004aad", border: "1px solid #bfdbfe", borderRadius: 8, fontSize: "0.78rem", fontWeight: 600, textDecoration: "none" }}
                        >
                          Editar
                        </Link>
                        <button
                          onClick={() => handleTogglePublish(c)}
                          disabled={togglingId === c.id}
                          style={{ padding: "6px 12px", background: c.isPublished ? "#fff7ed" : "#f0fdf4", color: c.isPublished ? "#c2410c" : "#16a34a", border: `1px solid ${c.isPublished ? "#fed7aa" : "#bbf7d0"}`, borderRadius: 8, fontSize: "0.78rem", fontWeight: 600, cursor: "pointer" }}
                        >
                          {togglingId === c.id ? "..." : c.isPublished ? "Despublicar" : "Publicar"}
                        </button>
                        <button
                          onClick={() => handleDelete(c)}
                          disabled={deletingId === c.id}
                          style={{ padding: "6px 12px", background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca", borderRadius: 8, fontSize: "0.78rem", fontWeight: 600, cursor: "pointer" }}
                        >
                          {deletingId === c.id ? "..." : "Eliminar"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>
    </div>
  );
}
