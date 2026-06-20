"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";

interface LicenseRow {
  id: string;
  schoolId: string;
  productId: string;
  status: "ACTIVE" | "EXPIRED" | "CANCELLED";
  startsAt: string;
  endsAt: string | null;
  pricePaid: number | null;
  currency: string;
  school: { name: string };
  product: { name: string; type: string };
  grantedBy: { firstName: string; lastName: string } | null;
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
        <Link href="/admin/schools" className="sidebar-link"><span className="sidebar-link-icon">🏫</span> Instituciones</Link>
        <Link href="/admin/products" className="sidebar-link"><span className="sidebar-link-icon">📦</span> Productos</Link>
        <Link href="/admin/licenses" className="sidebar-link active"><span className="sidebar-link-icon">🔑</span> Licencias</Link>
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

const formatPrice = (v: number | null) =>
  v == null ? "—" : new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(v);

const formatDate = (d: string | null) =>
  d ? new Date(d).toLocaleDateString("es-CO", { day: "numeric", month: "short", year: "numeric" }) : "Perpetua";

const statusColors: Record<string, { bg: string; color: string; label: string }> = {
  ACTIVE: { bg: "#dcfce7", color: "#16a34a", label: "Activa" },
  EXPIRED: { bg: "#fef2f2", color: "#dc2626", label: "Expirada" },
  CANCELLED: { bg: "#f1f5f9", color: "#64748b", label: "Cancelada" },
};

const ALL_TYPES = ["COURSE", "SIMULACRO", "QUESTION_BANK", "BUNDLE"];

export default function AdminLicensesPage() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const [licenses, setLicenses] = useState<LicenseRow[]>([]);
  const [fetching, setFetching] = useState(true);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "EXPIRED" | "CANCELLED">("ALL");
  const [typeFilter, setTypeFilter] = useState("ALL");

  useEffect(() => {
    if (!loading && !user) router.replace("/auth/login");
    if (!loading && user && user.role !== "SUPER_ADMIN") router.replace("/admin");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, loading]);

  useEffect(() => {
    if (!user || user.role !== "SUPER_ADMIN") return;
    api.get<LicenseRow[]>("/licenses")
      .then(setLicenses)
      .finally(() => setFetching(false));
  }, [user]);

  async function handleRevoke(id: string) {
    if (!confirm("¿Revocar esta licencia? Esta acción no se puede deshacer.")) return;
    setRevokingId(id);
    try {
      await api.patch(`/licenses/${id}/revoke`, {});
      setLicenses(prev =>
        prev.map(l => l.id === id ? { ...l, status: "CANCELLED" as const } : l)
      );
    } catch { /* silencioso */ }
    setRevokingId(null);
  }

  if (loading || !user) return null;

  const filtered = licenses.filter(l => {
    const matchSearch = search === "" || l.school.name.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "ALL" || l.status === statusFilter;
    const matchType = typeFilter === "ALL" || l.product.type === typeFilter;
    return matchSearch && matchStatus && matchType;
  });

  const total = licenses.length;
  const activas = licenses.filter(l => l.status === "ACTIVE").length;
  const expiradas = licenses.filter(l => l.status === "EXPIRED").length;
  const canceladas = licenses.filter(l => l.status === "CANCELLED").length;
  const revenue = licenses.reduce((sum, l) => sum + (l.pricePaid ?? 0), 0);

  const selectStyle: React.CSSProperties = {
    padding: "9px 13px",
    borderRadius: 10,
    border: "1px solid #e2eaf7",
    fontSize: "0.875rem",
    outline: "none",
    background: "#fff",
    cursor: "pointer",
  };

