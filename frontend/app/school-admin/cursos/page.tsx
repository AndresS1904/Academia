"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import SchoolAdminSidebar from "@/components/school-admin/SchoolAdminSidebar";
import { Trash2 } from "lucide-react";

interface Course {
  id: string;
  title: string;
  slug: string;
  isPublished: boolean;
  isGlobal: boolean;
  createdAt: string;
  _count: { lessons: number; enrollments: number };
}

const formatDate = (d: string) =>
  new Date(d).toLocaleDateString("es-CO", { day: "numeric", month: "short", year: "numeric" });

export default function SchoolAdminCursosPage() {
  const { user } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    api.get<Course[]>("/courses/admin/all")
      .then(data => setCourses(data.filter(c => !c.isGlobal)))
      .finally(() => setLoading(false));
  }, [user]);

  async function togglePublish(course: Course) {
    setTogglingId(course.id);
    try {
      await api.patch(`/courses/${course.id}/publish`, {});
      setCourses(prev => prev.map(c => c.id === course.id ? { ...c, isPublished: !c.isPublished } : c));
    } catch { /* silencioso */ }
    setTogglingId(null);
  }

  async function deleteCourse(course: Course) {
    if (!confirm(`¿Eliminar el curso "${course.title}"? Esta acción no se puede deshacer.`)) return;
    setDeletingId(course.id);
    try {
      await api.delete(`/courses/${course.id}`);
      setCourses(prev => prev.filter(c => c.id !== course.id));
    } catch (e: any) {
      alert(e.message ?? "Error al eliminar el curso");
    }
    setDeletingId(null);
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f0f4ff" }}>
      <SchoolAdminSidebar />
      <main style={{ marginLeft: 260, padding: "32px 36px", minHeight: "100vh", boxSizing: "border-box" }}>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
          <div>
            <h1 style={{ fontSize: "1.5rem", fontWeight: 800, color: "#1e293b", margin: 0 }}>Mis cursos</h1>
            <p style={{ color: "#64748b", fontSize: "0.875rem", margin: "4px 0 0" }}>
              Cursos creados por tu colegio.
            </p>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <Link
              href="/school-admin/catalogo"
              style={{ padding: "10px 16px", background: "#f1f5f9", color: "#475569", borderRadius: 10, textDecoration: "none", fontWeight: 600, fontSize: "0.875rem", border: "1px solid #e2eaf7" }}
            >
              🗂️ Ver catálogo completo
            </Link>
            <Link
              href="/school-admin/cursos/nuevo"
              style={{ padding: "10px 20px", background: "#004aad", color: "#fff", borderRadius: 12, textDecoration: "none", fontWeight: 700, fontSize: "0.9rem" }}
            >
              + Nuevo curso
            </Link>
          </div>
        </div>

        <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e2eaf7", boxShadow: "0 2px 8px rgba(0,74,173,0.06)", overflow: "hidden" }}>
          {loading ? (
            <div style={{ padding: "56px 24px", textAlign: "center", color: "#64748b" }}>⏳ Cargando…</div>
          ) : courses.length === 0 ? (
            <div style={{ padding: "56px 24px", textAlign: "center", color: "#94a3b8" }}>
              No has creado cursos propios.{" "}
              <Link href="/school-admin/cursos/nuevo" style={{ color: "#004aad", fontWeight: 600 }}>Crea el primero</Link>
            </div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#f8faff", borderBottom: "1px solid #e2eaf7" }}>
                  {["Título", "Lecciones", "Inscritos", "Estado", "Creado", "Acciones"].map(h => (
                    <th key={h} style={{ padding: "14px 16px", textAlign: "left", fontSize: "0.78rem", fontWeight: 700, color: "#475569" }}>{h}</th>
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
                    <td style={{ padding: "14px 16px", fontWeight: 600, color: "#1e293b", fontSize: "0.875rem" }}>{c.title}</td>
                    <td style={{ padding: "14px 16px", fontSize: "0.85rem", color: "#475569", textAlign: "center" }}>{c._count.lessons}</td>
                    <td style={{ padding: "14px 16px", fontSize: "0.85rem", color: "#475569", textAlign: "center" }}>{c._count.enrollments}</td>
                    <td style={{ padding: "14px 16px" }}>
                      <span style={{ display: "inline-block", padding: "3px 10px", borderRadius: 20, fontSize: "0.75rem", fontWeight: 600, background: c.isPublished ? "#dcfce7" : "#f1f5f9", color: c.isPublished ? "#16a34a" : "#64748b" }}>
                        {c.isPublished ? "● Publicado" : "○ Borrador"}
                      </span>
                    </td>
                    <td style={{ padding: "14px 16px", fontSize: "0.8rem", color: "#64748b" }}>{formatDate(c.createdAt)}</td>
                    <td style={{ padding: "14px 16px" }}>
                      <div style={{ display: "flex", gap: 6 }}>
                        <Link
                          href={`/school-admin/cursos/${c.id}`}
                          style={{ padding: "6px 12px", background: "#eff6ff", color: "#004aad", border: "1px solid #bfdbfe", borderRadius: 8, fontSize: "0.78rem", fontWeight: 600, textDecoration: "none" }}
                        >
                          Editar
                        </Link>
                        <button
                          onClick={() => togglePublish(c)}
                          disabled={togglingId === c.id}
                          style={{ padding: "6px 12px", background: c.isPublished ? "#fff7ed" : "#f0fdf4", color: c.isPublished ? "#c2410c" : "#16a34a", border: `1px solid ${c.isPublished ? "#fed7aa" : "#bbf7d0"}`, borderRadius: 8, fontSize: "0.78rem", fontWeight: 600, cursor: "pointer" }}
                        >
                          {togglingId === c.id ? "..." : c.isPublished ? "Despublicar" : "Publicar"}
                        </button>
                        <button
                          onClick={() => deleteCourse(c)}
                          disabled={deletingId === c.id}
                          title="Eliminar curso"
                          style={{ padding: "6px 10px", background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca", borderRadius: 8, cursor: deletingId === c.id ? "not-allowed" : "pointer", display: "flex", alignItems: "center" }}
                        >
                          <Trash2 size={14} />
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
