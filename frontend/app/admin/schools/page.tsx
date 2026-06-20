"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";

interface SchoolRow {
  id: string;
  name: string;
  slug: string;
  nit?: string;
  email?: string;
  isActive: boolean;
  createdAt: string;
  _count: { users: number; licenses: number; courses: number };
}

function AdminSidebar({ logout, router }: { logout: () => void; router: ReturnType<typeof useRouter> }) {
  return (
    <aside className="admin-sidebar">
      <div className="admin-sidebar-logo">
        <div className="admin-sidebar-logo-text">Ap<span>rova</span></div>
        <div className="admin-sidebar-badge">Panel Admin</div>
      </div>
      <nav className="sidebar-nav">
        <div className="sidebar-nav-label" style={{ color: "#f59e0b" }}>Super Admin</div>
        <Link href="/admin/schools" className="sidebar-link active"><span className="sidebar-link-icon">🏫</span> Instituciones</Link>
        <Link href="/admin/products" className="sidebar-link"><span className="sidebar-link-icon">📦</span> Productos</Link>
        <Link href="/admin/licenses" className="sidebar-link"><span className="sidebar-link-icon">🔑</span> Licencias</Link>
        <div className="sidebar-nav-label">Gestión</div>
        <Link href="/admin" className="sidebar-link"><span className="sidebar-link-icon">📊</span> Dashboard</Link>
        <Link href="/admin/users" className="sidebar-link"><span className="sidebar-link-icon">👥</span> Usuarios</Link>
        <Link href="/admin/courses" className="sidebar-link"><span className="sidebar-link-icon">📚</span> Cursos</Link>
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

export default function AdminSchoolsPage() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const [schools, setSchools] = useState<SchoolRow[]>([]);
  const [fetching, setFetching] = useState(true);
  const [search, setSearch] = useState("");
  const [togglingId, setTogglingId] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) router.replace("/auth/login");
    if (!loading && user && user.role !== "SUPER_ADMIN") router.replace("/admin");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, loading]);

  useEffect(() => {
    if (!user || user.role !== "SUPER_ADMIN") return;
    api.get<SchoolRow[]>("/schools")
      .then(setSchools)
      .finally(() => setFetching(false));
  }, [user]);

  async function handleToggleActive(school: SchoolRow) {
    setTogglingId(school.id);
    try {
      await api.patch(`/schools/${school.id}/toggle-active`, {});
      setSchools(prev =>
        prev.map(s => s.id === school.id ? { ...s, isActive: !s.isActive } : s)
      );
    } catch { /* silencioso */ }
    setTogglingId(null);
  }

  if (loading || !user) return null;

  const filtered = schools.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    (s.nit ?? "").toLowerCase().includes(search.toLowerCase()) ||
    (s.email ?? "").toLowerCase().includes(search.toLowerCase())
  );

  const total = schools.length;
  const activos = schools.filter(s => s.isActive).length;
  const inactivos = total - activos;

  return (
    <div style={{ minHeight: "100vh", background: "#f0f4ff" }}>
      <AdminSidebar logout={logout} router={router} />

      <main style={{ marginLeft: 260, padding: "32px 36px", minHeight: "100vh", boxSizing: "border-box" }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
          <div>
            <h1 style={{ fontSize: "1.5rem", fontWeight: 800, color: "#1e293b", margin: 0 }}>Instituciones</h1>
            <p style={{ color: "#64748b", fontSize: "0.875rem", margin: "4px 0 0" }}>
              {total} institución{total !== 1 ? "es" : ""} registrada{total !== 1 ? "s" : ""}
            </p>
          </div>
          <Link
            href="/admin/schools/nuevo"
            style={{ padding: "10px 20px", background: "#004aad", color: "#fff", borderRadius: 12, textDecoration: "none", fontWeight: 700, fontSize: "0.9rem" }}
          >
            + Nueva institución
          </Link>
        </div>

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 24 }}>
          {[
            { label: "Total instituciones", value: total, color: "#004aad", bg: "#eff6ff" },
            { label: "Activos", value: activos, color: "#16a34a", bg: "#f0fdf4" },
            { label: "Inactivos", value: inactivos, color: "#64748b", bg: "#f1f5f9" },
          ].map(stat => (
            <div key={stat.label} style={{ background: "#fff", borderRadius: 16, border: "1px solid #e2eaf7", boxShadow: "0 2px 8px rgba(0,74,173,0.06)", padding: "20px 24px" }}>
              <div style={{ fontSize: "0.78rem", fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>{stat.label}</div>
              <div style={{ fontSize: "1.8rem", fontWeight: 800, color: stat.color }}>{stat.value}</div>
            </div>
          ))}
        </div>

        {/* Filter */}
        <div style={{ marginBottom: 18 }}>
          <input
            type="text"
            placeholder="Buscar por nombre, NIT o email…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ padding: "10px 16px", borderRadius: 10, border: "1px solid #e2eaf7", fontSize: "0.875rem", width: 320, outline: "none", background: "#fff" }}
          />
        </div>

        {/* Table */}
        <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e2eaf7", boxShadow: "0 2px 8px rgba(0,74,173,0.06)", overflow: "hidden" }}>
          {fetching ? (
            <div style={{ padding: "56px 24px", textAlign: "center", color: "#64748b" }}>⏳ Cargando instituciones…</div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: "56px 24px", textAlign: "center", color: "#94a3b8" }}>
              {search ? "No se encontraron instituciones con ese filtro." : <>No hay instituciones. <Link href="/admin/schools/nuevo" style={{ color: "#004aad", fontWeight: 600 }}>Crea la primera</Link></>}
            </div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#f8faff", borderBottom: "1px solid #e2eaf7" }}>
                  {["Nombre", "NIT", "Email", "Usuarios", "Licencias", "Estado", "Creado", "Acciones"].map(h => (
                    <th key={h} style={{ padding: "14px 16px", textAlign: "left", fontSize: "0.78rem", fontWeight: 700, color: "#475569", whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((s, idx) => (
                  <tr
                    key={s.id}
                    style={{ borderBottom: idx < filtered.length - 1 ? "1px solid #f1f5f9" : "none", transition: "background 0.15s" }}
                    onMouseEnter={e => (e.currentTarget.style.background = "#f8faff")}
                    onMouseLeave={e => (e.currentTarget.style.background = "")}
                  >
                    <td style={{ padding: "14px 16px" }}>
                      <div style={{ fontWeight: 600, color: "#1e293b", fontSize: "0.875rem" }}>{s.name}</div>
                      <div style={{ fontSize: "0.75rem", color: "#94a3b8" }}>{s.slug}</div>
                    </td>
                    <td style={{ padding: "14px 16px", fontSize: "0.85rem", color: "#475569" }}>
                      {s.nit || <span style={{ color: "#cbd5e1" }}>—</span>}
                    </td>
                    <td style={{ padding: "14px 16px", fontSize: "0.85rem", color: "#475569" }}>
                      {s.email || <span style={{ color: "#cbd5e1" }}>—</span>}
                    </td>
                    <td style={{ padding: "14px 16px", fontSize: "0.85rem", color: "#475569", textAlign: "center" }}>
                      {s._count.users}
                    </td>
                    <td style={{ padding: "14px 16px", fontSize: "0.85rem", color: "#475569", textAlign: "center" }}>
                      {s._count.licenses}
                    </td>
                    <td style={{ padding: "14px 16px" }}>
                      <span style={{
                        display: "inline-block",
                        padding: "3px 10px",
                        borderRadius: 20,
                        fontSize: "0.75rem",
                        fontWeight: 600,
                        background: s.isActive ? "#dcfce7" : "#f1f5f9",
                        color: s.isActive ? "#16a34a" : "#64748b",
                      }}>
                        {s.isActive ? "● Activo" : "○ Inactivo"}
                      </span>
                    </td>
                    <td style={{ padding: "14px 16px", fontSize: "0.8rem", color: "#94a3b8", whiteSpace: "nowrap" }}>
                      {new Date(s.createdAt).toLocaleDateString("es-CO", { day: "numeric", month: "short", year: "numeric" })}
                    </td>
                    <td style={{ padding: "14px 16px" }}>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        <Link
                          href={`/admin/schools/${s.id}`}
                          style={{ padding: "6px 12px", background: "#eff6ff", color: "#004aad", border: "1px solid #bfdbfe", borderRadius: 8, fontSize: "0.78rem", fontWeight: 600, textDecoration: "none" }}
                        >
                          Ver detalle
                        </Link>
                        <button
                          onClick={() => handleToggleActive(s)}
                          disabled={togglingId === s.id}
                          style={{ padding: "6px 12px", background: s.isActive ? "#fff7ed" : "#f0fdf4", color: s.isActive ? "#c2410c" : "#16a34a", border: `1px solid ${s.isActive ? "#fed7aa" : "#bbf7d0"}`, borderRadius: 8, fontSize: "0.78rem", fontWeight: 600, cursor: "pointer" }}
                        >
                          {togglingId === s.id ? "..." : s.isActive ? "Desactivar" : "Activar"}
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