  return (
    <div style={{ minHeight: "100vh", background: "#f0f4ff" }}>
      <AdminSidebar logout={logout} router={router} />

      <main style={{ marginLeft: 260, padding: "32px 36px", minHeight: "100vh", boxSizing: "border-box" }}>
        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 800, color: "#1e293b", margin: 0 }}>Licencias</h1>
          <p style={{ color: "#64748b", fontSize: "0.875rem", margin: "4px 0 0" }}>
            Vista global de todas las licencias asignadas
          </p>
        </div>

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 14, marginBottom: 24 }}>
          {[
            { label: "Total", value: total, color: "#004aad" },
            { label: "Activas", value: activas, color: "#16a34a" },
            { label: "Expiradas", value: expiradas, color: "#dc2626" },
            { label: "Canceladas", value: canceladas, color: "#64748b" },
            { label: "Revenue total", value: formatPrice(revenue), color: "#7c3aed", isText: true },
          ].map(stat => (
            <div key={stat.label} style={{ background: "#fff", borderRadius: 14, border: "1px solid #e2eaf7", boxShadow: "0 2px 8px rgba(0,74,173,0.06)", padding: "16px 20px" }}>
              <div style={{ fontSize: "0.72rem", fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>{stat.label}</div>
              <div style={{ fontSize: stat.isText ? "1.1rem" : "1.6rem", fontWeight: 800, color: stat.color }}>{stat.value}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div style={{ display: "flex", gap: 12, marginBottom: 18, flexWrap: "wrap", alignItems: "center" }}>
          <input
            type="text"
            placeholder="Buscar por colegio…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ padding: "9px 14px", borderRadius: 10, border: "1px solid #e2eaf7", fontSize: "0.875rem", width: 260, outline: "none", background: "#fff" }}
          />
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as any)} style={selectStyle}>
            <option value="ALL">Todos los estados</option>
            <option value="ACTIVE">Activas</option>
            <option value="EXPIRED">Expiradas</option>
            <option value="CANCELLED">Canceladas</option>
          </select>
          <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} style={selectStyle}>
            <option value="ALL">Todos los tipos</option>
            {ALL_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          {(search || statusFilter !== "ALL" || typeFilter !== "ALL") && (
            <button
              onClick={() => { setSearch(""); setStatusFilter("ALL"); setTypeFilter("ALL"); }}
              style={{ padding: "9px 14px", background: "#f1f5f9", color: "#64748b", border: "1px solid #e2eaf7", borderRadius: 10, fontSize: "0.875rem", cursor: "pointer", fontWeight: 600 }}
            >
              Limpiar filtros
            </button>
          )}
          <span style={{ marginLeft: "auto", fontSize: "0.82rem", color: "#94a3b8" }}>
            {filtered.length} resultado{filtered.length !== 1 ? "s" : ""}
          </span>
        </div>

        {/* Table */}
        <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e2eaf7", boxShadow: "0 2px 8px rgba(0,74,173,0.06)", overflow: "hidden" }}>
          {fetching ? (
            <div style={{ padding: "56px 24px", textAlign: "center", color: "#64748b" }}>⏳ Cargando licencias…</div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: "56px 24px", textAlign: "center", color: "#94a3b8" }}>
              No hay licencias que coincidan con los filtros aplicados.
            </div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#f8faff", borderBottom: "1px solid #e2eaf7" }}>
                  {["Colegio", "Producto", "Tipo", "Precio pagado", "Inicio", "Vencimiento", "Estado", "Otorgada por", "Acciones"].map(h => (
                    <th key={h} style={{ padding: "14px 16px", textAlign: "left", fontSize: "0.78rem", fontWeight: 700, color: "#475569", whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((l, idx) => {
                  const sc = statusColors[l.status] ?? statusColors.CANCELLED;
                  const isExpiredDate = l.endsAt && new Date(l.endsAt) < new Date();
                  const grantedByName = l.grantedBy
                    ? `${l.grantedBy.firstName} ${l.grantedBy.lastName}`
                    : null;
                  return (
                    <tr
                      key={l.id}
                      style={{ borderBottom: idx < filtered.length - 1 ? "1px solid #f1f5f9" : "none", transition: "background 0.15s" }}
                      onMouseEnter={e => (e.currentTarget.style.background = "#f8faff")}
                      onMouseLeave={e => (e.currentTarget.style.background = "")}
                    >
                      <td style={{ padding: "14px 16px" }}>
                        <Link
                          href={`/admin/schools/${l.schoolId}`}
                          style={{ fontWeight: 600, color: "#004aad", fontSize: "0.875rem", textDecoration: "none" }}
                        >
                          {l.school.name}
                        </Link>
                      </td>
                      <td style={{ padding: "14px 16px", fontSize: "0.85rem", color: "#1e293b", fontWeight: 500 }}>
                        {l.product.name}
                      </td>
                      <td style={{ padding: "14px 16px", fontSize: "0.8rem", color: "#475569" }}>
                        {l.product.type}
                      </td>
                      <td style={{ padding: "14px 16px", fontSize: "0.85rem", color: "#475569", whiteSpace: "nowrap" }}>
                        {formatPrice(l.pricePaid)}
                      </td>
                      <td style={{ padding: "14px 16px", fontSize: "0.8rem", color: "#64748b", whiteSpace: "nowrap" }}>
                        {formatDate(l.startsAt)}
                      </td>
                      <td style={{ padding: "14px 16px", fontSize: "0.8rem", whiteSpace: "nowrap", color: isExpiredDate && l.status === "ACTIVE" ? "#dc2626" : "#64748b" }}>
                        {l.endsAt ? formatDate(l.endsAt) : <span style={{ color: "#94a3b8", fontStyle: "italic" }}>Perpetua</span>}
                      </td>
                      <td style={{ padding: "14px 16px" }}>
                        <span style={{ display: "inline-block", padding: "3px 10px", borderRadius: 20, fontSize: "0.75rem", fontWeight: 600, background: sc.bg, color: sc.color }}>
                          {sc.label}
                        </span>
                      </td>
                      <td style={{ padding: "14px 16px", fontSize: "0.82rem", color: "#475569" }}>
                        {grantedByName || <span style={{ color: "#cbd5e1" }}>—</span>}
                      </td>
                      <td style={{ padding: "14px 16px" }}>
                        {l.status === "ACTIVE" && (
                          <button
                            onClick={() => handleRevoke(l.id)}
                            disabled={revokingId === l.id}
                            style={{ padding: "6px 12px", background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca", borderRadius: 8, fontSize: "0.78rem", fontWeight: 600, cursor: "pointer" }}
                          >
                            {revokingId === l.id ? "..." : "Revocar"}
                          </button>
                        )}
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
