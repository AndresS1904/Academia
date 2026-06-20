"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { Pagination } from "@/components/admin/Pagination";

interface UserRow {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: "ADMIN";
  isActive: boolean;
  mustChangePassword?: boolean;
  createdAt: string;
  school?: { id: string; name: string; slug: string } | null;
}

interface CreateUserForm {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role: "ADMIN" | "ESTUDIANTE";
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
        <Link href="/admin/users" className="sidebar-link active"><span className="sidebar-link-icon">👥</span> Usuarios</Link>
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

const LIMIT = 25;
interface PagedUsers { data: UserRow[]; total: number; page: number; pages: number }

export default function AdminUsersPage() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();

  const [users, setUsers] = useState<UserRow[]>([]);
  const [fetching, setFetching] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);

  // filtros
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [filterDate, setFilterDate] = useState("");
  const [filterRole, setFilterRole] = useState<"" | "ADMIN" | "ESTUDIANTE">("");

  // modal crear
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState<CreateUserForm>({
    firstName: "", lastName: "", email: "", password: "", role: "ESTUDIANTE",
  });
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState("");

  // feedback inline
  const [actionMsg, setActionMsg] = useState<{ id: string; msg: string } | null>(null);

  useEffect(() => {
    if (!loading && !user) router.replace("/auth/login");
    if (!loading && user && user.role !== "ADMIN" && user.role !== "SUPER_ADMIN") router.replace("/dashboard");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, loading]);

  const fetchData = useCallback((p: number, q: string) => {
    if (!user || (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN")) return;
    setFetching(true);
    const params = new URLSearchParams({ page: String(p), limit: String(LIMIT), ...(q && { search: q }) });
    api.get<PagedUsers>(`/users?${params}`)
      .then(res => { setUsers(res.data); setTotal(res.total); setPages(res.pages); })
      .finally(() => setFetching(false));
  }, [user]);

  useEffect(() => { fetchData(page, search); }, [fetchData, page, search]);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => { setPage(1); setSearch(searchInput); }, 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  // Filtrado local solo por fecha (campo que no va al backend)
  const filtered = useMemo(() => {
    if (!filterDate) return users;
    return users.filter(u => new Date(u.createdAt).toLocaleDateString("en-CA") === filterDate);
  }, [users, filterDate]);

  /* ── stats ── */
  const activos = users.filter((u) => u.isActive).length;
  const conInstitucion = users.filter((u) => u.school).length;

  /* ── acciones ── */
  async function toggleStatus(u: UserRow) {
    try {
      await api.patch(`/users/${u.id}/status`, { isActive: !u.isActive });
      setUsers((prev) => prev.map((x) => x.id === u.id ? { ...x, isActive: !u.isActive } : x));
    } catch { /* silencioso */ }
  }

  async function requestPasswordChange(u: UserRow) {
    try {
      await api.patch(`/users/${u.id}/request-password-change`, {});
      setUsers((prev) => prev.map((x) => x.id === u.id ? { ...x, mustChangePassword: true } : x));
      setActionMsg({ id: u.id, msg: "Se solicitó cambio de contraseña." });
      setTimeout(() => setActionMsg(null), 3000);
    } catch { /* silencioso */ }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreateError("");
    if (!createForm.firstName || !createForm.lastName || !createForm.email || !createForm.password) {
      setCreateError("Completa todos los campos obligatorios.");
      return;
    }
    if (createForm.password.length < 6) {
      setCreateError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }
    setCreateLoading(true);
    try {
      const newUser = await api.post<UserRow>("/users", createForm);
      setUsers((prev) => [newUser, ...prev]);
      setShowCreate(false);
      setCreateForm({ firstName: "", lastName: "", email: "", password: "", role: "ESTUDIANTE" });
    } catch (err: unknown) {
      setCreateError(err instanceof Error ? err.message : "Error al crear el usuario.");
    } finally {
      setCreateLoading(false);
    }
  }

  function clearFilters() {
    setSearchInput("");
    setSearch("");
    setFilterDate("");
    setFilterRole("");
    setPage(1);
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

  return (
    <div className="admin-layout">
      <AdminSidebar logout={logout} router={router} isSuperAdmin={user.role === "SUPER_ADMIN"} />

      {/* Topbar */}
      <div className="admin-topbar">
        <div className="admin-topbar-inner">
          <div className="admin-topbar-title">Administradores de instituciones</div>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: "linear-gradient(135deg,#004aad,#0059d1)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontFamily: "var(--font-poppins)", fontWeight: 900, fontSize: "0.85rem" }}>
              {(user.firstName[0] + user.lastName[0]).toUpperCase()}
            </div>
            <div>
              <div style={{ fontFamily: "var(--font-poppins)", fontSize: "0.85rem", fontWeight: 800, color: "#004aad" }}>{user.firstName} {user.lastName}</div>
              <div style={{ fontSize: "0.72rem", color: "#94a3b8", fontWeight: 700 }}>Administrador</div>
            </div>
          </div>
        </div>
      </div>

      <main className="admin-main" style={{ marginLeft: "260px", paddingTop: "68px", minHeight: "100vh", background: "#f0f4ff", width: "calc(100% - 260px)", boxSizing: "border-box" }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "36px 48px 56px", width: "100%", boxSizing: "border-box" }}>

          {/* ── Stats ── */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "16px", marginBottom: "24px" }}>
            {[
              { num: total,           label: "Total administradores", color: "#004aad", bg: "#dbeafe" },
              { num: activos,         label: "Activos",               color: "#059669", bg: "#d1fae5" },
              { num: conInstitucion,  label: "Con institución",        color: "#7c3aed", bg: "#ede9fe" },
            ].map((s) => (
              <div key={s.label} style={{ background: "#fff", borderRadius: "16px", padding: "20px 24px", border: "1px solid #e2eaf7", boxShadow: "0 2px 8px rgba(0,74,173,0.06)" }}>
                <div style={{ fontFamily: "var(--font-poppins)", fontSize: "2rem", fontWeight: 900, color: s.color, lineHeight: 1, marginBottom: "6px" }}>{s.num}</div>
                <div style={{ fontSize: "0.8rem", color: "#64748b", fontWeight: 600 }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* ── Toolbar ── */}
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px", flexWrap: "wrap" }}>
            <div style={{ display: "flex", gap: "10px", flex: 1, flexWrap: "wrap" }}>
              <input type="text" placeholder="Buscar por nombre o correo…" value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                style={{ height: "40px", padding: "0 14px", border: "1px solid #dde4f0", borderRadius: "10px", fontSize: "0.875rem", color: "#1e293b", background: "#fff", outline: "none", minWidth: "220px" }}
              />
              <input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)}
                style={{ height: "40px", padding: "0 14px", border: "1px solid #dde4f0", borderRadius: "10px", fontSize: "0.875rem", color: "#1e293b", background: "#fff", outline: "none", minWidth: "150px" }}
              />
              {(searchInput || filterDate) && (
                <button onClick={clearFilters} style={{ height: "40px", padding: "0 16px", border: "1px solid #e2eaf7", borderRadius: "10px", fontSize: "0.82rem", fontWeight: 600, color: "#64748b", background: "#f8fafc", cursor: "pointer" }}>✕ Limpiar</button>
              )}
            </div>
            <button onClick={() => setShowCreate(true)}
              style={{ height: "40px", padding: "0 22px", background: "#004aad", color: "#fff", border: "none", borderRadius: "10px", fontFamily: "var(--font-poppins)", fontSize: "0.875rem", fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap", boxShadow: "0 4px 14px rgba(0,74,173,0.22)" }}
            >
              + Nuevo usuario
            </button>
          </div>

          {/* ── Tabla ── */}
          <div style={{ background: "#fff", borderRadius: "16px", border: "1px solid #e2eaf7", boxShadow: "0 2px 8px rgba(0,74,173,0.06)", overflow: "hidden" }}>
            {fetching ? (
              <div style={{ padding: "56px 24px", textAlign: "center", color: "#64748b" }}>⏳ Cargando usuarios…</div>
            ) : filtered.length === 0 ? (
              <div style={{ padding: "56px 24px", textAlign: "center", color: "#64748b" }}>
                <div style={{ fontSize: "2.5rem", marginBottom: "12px" }}>🔍</div>
                <div style={{ fontWeight: 600 }}>Sin resultados para los filtros aplicados.</div>
              </div>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    {["Nombre","Correo","Institución","Registrado","Estado","Acciones"].map((h) => (
                      <th key={h} style={{ background: "#f8fafc", padding: "13px 18px", textAlign: "left", fontSize: "0.75rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: "1px solid #e2eaf7" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((u) => (
                    <tr key={u.id} style={{ opacity: !u.isActive ? 0.5 : 1 }}>
                      <td style={{ padding: "14px 18px", borderBottom: "1px solid #f1f5f9", verticalAlign: "middle" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                          <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: "linear-gradient(135deg,#004aad,#0059d1)", color: "#fff", fontFamily: "var(--font-poppins)", fontWeight: 800, fontSize: "0.8rem", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                            {u.firstName[0]}{u.lastName[0]}
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: "0.875rem", color: "#0f172a" }}>{u.firstName} {u.lastName}</div>
                            {u.mustChangePassword && (
                              <span style={{ display: "inline-block", marginTop: "3px", padding: "2px 8px", background: "#fef3c7", color: "#92400e", borderRadius: "20px", fontSize: "0.7rem", fontWeight: 700 }}>Requiere cambio de clave</span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: "14px 18px", borderBottom: "1px solid #f1f5f9", color: "#475569", fontSize: "0.83rem", verticalAlign: "middle" }}>{u.email}</td>
                      <td style={{ padding: "14px 18px", borderBottom: "1px solid #f1f5f9", verticalAlign: "middle" }}>
                        {u.school ? (
                          <Link href={`/admin/schools/${u.school.id}`} style={{ textDecoration: "none" }}>
                            <span style={{ padding: "3px 10px", borderRadius: "20px", fontSize: "0.78rem", fontWeight: 700, background: "#e0f2fe", color: "#0284c7", cursor: "pointer" }}>
                              🏫 {u.school.name}
                            </span>
                          </Link>
                        ) : (
                          <span style={{ color: "#cbd5e1", fontSize: "0.8rem" }}>Sin institución</span>
                        )}
                      </td>
                      <td style={{ padding: "14px 18px", borderBottom: "1px solid #f1f5f9", color: "#64748b", fontSize: "0.83rem", whiteSpace: "nowrap", verticalAlign: "middle" }}>
                        {new Date(u.createdAt).toLocaleDateString("es-CO", { day: "numeric", month: "short", year: "numeric" })}
                      </td>
                      <td style={{ padding: "14px 18px", borderBottom: "1px solid #f1f5f9", verticalAlign: "middle" }}>
                        <span style={{ fontSize: "0.8rem", fontWeight: 700, color: u.isActive ? "#059669" : "#94a3b8" }}>
                          {u.isActive ? "● Activo" : "● Inactivo"}
                        </span>
                      </td>
                      <td style={{ padding: "14px 18px", borderBottom: "1px solid #f1f5f9", verticalAlign: "middle" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                          <button
                            onClick={() => toggleStatus(u)}
                            disabled={u.id === user.id}
                            style={{ padding: "5px 12px", borderRadius: "8px", border: "none", fontSize: "0.78rem", fontWeight: 700, cursor: u.id === user.id ? "not-allowed" : "pointer", opacity: u.id === user.id ? 0.35 : 1, background: u.isActive ? "#fee2e2" : "#d1fae5", color: u.isActive ? "#dc2626" : "#059669" }}
                          >
                            {u.isActive ? "Desactivar" : "Activar"}
                          </button>
                          <button
                            onClick={() => requestPasswordChange(u)}
                            disabled={u.mustChangePassword}
                            style={{ padding: "5px 12px", borderRadius: "8px", border: "none", fontSize: "0.78rem", fontWeight: 700, cursor: u.mustChangePassword ? "default" : "pointer", opacity: u.mustChangePassword ? 0.5 : 1, background: "#fef3c7", color: "#92400e" }}
                          >
                            {u.mustChangePassword ? "Clave pendiente" : "Pedir cambio clave"}
                          </button>
                          {actionMsg?.id === u.id && (
                            <span style={{ fontSize: "0.78rem", color: "#059669", fontWeight: 600 }}>{actionMsg.msg}</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {!fetching && filtered.length > 0 && (
              <Pagination page={page} pages={pages} total={total} limit={LIMIT} onPageChange={p => setPage(p)} />
            )}
          </div>

        </div>
      </main>

      {/* ── Modal crear usuario ── */}
      {showCreate && (
        <div onClick={() => setShowCreate(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, backdropFilter: "blur(4px)" }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: "20px", width: "100%", maxWidth: "520px", padding: "32px", boxShadow: "0 24px 60px rgba(0,0,0,0.18)", margin: "0 16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
              <div style={{ fontFamily: "var(--font-poppins)", fontSize: "1.15rem", fontWeight: 800, color: "#0f172a" }}>Crear nuevo usuario</div>
              <button onClick={() => setShowCreate(false)} style={{ width: "32px", height: "32px", borderRadius: "50%", border: "none", background: "#f1f5f9", color: "#64748b", cursor: "pointer", fontSize: "0.85rem" }}>✕</button>
            </div>

            <form onSubmit={handleCreate} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                {[
                  { label: "Nombre *", ph: "Ej: Juan",   key: "firstName" as const, type: "text" },
                  { label: "Apellido *", ph: "Ej: García", key: "lastName"  as const, type: "text" },
                ].map((f) => (
                  <div key={f.key} style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    <label style={{ fontSize: "0.82rem", fontWeight: 700, color: "#374151" }}>{f.label}</label>
                    <input type={f.type} placeholder={f.ph} value={createForm[f.key]}
                      onChange={(e) => setCreateForm((p) => ({ ...p, [f.key]: e.target.value }))}
                      style={{ height: "42px", padding: "0 14px", border: "1px solid #dde4f0", borderRadius: "10px", fontSize: "0.875rem", color: "#1e293b", outline: "none" }}
                    />
                  </div>
                ))}
              </div>

              {[
                { label: "Correo electrónico *", ph: "correo@ejemplo.com", key: "email" as const,    type: "email" },
                { label: "Contraseña temporal *", ph: "Mínimo 6 caracteres", key: "password" as const, type: "text"  },
              ].map((f) => (
                <div key={f.key} style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <label style={{ fontSize: "0.82rem", fontWeight: 700, color: "#374151" }}>{f.label}</label>
                  <input type={f.type} placeholder={f.ph} value={createForm[f.key]}
                    onChange={(e) => setCreateForm((p) => ({ ...p, [f.key]: e.target.value }))}
                    style={{ height: "42px", padding: "0 14px", border: "1px solid #dde4f0", borderRadius: "10px", fontSize: "0.875rem", color: "#1e293b", outline: "none" }}
                  />
                  {f.key === "password" && <div style={{ fontSize: "0.75rem", color: "#94a3b8" }}>El usuario deberá cambiarla al iniciar sesión por primera vez.</div>}
                </div>
              ))}

              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <label style={{ fontSize: "0.82rem", fontWeight: 700, color: "#374151" }}>Rol</label>
                <select value={createForm.role} onChange={(e) => setCreateForm((p) => ({ ...p, role: e.target.value as "ADMIN" | "ESTUDIANTE" }))}
                  style={{ height: "42px", padding: "0 14px", border: "1px solid #dde4f0", borderRadius: "10px", fontSize: "0.875rem", color: "#1e293b", background: "#fff", outline: "none", cursor: "pointer" }}
                >
                  <option value="ESTUDIANTE">Estudiante</option>
                  <option value="ADMIN">Administrador</option>
                </select>
              </div>

              {createError && (
                <div style={{ padding: "10px 14px", background: "#fee2e2", color: "#dc2626", borderRadius: "10px", fontSize: "0.82rem", fontWeight: 600 }}>⚠ {createError}</div>
              )}

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "8px" }}>
                <button type="button" onClick={() => setShowCreate(false)}
                  style={{ height: "42px", padding: "0 20px", border: "1px solid #e2eaf7", borderRadius: "10px", fontWeight: 600, fontSize: "0.875rem", color: "#64748b", background: "#f8fafc", cursor: "pointer" }}
                >Cancelar</button>
                <button type="submit" disabled={createLoading}
                  style={{ height: "42px", padding: "0 24px", background: "#004aad", color: "#fff", border: "none", borderRadius: "10px", fontFamily: "var(--font-poppins)", fontSize: "0.875rem", fontWeight: 700, cursor: "pointer", opacity: createLoading ? 0.6 : 1 }}
                >{createLoading ? "Creando…" : "Crear usuario"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
