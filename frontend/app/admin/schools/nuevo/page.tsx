"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";

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

function slugify(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
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

interface AdminCredentials {
  email: string;
  tempPassword: string;
  note: string;
}

export default function NuevoColegioPage() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [credentials, setCredentials] = useState<AdminCredentials | null>(null);
  const [createdSlug, setCreatedSlug] = useState("");
  const [copied, setCopied] = useState<string | null>(null);

  const [form, setForm] = useState({ name: "", slug: "", nit: "", email: "", phone: "", address: "" });
  const [colors, setColors] = useState({ primary: "#004aad", secondary: "#fc740c", accent: "#0ea5e9", dark: "#0a1628" });

  useEffect(() => {
    if (!loading && !user) router.replace("/auth/login");
    if (!loading && user && user.role !== "SUPER_ADMIN") router.replace("/admin");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, loading]);

  function handleNameChange(value: string) {
    setForm(prev => ({ ...prev, name: value, slug: slugify(value) }));
  }

  function copyToClipboard(text: string, key: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(null), 2000);
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.slug.trim()) { setError("El nombre y el slug son obligatorios."); return; }
    setSaving(true);
    setError("");
    try {
      const result = await api.post<{ school: { slug: string }; adminCredentials: AdminCredentials }>("/schools", {
        name: form.name.trim(),
        slug: form.slug.trim(),
        nit: form.nit.trim() || undefined,
        email: form.email.trim() || undefined,
        phone: form.phone.trim() || undefined,
        address: form.address.trim() || undefined,
        colors,
      });
      setCredentials(result.adminCredentials);
      setCreatedSlug(result.school.slug);
    } catch (e: any) {
      setError(e.message ?? "Error al crear la institución.");
    } finally {
      setSaving(false);
    }
  }

  if (loading || !user) return null;

  // ── Modal de credenciales tras crear ──────────────────────────────
  if (credentials) {
    return (
      <div style={{ minHeight: "100vh", background: "#f0f4ff" }}>
        <AdminSidebar logout={logout} router={router} />
        <main style={{ marginLeft: 260, padding: "32px 36px", minHeight: "100vh", boxSizing: "border-box", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ maxWidth: 560, width: "100%" }}>
            <div style={{ background: "#fff", borderRadius: 20, border: "1px solid #e2eaf7", boxShadow: "0 8px 32px rgba(0,74,173,0.12)", padding: "40px 44px" }}>
              <div style={{ textAlign: "center", marginBottom: 28 }}>
                <div style={{ fontSize: "3rem", marginBottom: 12 }}>🎉</div>
                <h1 style={{ fontSize: "1.4rem", fontWeight: 800, color: "#1e293b", margin: "0 0 8px" }}>¡Institución creada!</h1>
                <p style={{ color: "#64748b", fontSize: "0.9rem", margin: 0 }}>Se creó automáticamente un usuario administrador para esta institución.</p>
              </div>

              <div style={{ background: "#f8faff", border: "1px solid #e2eaf7", borderRadius: 14, padding: "20px 24px", marginBottom: 20 }}>
                <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 16 }}>
                  Credenciales del administrador
                </div>
                {[
                  { label: "Correo electrónico", value: credentials.email, key: "email" },
                  { label: "Contraseña temporal", value: credentials.tempPassword, key: "pass" },
                ].map(({ label, value, key }) => (
                  <div key={key} style={{ marginBottom: 14 }}>
                    <div style={{ fontSize: "0.8rem", fontWeight: 600, color: "#475569", marginBottom: 6 }}>{label}</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <code style={{ flex: 1, background: "#fff", border: "1px solid #e2eaf7", borderRadius: 8, padding: "8px 12px", fontSize: "0.95rem", color: "#1e293b", fontFamily: "monospace" }}>
                        {value}
                      </code>
                      <button
                        onClick={() => copyToClipboard(value, key)}
                        style={{ padding: "8px 14px", background: copied === key ? "#dcfce7" : "#004aad", color: copied === key ? "#16a34a" : "#fff", border: "none", borderRadius: 8, fontSize: "0.8rem", fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}
                      >
                        {copied === key ? "✓ Copiado" : "Copiar"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 10, padding: "12px 16px", marginBottom: 24, fontSize: "0.83rem", color: "#92400e", lineHeight: 1.5 }}>
                ⚠️ {credentials.note}
              </div>

              <div style={{ display: "flex", gap: 12 }}>
                <Link
                  href={`/${createdSlug}/inicio`}
                  target="_blank"
                  style={{ flex: 1, padding: "11px 16px", background: "#f1f5f9", color: "#475569", border: "1px solid #e2eaf7", borderRadius: 10, textDecoration: "none", fontWeight: 600, fontSize: "0.875rem", textAlign: "center" }}
                >
                  🌐 Ver sitio
                </Link>
                <Link
                  href="/admin/schools"
                  style={{ flex: 1, padding: "11px 16px", background: "#004aad", color: "#fff", borderRadius: 10, textDecoration: "none", fontWeight: 700, fontSize: "0.875rem", textAlign: "center" }}
                >
                  Ir a instituciones →
                </Link>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f0f4ff" }}>
      <AdminSidebar logout={logout} router={router} />

      <main style={{ marginLeft: 260, padding: "32px 36px", minHeight: "100vh", boxSizing: "border-box" }}>
        <div style={{ display: "flex", alignItems: "center", marginBottom: 28 }}>
          <Link href="/admin/schools" style={{ fontSize: "0.875rem", color: "#64748b", textDecoration: "none" }}>
            ← Volver a instituciones
          </Link>
        </div>

        <div style={{ maxWidth: 640, margin: "0 auto" }}>
          <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e2eaf7", boxShadow: "0 2px 8px rgba(0,74,173,0.06)", padding: "36px 40px" }}>
            <h1 style={{ fontSize: "1.3rem", fontWeight: 800, color: "#1e293b", margin: "0 0 6px" }}>Nueva institución</h1>
            <p style={{ color: "#64748b", fontSize: "0.875rem", margin: "0 0 28px" }}>
              Al crear la institución se generará automáticamente un usuario administrador.
            </p>

            {error && (
              <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, padding: "12px 16px", marginBottom: 20, color: "#dc2626", fontSize: "0.875rem" }}>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>

                <div>
                  <label style={labelStyle}>Nombre de la institución <span style={{ color: "#dc2626" }}>*</span></label>
                  <input type="text" value={form.name} onChange={e => handleNameChange(e.target.value)} placeholder="Ej: Institución San José" required style={inputStyle} />
                </div>

                <div>
                  <label style={labelStyle}>Slug (URL) <span style={{ color: "#dc2626" }}>*</span></label>
                  <input type="text" value={form.slug} onChange={e => setForm(prev => ({ ...prev, slug: e.target.value }))} placeholder="institucion-san-jose" required style={{ ...inputStyle, fontFamily: "monospace", color: "#475569" }} />
                  <p style={{ fontSize: "0.75rem", color: "#94a3b8", margin: "4px 0 0" }}>La URL del sitio será: <strong>/{form.slug}/inicio</strong></p>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                  <div>
                    <label style={labelStyle}>NIT</label>
                    <input type="text" value={form.nit} onChange={e => setForm(p => ({ ...p, nit: e.target.value }))} placeholder="900.123.456-7" style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Email de contacto</label>
                    <input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} placeholder="contacto@inst.edu.co" style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Teléfono</label>
                    <input type="text" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} placeholder="+57 310 000 0000" style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Dirección</label>
                    <input type="text" value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))} placeholder="Calle 10 # 20-30" style={inputStyle} />
                  </div>
                </div>

                {/* Colores de marca */}
                <div style={{ background: "#f8faff", border: "1px solid #e2eaf7", borderRadius: 12, padding: "20px 22px" }}>
                  <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "#1e293b", marginBottom: 4 }}>Colores de la institución</div>
                  <p style={{ fontSize: "0.78rem", color: "#64748b", margin: "0 0 16px" }}>Se aplicarán al sitio web público de la institución.</p>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                    {([
                      { key: "primary", label: "Color principal" },
                      { key: "secondary", label: "Color secundario" },
                      { key: "accent", label: "Color acento" },
                      { key: "dark", label: "Color oscuro/fondo" },
                    ] as const).map(({ key, label }) => (
                      <div key={key}>
                        <label style={labelStyle}>{label}</label>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <input
                            type="color"
                            value={colors[key]}
                            onChange={e => setColors(p => ({ ...p, [key]: e.target.value }))}
                            style={{ width: 40, height: 34, borderRadius: 8, border: "1px solid #e2eaf7", cursor: "pointer", padding: 2, background: "white" }}
                          />
                          <input
                            type="text"
                            value={colors[key]}
                            onChange={e => setColors(p => ({ ...p, [key]: e.target.value }))}
                            style={{ ...inputStyle, fontFamily: "monospace", fontSize: "0.82rem" }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                  <div style={{ marginTop: 14, display: "flex", gap: 6, alignItems: "center" }}>
                    <span style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 600 }}>Vista previa:</span>
                    {Object.entries(colors).map(([k, v]) => (
                      <div key={k} title={k} style={{ width: 26, height: 26, borderRadius: 6, background: v, border: "2px solid rgba(0,0,0,0.08)", boxShadow: "0 1px 4px rgba(0,0,0,0.12)" }} />
                    ))}
                  </div>
                </div>

                <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", marginTop: 8 }}>
                  <Link href="/admin/schools" style={{ padding: "10px 20px", background: "#f1f5f9", color: "#475569", border: "1px solid #e2eaf7", borderRadius: 10, textDecoration: "none", fontWeight: 600, fontSize: "0.875rem" }}>
                    Cancelar
                  </Link>
                  <button
                    type="submit"
                    disabled={saving}
                    style={{ padding: "10px 24px", background: "#004aad", color: "#fff", border: "none", borderRadius: 10, fontWeight: 700, fontSize: "0.9rem", cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1 }}
                  >
                    {saving ? "Creando…" : "Crear institución"}
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
