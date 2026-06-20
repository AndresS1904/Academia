"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { Pagination } from "@/components/admin/Pagination";

interface Lead {
  id: string;
  name: string;
  phone: string;
  program: string;
  isContacted: boolean;
  createdAt: string;
}

const LIMIT = 25;
interface PagedLeads { data: Lead[]; total: number; page: number; pages: number }

export default function AdminLeadsPage() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);

  useEffect(() => {
    if (!loading && !user) router.replace("/auth/login");
    if (!loading && user && user.role !== "ADMIN" && user.role !== "SUPER_ADMIN") router.replace("/dashboard");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, loading]);

  const fetchData = useCallback((p: number, q: string) => {
    if (!user) return;
    setFetching(true);
    const params = new URLSearchParams({ page: String(p), limit: String(LIMIT), ...(q && { search: q }) });
    api.get<PagedLeads>(`/leads?${params}`)
      .then(res => { setLeads(res.data); setTotal(res.total); setPages(res.pages); })
      .catch(e => setError(e.message ?? "Error al cargar"))
      .finally(() => setFetching(false));
  }, [user]);

  useEffect(() => { fetchData(page, search); }, [fetchData, page, search]);

  useEffect(() => {
    const t = setTimeout(() => { setPage(1); setSearch(searchInput); }, 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  async function markContacted(id: string) {
    try {
      await api.patch(`/leads/${id}/contacted`, {});
      setLeads((prev) =>
        prev.map((l) => (l.id === id ? { ...l, isContacted: true } : l))
      );
    } catch {
      alert("No se pudo actualizar");
    }
  }

  if (loading || !user) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f0f4ff" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "2.5rem", marginBottom: "12px" }}>⏳</div>
          <div style={{ fontFamily: "var(--font-poppins)", fontWeight: 700, color: "#004aad" }}>Cargando…</div>
        </div>
      </div>
    );
  }

  const pendientes = leads.filter((l) => !l.isContacted);
  const contactados = leads.filter((l) => l.isContacted);
  const totalPendientes = total - contactados.length; // approx on visible page

  return (
    <div className="admin-layout">
      {/* Sidebar */}
      <aside className="admin-sidebar">
        <div className="admin-sidebar-logo">
          <div className="admin-sidebar-logo-text">Ap<span>rova</span></div>
          <div className="admin-sidebar-badge">Panel Admin</div>
        </div>
        <nav className="sidebar-nav">
          {user.role === "SUPER_ADMIN" && <>
            <div className="sidebar-nav-label" style={{ color: "#f59e0b" }}>Super Admin</div>
            <Link href="/admin/schools" className="sidebar-link"><span className="sidebar-link-icon">🏫</span> Instituciones</Link>
            <Link href="/admin/products" className="sidebar-link"><span className="sidebar-link-icon">📦</span> Productos</Link>
            <Link href="/admin/licenses" className="sidebar-link"><span className="sidebar-link-icon">🔑</span> Licencias</Link>
          </>}
          <div className="sidebar-nav-label">Gestión</div>
          <Link href="/admin" className="sidebar-link">
            <span className="sidebar-link-icon">📊</span> Dashboard
          </Link>
          <Link href="/admin/users" className="sidebar-link">
            <span className="sidebar-link-icon">👥</span> Usuarios
          </Link>
          <Link href="/admin/courses" className="sidebar-link">
            <span className="sidebar-link-icon">📚</span> Cursos
          </Link>
          <Link href="/admin/enrollments" className="sidebar-link">
            <span className="sidebar-link-icon">📝</span> Inscripciones
          </Link>
          <Link href="/admin/leads" className="sidebar-link active">
            <span className="sidebar-link-icon">📞</span> Leads
          </Link>
          <Link href="/admin/questions" className="sidebar-link">
            <span className="sidebar-link-icon">🧠</span> Preguntas
          </Link>
          <Link href="/admin/simulacros" className="sidebar-link">
            <span className="sidebar-link-icon">📋</span> Simulacros
          </Link>
          <div className="sidebar-nav-label">Contenido</div>
          <Link href="/admin/site-content" className="sidebar-link">
            <span className="sidebar-link-icon">🖼</span> Contenido del sitio
          </Link>
          <Link href="/admin/gallery" className="sidebar-link">
            <span className="sidebar-link-icon">🖼</span> Galería
          </Link>
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

      {/* Main */}
      <div className="admin-main">
        <div className="admin-topbar">
          <div className="admin-topbar-inner">
            <div className="admin-topbar-title">Leads — Solicitudes de inscripción</div>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: "linear-gradient(135deg,#004aad,#0059d1)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontFamily: "var(--font-poppins)", fontWeight: 900, fontSize: "0.85rem" }}>
                {(user.firstName[0] + user.lastName[0]).toUpperCase()}
              </div>
            </div>
          </div>
        </div>

        <div className="admin-content">
          {/* Stats */}
          <div className="sim-stats-row" style={{ marginBottom: "24px" }}>
            <div className="sim-stat-card sim-stat-blue">
              <div className="sim-stat-icon-wrap">📋</div>
              <div className="sim-stat-body">
                <div className="sim-stat-num">{total}</div>
                <div className="sim-stat-label">Total leads</div>
              </div>
            </div>
            <div className="sim-stat-card sim-stat-orange">
              <div className="sim-stat-icon-wrap">⏳</div>
              <div className="sim-stat-body">
                <div className="sim-stat-num">{pendientes.length}</div>
                <div className="sim-stat-label">Pendientes (esta página)</div>
              </div>
            </div>
            <div className="sim-stat-card sim-stat-green">
              <div className="sim-stat-icon-wrap">✅</div>
              <div className="sim-stat-body">
                <div className="sim-stat-num">{contactados.length}</div>
                <div className="sim-stat-label">Contactados (esta página)</div>
              </div>
            </div>
          </div>

          {/* Búsqueda */}
          <div style={{ marginBottom: 16 }}>
            <input
              type="text"
              placeholder="Buscar por nombre, teléfono o programa…"
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              style={{ width: "100%", maxWidth: 400, padding: "10px 14px", border: "1px solid #dde4f0", borderRadius: 10, fontSize: "0.875rem", color: "#1e293b", outline: "none", background: "#fff", boxSizing: "border-box" }}
            />
          </div>

          {fetching && (
            <div className="sim-list-empty">
              <div className="sim-list-empty-icon">⏳</div>
              <div className="sim-list-empty-title">Cargando leads…</div>
            </div>
          )}

          {!fetching && error && (
            <div className="mc-error-banner">⚠️ {error}</div>
          )}

          {!fetching && !error && leads.length === 0 && (
            <div className="sim-list-empty">
              <div className="sim-list-empty-icon">📭</div>
              <div className="sim-list-empty-title">Aún no hay solicitudes</div>
              <div className="sim-list-empty-sub">Cuando alguien se inscriba desde la web aparecerá aquí.</div>
            </div>
          )}

          {!fetching && !error && leads.length > 0 && (
            <div className="leads-table-wrap">
              <table className="leads-table" style={{ marginBottom: 0 }}>
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Teléfono</th>
                    <th>Programa</th>
                    <th>Fecha</th>
                    <th>Estado</th>
                    <th>Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {leads.map((lead) => (
                    <tr key={lead.id} className={lead.isContacted ? "leads-row-done" : ""}>
                      <td className="leads-td-name">{lead.name}</td>
                      <td>
                        <a
                          href={`https://wa.me/57${lead.phone.replace(/\D/g, "")}?text=Hola%20${encodeURIComponent(lead.name)}%2C%20te%20contactamos%20de%20ACAE%20sobre%20el%20programa%20${encodeURIComponent(lead.program)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="leads-phone-link"
                        >
                          📞 {lead.phone}
                        </a>
                      </td>
                      <td>
                        <span className="leads-program-badge">{lead.program}</span>
                      </td>
                      <td className="leads-td-date">
                        {new Date(lead.createdAt).toLocaleDateString("es-CO", {
                          day: "numeric", month: "short", year: "numeric",
                        })}
                      </td>
                      <td>
                        <span className={`leads-status ${lead.isContacted ? "leads-status-done" : "leads-status-pending"}`}>
                          {lead.isContacted ? "✓ Contactado" : "⏳ Pendiente"}
                        </span>
                      </td>
                      <td>
                        {!lead.isContacted && (
                          <button
                            className="leads-btn-contact"
                            onClick={() => markContacted(lead.id)}
                          >
                            Marcar contactado
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <Pagination page={page} pages={pages} total={total} limit={LIMIT} onPageChange={p => setPage(p)} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
