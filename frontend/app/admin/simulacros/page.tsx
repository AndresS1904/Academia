"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";

interface SimulacroRow {
  id: string;
  titulo: string;
  descripcion?: string;
  examType: string;
  totalPreguntas: number;
  duracionMinutos: number;
  areasEvaluadas: string[];
  color?: string;
  emoji?: string;
  isPublished: boolean;
  createdAt: string;
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
        <Link href="/admin/questions" className="sidebar-link"><span className="sidebar-link-icon">🧠</span> Preguntas</Link>
        <Link href="/admin/simulacros" className="sidebar-link active"><span className="sidebar-link-icon">📋</span> Simulacros</Link>
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

export default function AdminSimulacrosPage() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const [simulacros, setSimulacros] = useState<SimulacroRow[]>([]);
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
    api.get<SimulacroRow[]>("/simulacros/admin/all")
      .then(setSimulacros)
      .finally(() => setFetching(false));
  }, [user]);

  async function handleTogglePublish(s: SimulacroRow) {
    setTogglingId(s.id);
    try {
      const result = await api.patch<{ isPublished: boolean }>(`/simulacros/admin/${s.id}/publish`, {});
      setSimulacros(prev =>
        prev.map(item => item.id === s.id ? { ...item, isPublished: result.isPublished } : item)
      );
    } catch { /* silencioso */ }
    setTogglingId(null);
  }

  async function handleDelete(s: SimulacroRow) {
    if (!confirm(`¿Eliminar el simulacro "${s.titulo}"? Esta acción no se puede deshacer.`)) return;
    setDeletingId(s.id);
    try {
      await api.delete(`/simulacros/admin/${s.id}`);
      setSimulacros(prev => prev.filter(item => item.id !== s.id));
    } catch (e: any) {
      alert("Error al eliminar: " + (e.message ?? ""));
    }
    setDeletingId(null);
  }

  if (loading || !user) return null;

  const totalPublicados = simulacros.filter(s => s.isPublished).length;
  const totalBorradores = simulacros.filter(s => !s.isPublished).length;
  // Total asignaciones: sum of totalPreguntas as a proxy (replace with real field if available)
  const totalAsignaciones = simulacros.reduce((acc, s) => acc + (s.totalPreguntas ?? 0), 0);

  const statCards = [
    { label: "Total simulacros", value: simulacros.length, color: "#004aad", bg: "#eff6ff", border: "#bfdbfe" },
    { label: "Publicados", value: totalPublicados, color: "#16a34a", bg: "#f0fdf4", border: "#bbf7d0" },
    { label: "Borradores", value: totalBorradores, color: "#64748b", bg: "#f8fafc", border: "#e2e8f0" },
    { label: "Total asignaciones", value: totalAsignaciones, color: "#7c3aed", bg: "#faf5ff", border: "#ddd6fe" },
  ];

  const columns = ["Simulacro", "Tipo", "Preguntas", "Duración", "Áreas", "Estado", "Creado", "Acciones"];

  return (
    <div style={{ minHeight: "100vh", background: "#f0f4ff" }}>
      <AdminSidebar logout={logout} router={router} isSuperAdmin={user.role === "SUPER_ADMIN"} />

      <main style={{ marginLeft: 260, padding: "32px 36px", minHeight: "100vh", boxSizing: "border-box" }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
          <div>
            <h1 style={{ fontSize: "1.5rem", fontWeight: 800, color: "#1e293b", margin: 0 }}>Simulacros</h1>
            <p style={{ color: "#64748b", fontSize: "0.875rem", margin: "4px 0 0" }}>
              {simulacros.length} simulacro{simulacros.length !== 1 ? "s" : ""} en total
            </p>
          </div>
          <Link
            href="/admin/simulacros/nuevo"
            style={{ padding: "10px 20px", background: "#004aad", color: "#fff", borderRadius: 12, textDecoration: "none", fontWeight: 700, fontSize: "0.9rem" }}
          >
            + Nuevo simulacro
          </Link>
        </div>

        {/* Stats row */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 28 }}>
          {statCards.map(card => (
            <div
              key={card.label}
              style={{
                background: card.bg,
                border: `1px solid ${card.border}`,
                borderRadius: 14,
                padding: "20px 24px",
                boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
              }}
            >
              <div style={{ fontSize: "2rem", fontWeight: 800, color: card.color, lineHeight: 1 }}>{card.value}</div>
              <div style={{ fontSize: "0.8rem", color: "#64748b", marginTop: 6, fontWeight: 500 }}>{card.label}</div>
            </div>
          ))}
        </div>

        {/* Table */}
        <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e2eaf7", boxShadow: "0 2px 8px rgba(0,74,173,0.06)", overflow: "hidden" }}>
          {fetching ? (
            <div style={{ padding: "56px 24px", textAlign: "center", color: "#64748b" }}>⏳ Cargando simulacros…</div>
          ) : simulacros.length === 0 ? (
            <div style={{ padding: "56px 24px", textAlign: "center", color: "#94a3b8" }}>
              No hay simulacros.{" "}
              <Link href="/admin/simulacros/nuevo" style={{ color: "#004aad", fontWeight: 600 }}>Crea el primero</Link>
            </div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#f8faff", borderBottom: "1px solid #e2eaf7" }}>
                  {columns.map(h => (
                    <th key={h} style={{ padding: "14px 16px", textAlign: "left", fontSize: "0.78rem", fontWeight: 700, color: "#475569", whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {simulacros.map((s, idx) => {
                  const desc = s.descripcion ?? "";
                  const descTruncated = desc.length > 60 ? desc.slice(0, 60) + "…" : desc;
                  const areas = (s.areasEvaluadas ?? []).join(", ");
                  const areasTruncated = areas.length > 40 ? areas.slice(0, 40) + "…" : areas;

                  const examTypeBadge = s.examType === "ICFES"
                    ? { bg: "#eff6ff", color: "#1d4ed8", border: "#bfdbfe" }
                    : s.examType === "UDEA"
                    ? { bg: "#f5f3ff", color: "#6d28d9", border: "#ddd6fe" }
                    : { bg: "#f1f5f9", color: "#475569", border: "#e2e8f0" };

                  return (
                    <tr
                      key={s.id}
                      style={{ borderBottom: idx < simulacros.length - 1 ? "1px solid #f1f5f9" : "none", transition: "background 0.15s" }}
                      onMouseEnter={e => (e.currentTarget.style.background = "#f8faff")}
                      onMouseLeave={e => (e.currentTarget.style.background = "")}
                    >
                      {/* Simulacro: emoji + titulo + descripcion */}
                      <td style={{ padding: "14px 16px", minWidth: 200 }}>
                        <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                          {s.emoji && (
                            <span style={{ fontSize: "1.4rem", lineHeight: 1, marginTop: 2, flexShrink: 0 }}>{s.emoji}</span>
                          )}
                          <div>
                            <div style={{ fontWeight: 600, color: "#1e293b", fontSize: "0.875rem" }}>{s.titulo}</div>
                            {descTruncated && (
                              <div style={{ fontSize: "0.75rem", color: "#94a3b8", marginTop: 2 }}>{descTruncated}</div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Tipo (examType badge) */}
                      <td style={{ padding: "14px 16px" }}>
                        <span style={{
                          display: "inline-block",
                          padding: "3px 10px",
                          borderRadius: 20,
                          fontSize: "0.75rem",
                          fontWeight: 700,
                          background: examTypeBadge.bg,
                          color: examTypeBadge.color,
                          border: `1px solid ${examTypeBadge.border}`,
                        }}>
                          {s.examType}
                        </span>
                      </td>

                      {/* Preguntas */}
                      <td style={{ padding: "14px 16px", fontSize: "0.85rem", color: "#475569", textAlign: "center" }}>
                        {s.totalPreguntas}
                      </td>

                      {/* Duración */}
                      <td style={{ padding: "14px 16px", fontSize: "0.85rem", color: "#475569", whiteSpace: "nowrap" }}>
                        {s.duracionMinutos} min
                      </td>

                      {/* Áreas */}
                      <td style={{ padding: "14px 16px", fontSize: "0.78rem", color: "#64748b", maxWidth: 180 }}>
                        {areasTruncated || <span style={{ color: "#cbd5e1" }}>—</span>}
                      </td>

                      {/* Estado */}
                      <td style={{ padding: "14px 16px" }}>
                        <span style={{
                          display: "inline-block",
                          padding: "3px 10px",
                          borderRadius: 20,
                          fontSize: "0.75rem",
                          fontWeight: 600,
                          background: s.isPublished ? "#dcfce7" : "#f1f5f9",
                          color: s.isPublished ? "#16a34a" : "#64748b",
                        }}>
                          {s.isPublished ? "● Publicado" : "○ Borrador"}
                        </span>
                      </td>

                      {/* Creado */}
                      <td style={{ padding: "14px 16px", fontSize: "0.8rem", color: "#94a3b8", whiteSpace: "nowrap" }}>
                        {new Date(s.createdAt).toLocaleDateString("es-CO", { day: "numeric", month: "short", year: "numeric" })}
                      </td>

                      {/* Acciones */}
                      <td style={{ padding: "14px 16px" }}>
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                          <Link
                            href={`/admin/simulacros/${s.id}`}
                            style={{ padding: "6px 12px", background: "#eff6ff", color: "#1d4ed8", border: "1px solid #bfdbfe", borderRadius: 8, fontSize: "0.78rem", fontWeight: 600, textDecoration: "none" }}
                          >
                            Editar
                          </Link>
                          <button
                            onClick={() => handleTogglePublish(s)}
                            disabled={togglingId === s.id}
                            style={{
                              padding: "6px 12px",
                              background: s.isPublished ? "#fff7ed" : "#f0fdf4",
                              color: s.isPublished ? "#c2410c" : "#16a34a",
                              border: `1px solid ${s.isPublished ? "#fed7aa" : "#bbf7d0"}`,
                              borderRadius: 8,
                              fontSize: "0.78rem",
                              fontWeight: 600,
                              cursor: "pointer",
                            }}
                          >
                            {togglingId === s.id ? "..." : s.isPublished ? "Despublicar" : "Publicar"}
                          </button>
                          <button
                            onClick={() => handleDelete(s)}
                            disabled={deletingId === s.id}
                            style={{
                              padding: "6px 12px",
                              background: "#fef2f2",
                              color: "#dc2626",
                              border: "1px solid #fecaca",
                              borderRadius: 8,
                              fontSize: "0.78rem",
                              fontWeight: 600,
                              cursor: "pointer",
                            }}
                          >
                            {deletingId === s.id ? "..." : "Eliminar"}
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
