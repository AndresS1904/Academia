"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";

interface License {
  id: string;
  status: "ACTIVE" | "EXPIRED" | "CANCELLED";
  startsAt: string;
  endsAt: string | null;
  pricePaid: number | null;
  currency: string;
  paymentRef: string | null;
  notes: string | null;
  product: { name: string; type: string };
  grantedBy: { firstName: string; lastName: string } | null;
}

interface SchoolDetail {
  id: string;
  name: string;
  slug: string;
  nit: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  isActive: boolean;
  createdAt: string;
  _count: { users: number; licenses: number; courses: number };
  licenses: License[];
}

interface Product {
  id: string;
  name: string;
  type: string;
  isActive: boolean;
}

function AdminSidebar({ logout, router, schoolSlug }: { logout: () => void; router: ReturnType<typeof useRouter>; schoolSlug?: string }) {
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

const formatPrice = (v: number | null) =>
  v == null ? "—" : new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(v);

const formatDate = (d: string | null) =>
  d ? new Date(d).toLocaleDateString("es-CO", { day: "numeric", month: "short", year: "numeric" }) : "Perpetua";

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "9px 13px",
  borderRadius: 10,
  border: "1px solid #e2eaf7",
  fontSize: "0.875rem",
  outline: "none",
  boxSizing: "border-box",
  background: "#fff",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "0.8rem",
  fontWeight: 600,
  color: "#475569",
  marginBottom: 5,
};

