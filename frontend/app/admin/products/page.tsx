"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";

interface ProductRow {
  id: string;
  name: string;
  type: "COURSE" | "SIMULACRO" | "QUESTION_BANK" | "BUNDLE";
  price: number;
  currency: string;
  billingModel: "ONE_TIME" | "SUBSCRIPTION_MONTHLY" | "SUBSCRIPTION_YEARLY";
  isActive: boolean;
  createdAt: string;
  course: { title: string } | null;
  simulacro: { titulo: string } | null;
  _count: { licenses: number };
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
        <Link href="/admin/products" className="sidebar-link active"><span className="sidebar-link-icon">📦</span> Productos</Link>
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

const formatPrice = (v: number, currency: string) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: currency || "COP", maximumFractionDigits: 0 }).format(v);

const billingLabels: Record<string, string> = {
  ONE_TIME: "Pago único",
  SUBSCRIPTION_MONTHLY: "Mensual",
  SUBSCRIPTION_YEARLY: "Anual",
};

const typeStyle: Record<string, { bg: string; color: string }> = {
  COURSE: { bg: "#eff6ff", color: "#004aad" },
  SIMULACRO: { bg: "#f5f3ff", color: "#7c3aed" },
  QUESTION_BANK: { bg: "#f0fdf4", color: "#16a34a" },
  BUNDLE: { bg: "#fff7ed", color: "#c2410c" },
};

