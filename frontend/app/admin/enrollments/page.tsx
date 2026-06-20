"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { Pagination } from "@/components/admin/Pagination";

interface Enrollment {
  id: string;
  enrolledAt: string;
  completedAt?: string;
  user: { id: string; email: string; firstName: string; lastName: string };
  course: { id: string; title: string };
}

const formatDate = (d: string) =>
  new Date(d).toLocaleDateString("es-CO", { day: "numeric", month: "short", year: "numeric" });

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
        <Link href="/admin/simulacros" className="sidebar-link"><span className="sidebar-link-icon">📋</span> Simulacros</Link>
        <Link href="/admin/enrollments" className="sidebar-link active"><span className="sidebar-link-icon">📝</span> Inscripciones</Link>
        <Link href="/admin/leads" className="sidebar-link"><span className="sidebar-link-icon">📞</span> Leads</Link>
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

const LIMIT = 25;

interface PagedResult { data: Enrollment[]; total: number; page: number; pages: number }

export default function AdminEnrollmentsPage() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [fetching, setFetching] = useState(true);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);

  useEffect(() => {
    if (!loading && !user) router.replace("/auth/login");
    if (!loading && user && user.role !== "ADMIN" && user.role !== "SUPER_ADMIN") router.replace("/dashboard");
  }, [user, loading]);

  const fetchData = useCallback((p: number, q: string) => {
    if (!user || (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN")) return;
    setFetching(true);
    const params = new URLSearchParams({ page: String(p), limit: String(LIMIT), ...(q && { search: q }) });
    api.get<PagedResult>(`/enrollments?${params}`)
      .then(res => { setEnrollments(res.data); setTotal(res.total); setPages(res.pages); })
      .finally(() => setFetching(false));
  }, [user]);

  useEffect(() => { fetchData(page, search); }, [fetchData, page, search]);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => { setPage(1); setSearch(searchInput); }, 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  if (loading || !user) return null;

  const totalCompleted = enrollments.filter(e => e.completedAt).length;
  const totalActive = enrollments.length - totalCompleted;

  return (
    <div style={{ minHeight: "100vh", background: "#f0f4ff" }}>
      <AdminSidebar logout={logout} router={router} isSuperAdmin={user.role === "SUPER_ADMIN"} />

      <main style={{ marginLeft: 260, padding: "32px 36px", minHeight: "100vh", boxSizing: "border-box" }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
          <div>
            <h1 style={{ fontSize: "1.5rem", fontWeight: 800, color: "#1e293b", margin: 0 }}>Inscripciones</h1>
            <p style={{ color: "#64748b", fontSize: "0.875rem", margin: "4px 0 0" }}>
              {enrollments.length} inscripci{enrollments.length !== 1 ? "ones" : "ón"} en total
            </p>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 24 }}>
          {[
            { label: "Total", value: total, color: "#004aad", bg: "#eff6ff", border: "#bfdbfe" },
            { label: "En progreso", value: totalActive, color: "#c2410c", bg: "#fff7ed", border: "#fed7aa" },
            { label: "Completados", value: totalCompleted, color: "#16a34a", bg: "#f0fdf4", border: "#bbf7d0" },
          ].map(card => (
            <div key={card.label} style={{ background: card.bg, border: `1px solid ${card.border}`, borderRadius: 14, padding: "18px 22px" }}>
              <div style={{ fontSize: "1.8rem", fontWeight: 800, color: card.color }}>{card.value}</div>
              <div style={{ fontSize: "0.8rem", color: card.color, fontWeight: 600, marginTop: 2 }}>{card.label}</div>
            </div>
          ))}
        </div>

        {/* Search */}
        <div style={{ marginBottom: 16 }}>
          <input
            type="text"
            placeholder="Buscar por estudiante o curso..."
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            style={{ width: "100%", maxWidth: 400, padding: "10px 14px", border: "1px solid #dde4f0", borderRadius: 10, fontSize: "0.875rem", color: "#1e293b", outline: "none", boxSizing: "border-box" }}
          />
        </div>

        {/* Table */}
        <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e2eaf7", boxShadow: "0 2px 8px rgba(0,74,173,0.06)", overflow: "hidden" }}>
          {fetching ? (
            <div style={{ padding: "56px 24px", textAlign: "center", color: "#64748b" }}>⏳ Cargando…</div>
          ) : enrollments.length === 0 ? (
            <div style={{ padding: "56px 24px", textAlign: "center", color: "#94a3b8" }}>
              {search ? "No se encontraron inscripciones." : "No hay inscripciones aún."}
            </div>
          ) : (
            <>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "#f8faff", borderBottom: "1px solid #e2eaf7" }}>
                    {["Estudiante", "Correo", "Curso", "Inscrito", "Estado"].map(h => (
                      <th key={h} style={{ padding: "14px 16px", textAlign: "left", fontSize: "0.78rem", fontWeight: 700, color: "#475569" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {enrollments.map((e, idx) => (
                    <tr
                      key={e.id}
                      style={{ borderBottom: idx < enrollments.length - 1 ? "1px solid #f1f5f9" : "none", transition: "background 0.15s" }}
                      onMouseEnter={ev => (ev.currentTarget.style.background = "#f8faff")}
                      onMouseLeave={ev => (ev.currentTarget.style.background = "")}
                    >
                      <td style={{ padding: "14px 16px", fontWeight: 600, color: "#1e293b", fontSize: "0.875rem" }}>
                        {e.user.firstName} {e.user.lastName}
                      </td>
                      <td style={{ padding: "14px 16px", fontSize: "0.85rem", color: "#64748b" }}>{e.user.email}</td>
                      <td style={{ padding: "14px 16px" }}>
                        <Link href={`/admin/courses/${e.course.id}`} style={{ fontWeight: 600, color: "#004aad", fontSize: "0.875rem", textDecoration: "none" }}>
                          {e.course.title}
                        </Link>
                      </td>
                      <td style={{ padding: "14px 16px", fontSize: "0.8rem", color: "#64748b" }}>{formatDate(e.enrolledAt)}</td>
                      <td style={{ padding: "14px 16px" }}>
                        <span style={{ display: "inline-block", padding: "3px 10px", borderRadius: 20, fontSize: "0.75rem", fontWeight: 600, background: e.completedAt ? "#dcfce7" : "#fff7ed", color: e.completedAt ? "#16a34a" : "#c2410c" }}>
                          {e.completedAt ? "✓ Completado" : "● En progreso"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <Pagination page={page} pages={pages} total={total} limit={LIMIT} onPageChange={p => setPage(p)} />
            </>
          )}
        </div>
      </main>
    </div>
  );
}
