"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";

interface CourseOption {
  id: string;
  title: string;
}

interface SimulacroOption {
  id: string;
  titulo: string;
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

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 14px",
  borderRadius: 10,
  border: "1px solid #e2eaf7",
  fontSize: "0.9rem",
  outline: "none",
  boxSizing: "border-box",
  background: "#fff",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "0.82rem",
  fontWeight: 600,
  color: "#475569",
  marginBottom: 6,
};

export default function NuevoProductoPage() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();

  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [simulacros, setSimulacros] = useState<SimulacroOption[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    name: "",
    description: "",
    type: "COURSE" as "COURSE" | "SIMULACRO" | "QUESTION_BANK" | "BUNDLE",
    price: "",
    currency: "COP",
    billingModel: "ONE_TIME" as "ONE_TIME" | "SUBSCRIPTION_MONTHLY" | "SUBSCRIPTION_YEARLY",
    courseId: "",
    simulacroId: "",
  });

  useEffect(() => {
    if (!loading && !user) router.replace("/auth/login");
    if (!loading && user && user.role !== "SUPER_ADMIN") router.replace("/admin");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, loading]);

  useEffect(() => {
    if (!user || user.role !== "SUPER_ADMIN") return;
    api.get<CourseOption[]>("/courses/admin/all").then(setCourses).catch(() => {});
    api.get<SimulacroOption[]>("/simulacros/admin/all").then(setSimulacros).catch(() => {});
  }, [user]);

  function set(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) { setError("El nombre es obligatorio."); return; }
    if (!form.price || parseFloat(form.price) < 0) { setError("El precio es obligatorio y debe ser 0 o mayor."); return; }
    setSaving(true);
    setError("");
    try {
      const body: Record<string, unknown> = {
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        type: form.type,
        price: parseFloat(form.price),
        currency: form.currency.trim() || "COP",
        billingModel: form.billingModel,
      };
      if (form.type === "COURSE" && form.courseId) body.courseId = form.courseId;
      if (form.type === "SIMULACRO" && form.simulacroId) body.simulacroId = form.simulacroId;
      await api.post("/products", body);
      router.push("/admin/products");
    } catch (e: any) {
      setError(e.message ?? "Error al crear el producto.");
    } finally {
      setSaving(false);
    }
  }

  if (loading || !user) return null;

  return (
    <div style={{ minHeight: "100vh", background: "#f0f4ff" }}>
      <AdminSidebar logout={logout} router={router} />

      <main style={{ marginLeft: 260, padding: "32px 36px", minHeight: "100vh", boxSizing: "border-box" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 28 }}>
          <Link
            href="/admin/products"
            style={{ fontSize: "0.875rem", color: "#64748b", textDecoration: "none" }}
          >
            ← Volver a productos
          </Link>
        </div>

        <div style={{ maxWidth: 620, margin: "0 auto" }}>
          <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e2eaf7", boxShadow: "0 2px 8px rgba(0,74,173,0.06)", padding: "36px 40px" }}>
            <h1 style={{ fontSize: "1.3rem", fontWeight: 800, color: "#1e293b", margin: "0 0 6px" }}>Nuevo producto</h1>
            <p style={{ color: "#64748b", fontSize: "0.875rem", margin: "0 0 28px" }}>Define el producto que podrán adquirir los colegios.</p>

            {error && (
              <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, padding: "12px 16px", marginBottom: 20, color: "#dc2626", fontSize: "0.875rem" }}>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>

                <div>
                  <label style={labelStyle}>Nombre <span style={{ color: "#dc2626" }}>*</span></label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={e => set("name", e.target.value)}
                    placeholder="Ej: Acceso Simulacro Matemáticas"
                    required
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label style={labelStyle}>Descripción</label>
                  <textarea
                    value={form.description}
                    onChange={e => set("description", e.target.value)}
                    placeholder="Descripción breve del producto…"
                    rows={3}
                    style={{ ...inputStyle, resize: "vertical" }}
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                  <div>
                    <label style={labelStyle}>Tipo <span style={{ color: "#dc2626" }}>*</span></label>
                    <select
                      value={form.type}
                      onChange={e => set("type", e.target.value)}
                      style={inputStyle}
                    >
                      <option value="COURSE">COURSE</option>
                      <option value="SIMULACRO">SIMULACRO</option>
                      <option value="QUESTION_BANK">QUESTION_BANK</option>
                      <option value="BUNDLE">BUNDLE</option>
                    </select>
                  </div>

                  <div>
                    <label style={labelStyle}>Modelo de pago <span style={{ color: "#dc2626" }}>*</span></label>
                    <select
                      value={form.billingModel}
                      onChange={e => set("billingModel", e.target.value)}
                      style={inputStyle}
                    >
                      <option value="ONE_TIME">Pago único</option>
                      <option value="SUBSCRIPTION_MONTHLY">Mensual</option>
                      <option value="SUBSCRIPTION_YEARLY">Anual</option>
                    </select>
                  </div>

                  <div>
                    <label style={labelStyle}>Precio <span style={{ color: "#dc2626" }}>*</span></label>
                    <input
                      type="number"
                      min={0}
                      step="any"
                      value={form.price}
                      onChange={e => set("price", e.target.value)}
                      placeholder="0"
                      required
                      style={inputStyle}
                    />
                  </div>

                  <div>
                    <label style={labelStyle}>Moneda</label>
                    <input
                      type="text"
                      value={form.currency}
                      onChange={e => set("currency", e.target.value)}
                      placeholder="COP"
                      style={inputStyle}
                    />
                  </div>
                </div>

                {form.type === "COURSE" && (
                  <div>
                    <label style={labelStyle}>Curso asociado</label>
                    <select
                      value={form.courseId}
                      onChange={e => set("courseId", e.target.value)}
                      style={inputStyle}
                    >
                      <option value="">— Sin curso asociado —</option>
                      {courses.map(c => (
                        <option key={c.id} value={c.id}>{c.title}</option>
                      ))}
                    </select>
                  </div>
                )}

                {form.type === "SIMULACRO" && (
                  <div>
                    <label style={labelStyle}>Simulacro asociado</label>
                    <select
                      value={form.simulacroId}
                      onChange={e => set("simulacroId", e.target.value)}
                      style={inputStyle}
                    >
                      <option value="">— Sin simulacro asociado —</option>
                      {simulacros.map(s => (
                        <option key={s.id} value={s.id}>{s.titulo}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", marginTop: 8 }}>
                  <Link
                    href="/admin/products"
                    style={{ padding: "10px 20px", background: "#f1f5f9", color: "#475569", border: "1px solid #e2eaf7", borderRadius: 10, textDecoration: "none", fontWeight: 600, fontSize: "0.875rem" }}
                  >
                    Cancelar
                  </Link>
                  <button
                    type="submit"
                    disabled={saving}
                    style={{ padding: "10px 24px", background: "#004aad", color: "#fff", border: "none", borderRadius: 10, fontWeight: 700, fontSize: "0.9rem", cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1 }}
                  >
                    {saving ? "Guardando…" : "Crear producto"}
                  </button>
                </div>

              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