export default function AdminProductsPage() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [fetching, setFetching] = useState(true);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) router.replace("/auth/login");
    if (!loading && user && user.role !== "SUPER_ADMIN") router.replace("/admin");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, loading]);

  useEffect(() => {
    if (!user || user.role !== "SUPER_ADMIN") return;
    api.get<ProductRow[]>("/products")
      .then(setProducts)
      .finally(() => setFetching(false));
  }, [user]);

  async function handleToggleActive(product: ProductRow) {
    setTogglingId(product.id);
    try {
      await api.patch(`/products/${product.id}`, { isActive: !product.isActive });
      setProducts(prev =>
        prev.map(p => p.id === product.id ? { ...p, isActive: !p.isActive } : p)
      );
    } catch { /* silencioso */ }
    setTogglingId(null);
  }

  if (loading || !user) return null;

  const total = products.length;
  const activos = products.filter(p => p.isActive).length;
  const countType = (t: string) => products.filter(p => p.type === t).length;

  return (
    <div style={{ minHeight: "100vh", background: "#f0f4ff" }}>
      <AdminSidebar logout={logout} router={router} />

      <main style={{ marginLeft: 260, padding: "32px 36px", minHeight: "100vh", boxSizing: "border-box" }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
          <div>
            <h1 style={{ fontSize: "1.5rem", fontWeight: 800, color: "#1e293b", margin: 0 }}>Productos</h1>
            <p style={{ color: "#64748b", fontSize: "0.875rem", margin: "4px 0 0" }}>
              {total} producto{total !== 1 ? "s" : ""} en total
            </p>
          </div>
          <Link
            href="/admin/products/nuevo"
            style={{ padding: "10px 20px", background: "#004aad", color: "#fff", borderRadius: 12, textDecoration: "none", fontWeight: 700, fontSize: "0.9rem" }}
          >
            + Nuevo producto
          </Link>
        </div>

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 14, marginBottom: 24 }}>
          {[
            { label: "Total", value: total, color: "#004aad" },
            { label: "Activos", value: activos, color: "#16a34a" },
            { label: "Cursos", value: countType("COURSE"), color: "#004aad" },
            { label: "Simulacros", value: countType("SIMULACRO"), color: "#7c3aed" },
            { label: "Banco Preguntas", value: countType("QUESTION_BANK"), color: "#16a34a" },
          ].map(stat => (
            <div key={stat.label} style={{ background: "#fff", borderRadius: 14, border: "1px solid #e2eaf7", boxShadow: "0 2px 8px rgba(0,74,173,0.06)", padding: "16px 20px" }}>
              <div style={{ fontSize: "0.72rem", fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>{stat.label}</div>
              <div style={{ fontSize: "1.6rem", fontWeight: 800, color: stat.color }}>{stat.value}</div>
            </div>
          ))}
        </div>

        {/* Table */}
        <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e2eaf7", boxShadow: "0 2px 8px rgba(0,74,173,0.06)", overflow: "hidden" }}>
          {fetching ? (
            <div style={{ padding: "56px 24px", textAlign: "center", color: "#64748b" }}>⏳ Cargando productos…</div>
          ) : products.length === 0 ? (
            <div style={{ padding: "56px 24px", textAlign: "center", color: "#94a3b8" }}>
              No hay productos.{" "}
              <Link href="/admin/products/nuevo" style={{ color: "#004aad", fontWeight: 600 }}>Crea el primero</Link>
            </div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#f8faff", borderBottom: "1px solid #e2eaf7" }}>
                  {["Nombre", "Tipo", "Precio", "Modelo de pago", "Referencia", "Lic. activas", "Estado", "Acciones"].map(h => (
                    <th key={h} style={{ padding: "14px 16px", textAlign: "left", fontSize: "0.78rem", fontWeight: 700, color: "#475569", whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {products.map((p, idx) => {
                  const ts = typeStyle[p.type] ?? { bg: "#f1f5f9", color: "#64748b" };
                  const ref = p.course?.title ?? p.simulacro?.titulo ?? null;
                  return (
                    <tr
                      key={p.id}
                      style={{ borderBottom: idx < products.length - 1 ? "1px solid #f1f5f9" : "none", transition: "background 0.15s" }}
                      onMouseEnter={e => (e.currentTarget.style.background = "#f8faff")}
                      onMouseLeave={e => (e.currentTarget.style.background = "")}
                    >
                      <td style={{ padding: "14px 16px" }}>
                        <div style={{ fontWeight: 600, color: "#1e293b", fontSize: "0.875rem" }}>{p.name}</div>
                      </td>
                      <td style={{ padding: "14px 16px" }}>
                        <span style={{ display: "inline-block", padding: "3px 10px", borderRadius: 20, fontSize: "0.73rem", fontWeight: 700, background: ts.bg, color: ts.color }}>
                          {p.type}
                        </span>
                      </td>
                      <td style={{ padding: "14px 16px", fontSize: "0.85rem", color: "#1e293b", fontWeight: 600, whiteSpace: "nowrap" }}>
                        {formatPrice(p.price, p.currency)}
                      </td>
                      <td style={{ padding: "14px 16px", fontSize: "0.82rem", color: "#475569" }}>
                        {billingLabels[p.billingModel] ?? p.billingModel}
                      </td>
                      <td style={{ padding: "14px 16px", fontSize: "0.82rem", color: "#475569" }}>
                        {ref || <span style={{ color: "#cbd5e1" }}>—</span>}
                      </td>
                      <td style={{ padding: "14px 16px", fontSize: "0.85rem", color: "#475569", textAlign: "center" }}>
                        {p._count.licenses}
                      </td>
                      <td style={{ padding: "14px 16px" }}>
                        <span style={{
                          display: "inline-block",
                          padding: "3px 10px",
                          borderRadius: 20,
                          fontSize: "0.75rem",
                          fontWeight: 600,
                          background: p.isActive ? "#dcfce7" : "#f1f5f9",
                          color: p.isActive ? "#16a34a" : "#64748b",
                        }}>
                          {p.isActive ? "● Activo" : "○ Inactivo"}
                        </span>
                      </td>
                      <td style={{ padding: "14px 16px" }}>
                        <div style={{ display: "flex", gap: 6 }}>
                          <Link
                            href={`/admin/products/${p.id}`}
                            style={{ padding: "6px 12px", background: "#eff6ff", color: "#004aad", border: "1px solid #bfdbfe", borderRadius: 8, fontSize: "0.78rem", fontWeight: 600, textDecoration: "none" }}
                          >
                            Editar
                          </Link>
                          <button
                            onClick={() => handleToggleActive(p)}
                            disabled={togglingId === p.id}
                            style={{ padding: "6px 12px", background: p.isActive ? "#fff7ed" : "#f0fdf4", color: p.isActive ? "#c2410c" : "#16a34a", border: `1px solid ${p.isActive ? "#fed7aa" : "#bbf7d0"}`, borderRadius: 8, fontSize: "0.78rem", fontWeight: 600, cursor: "pointer" }}
                          >
                            {togglingId === p.id ? "..." : p.isActive ? "Desactivar" : "Activar"}
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