export default function SchoolDetailPage() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;

  const [school, setSchool] = useState<SchoolDetail | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [fetching, setFetching] = useState(true);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  const [assignForm, setAssignForm] = useState({
    productId: "",
    startsAt: new Date().toISOString().slice(0, 10),
    endsAt: "",
    pricePaid: "",
    paymentRef: "",
    notes: "",
  });
  const [assigning, setAssigning] = useState(false);
  const [assignError, setAssignError] = useState("");
  const [assignSuccess, setAssignSuccess] = useState("");

  useEffect(() => {
    if (!loading && !user) router.replace("/auth/login");
    if (!loading && user && user.role !== "SUPER_ADMIN") router.replace("/admin");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, loading]);

  useEffect(() => {
    if (!user || user.role !== "SUPER_ADMIN" || !id) return;
    Promise.all([
      api.get<SchoolDetail>(`/schools/${id}`),
      api.get<Product[]>("/products"),
    ]).then(([s, p]) => {
      setSchool(s);
      setProducts(p.filter(prod => prod.isActive));
    }).finally(() => setFetching(false));
  }, [user, id]);

  async function handleRevoke(licenseId: string) {
    if (!confirm("¿Revocar esta licencia? Esta acción no se puede deshacer.")) return;
    setRevokingId(licenseId);
    try {
      await api.patch(`/licenses/${licenseId}/revoke`, {});
      setSchool(prev => prev ? {
        ...prev,
        licenses: prev.licenses.map(l => l.id === licenseId ? { ...l, status: "CANCELLED" as const } : l),
      } : prev);
    } catch { /* silencioso */ }
    setRevokingId(null);
  }

  async function handleAssign(e: React.FormEvent) {
    e.preventDefault();
    if (!assignForm.productId) { setAssignError("Selecciona un producto."); return; }
    setAssigning(true);
    setAssignError("");
    setAssignSuccess("");
    try {
      const newLicense = await api.post<License>("/licenses", {
        schoolId: id,
        productId: assignForm.productId,
        startsAt: assignForm.startsAt,
        endsAt: assignForm.endsAt || null,
        pricePaid: assignForm.pricePaid ? parseFloat(assignForm.pricePaid) : null,
        paymentRef: assignForm.paymentRef || null,
        notes: assignForm.notes || null,
      });
      setSchool(prev => prev ? { ...prev, licenses: [newLicense, ...prev.licenses] } : prev);
      setAssignForm({ productId: "", startsAt: new Date().toISOString().slice(0, 10), endsAt: "", pricePaid: "", paymentRef: "", notes: "" });
      setAssignSuccess("Licencia asignada correctamente.");
    } catch (e: any) {
      setAssignError(e.message ?? "Error al asignar la licencia.");
    } finally {
      setAssigning(false);
    }
  }

  if (loading || !user) return null;

  const statusColors: Record<string, { bg: string; color: string; label: string }> = {
    ACTIVE: { bg: "#dcfce7", color: "#16a34a", label: "Activa" },
    EXPIRED: { bg: "#fef2f2", color: "#dc2626", label: "Expirada" },
    CANCELLED: { bg: "#f1f5f9", color: "#64748b", label: "Cancelada" },
  };

  return (
    <div style={{ minHeight: "100vh", background: "#f0f4ff" }}>
      <AdminSidebar logout={logout} router={router} schoolSlug={school?.slug} />

      <main style={{ marginLeft: 260, padding: "32px 36px", minHeight: "100vh", boxSizing: "border-box" }}>
        {fetching ? (
          <div style={{ padding: "80px 0", textAlign: "center", color: "#64748b" }}>⏳ Cargando…</div>
        ) : !school ? (
          <div style={{ padding: "80px 0", textAlign: "center", color: "#94a3b8" }}>Institución no encontrada.</div>
        ) : (
          <>
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28 }}>
              <div>
                <Link
                  href="/admin/schools"
                  style={{ fontSize: "0.875rem", color: "#64748b", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4, marginBottom: 8 }}
                >
                  ← Volver a instituciones
                </Link>
                <h1 style={{ fontSize: "1.5rem", fontWeight: 800, color: "#1e293b", margin: 0 }}>{school.name}</h1>
              </div>
              <Link
                href={`/admin/schools/${id}/pagina`}
                style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "10px 20px", background: "#004aad", color: "#fff", borderRadius: 10, textDecoration: "none", fontWeight: 700, fontSize: "0.875rem", boxShadow: "0 4px 14px rgba(0,74,173,0.25)" }}
              >
                🌐 Editar página pública
              </Link>
            </div>

            {/* Info card */}
            <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e2eaf7", boxShadow: "0 2px 8px rgba(0,74,173,0.06)", padding: "24px 28px", marginBottom: 24 }}>
              <h2 style={{ fontSize: "0.95rem", fontWeight: 700, color: "#1e293b", margin: "0 0 16px" }}>Información de la institución</h2>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px 24px" }}>
                {[
                  { label: "Slug", value: school.slug },
                  { label: "NIT", value: school.nit },
                  { label: "Email", value: school.email },
                  { label: "Teléfono", value: school.phone },
                  { label: "Dirección", value: school.address },
                  { label: "Registrado", value: formatDate(school.createdAt) },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.04em" }}>{label}</div>
                    <div style={{ fontSize: "0.9rem", color: "#1e293b", marginTop: 2 }}>{value || <span style={{ color: "#cbd5e1" }}>—</span>}</div>
                  </div>
                ))}
                <div>
                  <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.04em" }}>Estado</div>
                  <span style={{
                    display: "inline-block",
                    marginTop: 4,
                    padding: "3px 10px",
                    borderRadius: 20,
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    background: school.isActive ? "#dcfce7" : "#f1f5f9",
                    color: school.isActive ? "#16a34a" : "#64748b",
                  }}>
                    {school.isActive ? "● Activo" : "○ Inactivo"}
                  </span>
                </div>
              </div>
            </div>

            {/* Stats row */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 24 }}>
              {[
                { label: "Usuarios", value: school._count.users, color: "#004aad" },
                { label: "Licencias activas", value: school.licenses.filter(l => l.status === "ACTIVE").length, color: "#16a34a" },
                { label: "Cursos", value: school._count.courses, color: "#7c3aed" },
              ].map(stat => (
                <div key={stat.label} style={{ background: "#fff", borderRadius: 16, border: "1px solid #e2eaf7", boxShadow: "0 2px 8px rgba(0,74,173,0.06)", padding: "20px 24px" }}>
                  <div style={{ fontSize: "0.78rem", fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>{stat.label}</div>
                  <div style={{ fontSize: "1.8rem", fontWeight: 800, color: stat.color }}>{stat.value}</div>
                </div>
              ))}
            </div>

            {/* Licenses table */}
            <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e2eaf7", boxShadow: "0 2px 8px rgba(0,74,173,0.06)", overflow: "hidden", marginBottom: 28 }}>
              <div style={{ padding: "18px 24px", borderBottom: "1px solid #f1f5f9" }}>
                <h2 style={{ fontSize: "0.95rem", fontWeight: 700, color: "#1e293b", margin: 0 }}>Licencias activas</h2>
              </div>
              {school.licenses.length === 0 ? (
                <div style={{ padding: "40px 24px", textAlign: "center", color: "#94a3b8" }}>No hay licencias asignadas.</div>
              ) : (
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: "#f8faff", borderBottom: "1px solid #e2eaf7" }}>
                      {["Producto", "Tipo", "Precio pagado", "Inicio", "Vencimiento", "Estado", "Acciones"].map(h => (
                        <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontSize: "0.78rem", fontWeight: 700, color: "#475569", whiteSpace: "nowrap" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {school.licenses.map((lic, idx) => {
                      const sc = statusColors[lic.status] ?? statusColors.CANCELLED;
                      const isExpiredDate = lic.endsAt && new Date(lic.endsAt) < new Date();
                      return (
                        <tr
                          key={lic.id}
                          style={{ borderBottom: idx < school.licenses.length - 1 ? "1px solid #f1f5f9" : "none", transition: "background 0.15s" }}
                          onMouseEnter={e => (e.currentTarget.style.background = "#f8faff")}
                          onMouseLeave={e => (e.currentTarget.style.background = "")}
                        >
                          <td style={{ padding: "12px 16px", fontSize: "0.875rem", fontWeight: 600, color: "#1e293b" }}>{lic.product.name}</td>
                          <td style={{ padding: "12px 16px", fontSize: "0.8rem", color: "#475569" }}>{lic.product.type}</td>
                          <td style={{ padding: "12px 16px", fontSize: "0.85rem", color: "#475569" }}>{formatPrice(lic.pricePaid)}</td>
                          <td style={{ padding: "12px 16px", fontSize: "0.8rem", color: "#64748b" }}>{formatDate(lic.startsAt)}</td>
                          <td style={{ padding: "12px 16px", fontSize: "0.8rem", color: isExpiredDate ? "#dc2626" : "#64748b" }}>
                            {lic.endsAt ? formatDate(lic.endsAt) : "Perpetua"}
                          </td>
                          <td style={{ padding: "12px 16px" }}>
                            <span style={{ display: "inline-block", padding: "3px 10px", borderRadius: 20, fontSize: "0.75rem", fontWeight: 600, background: sc.bg, color: sc.color }}>
                              {sc.label}
                            </span>
                          </td>
                          <td style={{ padding: "12px 16px" }}>
                            {lic.status === "ACTIVE" && (
                              <button
                                onClick={() => handleRevoke(lic.id)}
                                disabled={revokingId === lic.id}
                                style={{ padding: "6px 12px", background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca", borderRadius: 8, fontSize: "0.78rem", fontWeight: 600, cursor: "pointer" }}
                              >
                                {revokingId === lic.id ? "..." : "Revocar"}
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

            {/* Assign license form */}
            <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e2eaf7", boxShadow: "0 2px 8px rgba(0,74,173,0.06)", padding: "24px 28px" }}>
              <h2 style={{ fontSize: "0.95rem", fontWeight: 700, color: "#1e293b", margin: "0 0 20px" }}>Asignar nueva licencia</h2>

              {assignError && (
                <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, padding: "10px 14px", marginBottom: 16, color: "#dc2626", fontSize: "0.875rem" }}>
                  {assignError}
                </div>
              )}
              {assignSuccess && (
                <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 10, padding: "10px 14px", marginBottom: 16, color: "#16a34a", fontSize: "0.875rem" }}>
                  {assignSuccess}
                </div>
              )}

              <form onSubmit={handleAssign}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                  <div style={{ gridColumn: "1 / -1" }}>
                    <label style={labelStyle}>Producto <span style={{ color: "#dc2626" }}>*</span></label>
                    <select
                      value={assignForm.productId}
                      onChange={e => setAssignForm(prev => ({ ...prev, productId: e.target.value }))}
                      required
                      style={{ ...inputStyle }}
                    >
                      <option value="">— Selecciona un producto —</option>
                      {products.map(p => (
                        <option key={p.id} value={p.id}>{p.name} ({p.type})</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={labelStyle}>Fecha de inicio</label>
                    <input
                      type="date"
                      value={assignForm.startsAt}
                      onChange={e => setAssignForm(prev => ({ ...prev, startsAt: e.target.value }))}
                      style={inputStyle}
                    />
                  </div>

                  <div>
                    <label style={labelStyle}>Fecha de vencimiento <span style={{ fontSize: "0.75rem", color: "#94a3b8" }}>(vacío = perpetua)</span></label>
                    <input
                      type="date"
                      value={assignForm.endsAt}
                      onChange={e => setAssignForm(prev => ({ ...prev, endsAt: e.target.value }))}
                      style={inputStyle}
                    />
                  </div>

                  <div>
                    <label style={labelStyle}>Precio pagado (COP)</label>
                    <input
                      type="number"
                      min={0}
                      value={assignForm.pricePaid}
                      onChange={e => setAssignForm(prev => ({ ...prev, pricePaid: e.target.value }))}
                      placeholder="0"
                      style={inputStyle}
                    />
                  </div>

                  <div>
                    <label style={labelStyle}>Referencia de pago</label>
                    <input
                      type="text"
                      value={assignForm.paymentRef}
                      onChange={e => setAssignForm(prev => ({ ...prev, paymentRef: e.target.value }))}
                      placeholder="Ej: TXN-001"
                      style={inputStyle}
                    />
                  </div>

                  <div style={{ gridColumn: "1 / -1" }}>
                    <label style={labelStyle}>Notas</label>
                    <textarea
                      value={assignForm.notes}
                      onChange={e => setAssignForm(prev => ({ ...prev, notes: e.target.value }))}
                      placeholder="Observaciones sobre esta licencia…"
                      rows={3}
                      style={{ ...inputStyle, resize: "vertical" }}
                    />
                  </div>
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
                  <button
                    type="submit"
                    disabled={assigning}
                    style={{ padding: "10px 24px", background: "#004aad", color: "#fff", border: "none", borderRadius: 10, fontWeight: 700, fontSize: "0.9rem", cursor: assigning ? "not-allowed" : "pointer", opacity: assigning ? 0.7 : 1 }}
                  >
                    {assigning ? "Asignando…" : "Asignar licencia"}
                  </button>
                </div>
              </form>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
