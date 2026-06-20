"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";

interface SchoolColors {
  primary: string;
  secondary: string;
  accent: string;
  dark: string;
}

interface Program {
  id: string;
  titulo: string;
  descripcion: string;
  emoji: string;
  tag: string;
  activo: boolean;
  objetivo: string;
}

interface GaleriaItem {
  url: string;
  caption: string;
}

interface PageContent {
  colors?: Partial<SchoolColors>;
  hero?: { titulo?: string; subtitulo?: string; stat1?: string; stat1lbl?: string; stat2?: string; stat2lbl?: string; stat3?: string; stat3lbl?: string };
  sobreNosotros?: { titulo?: string; contenido?: string; mision?: string; vision?: string };
  programas?: Program[];
  contacto?: { whatsapp?: string; whatsappMsg?: string; instagram?: string; tiktok?: string; facebook?: string };
  galeria?: GaleriaItem[];
}

const TABS = ["🎨 Colores", "🏠 Inicio", "🏛 Sobre Nosotros", "📚 Programas", "📱 Contacto", "🖼 Galería"] as const;
type Tab = typeof TABS[number];

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "9px 13px", borderRadius: 10, border: "1px solid #e2eaf7",
  fontSize: "0.875rem", outline: "none", boxSizing: "border-box", background: "#fff",
};
const labelStyle: React.CSSProperties = {
  display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#475569", marginBottom: 5,
};
const card: React.CSSProperties = {
  background: "#fff", borderRadius: 16, border: "1px solid #e2eaf7",
  boxShadow: "0 2px 8px rgba(0,74,173,0.06)", padding: "24px 28px", marginBottom: 22,
};

function AdminSidebar({ logout, router, schoolSlug }: { logout: () => void; router: ReturnType<typeof useRouter>; schoolSlug: string }) {
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
        <Link href="/admin/simulacros" className="sidebar-link"><span className="sidebar-link-icon">📋</span> Simulacros</Link>
        <div className="sidebar-nav-label">Cuenta</div>
        <button className="sidebar-link" style={{ width: "100%", background: "none", border: "none", cursor: "pointer", textAlign: "left" }}
          onClick={() => { logout(); router.push("/"); }}>
          <span className="sidebar-link-icon">🚪</span> Cerrar sesión
        </button>
      </nav>
    </aside>
  );
}

const NEW_PROGRAM = (): Program => ({
  id: `prog_${Date.now()}`,
  titulo: "",
  descripcion: "",
  emoji: "📚",
  tag: "",
  activo: true,
  objetivo: "",
});

const DEFAULT_CONTENT: PageContent = {
  colors: { primary: "#004aad", secondary: "#fc740c", accent: "#0ea5e9", dark: "#0a1628" },
  hero: { titulo: "", subtitulo: "", stat1: "", stat1lbl: "", stat2: "", stat2lbl: "", stat3: "", stat3lbl: "" },
  sobreNosotros: { titulo: "Sobre Nosotros", contenido: "", mision: "", vision: "" },
  programas: [],
  contacto: { whatsapp: "", whatsappMsg: "", instagram: "", tiktok: "", facebook: "" },
  galeria: [],
};

export default function SchoolPaginaPage() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;

  const [schoolName, setSchoolName] = useState("");
  const [schoolSlug, setSchoolSlug] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoError, setLogoError] = useState("");
  const [content, setContent] = useState<PageContent>(DEFAULT_CONTENT);
  const [tab, setTab] = useState<Tab>("🎨 Colores");
  const [fetching, setFetching] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState("");

  useEffect(() => {
    if (!loading && !user) router.replace("/auth/login");
    if (!loading && user && user.role !== "SUPER_ADMIN") router.replace("/admin");
  }, [user, loading]);

  useEffect(() => {
    if (!user || user.role !== "SUPER_ADMIN" || !id) return;
    api.get<any>(`/schools/${id}`).then(school => {
      setSchoolName(school.name);
      setSchoolSlug(school.slug);
      setLogoUrl(school.logoUrl ?? "");
      if (school.pageContent) {
        const pc = { ...school.pageContent };
        // Migrate old programas object format to array
        if (pc.programas && !Array.isArray(pc.programas)) {
          const old = pc.programas as any;
          const mapped: Program[] = [];
          if (old.preicfes !== undefined) mapped.push({ id: "preicfes", titulo: "Pre ICFES", emoji: "📚", tag: "Más Popular", activo: old.preicfes?.activo ?? true, descripcion: old.preicfes?.descripcion ?? "", objetivo: old.preicfes?.objetivo ?? "340+" });
          if (old.preudea !== undefined) mapped.push({ id: "preudea", titulo: "Pre UDEA", emoji: "🎓", tag: "Alta Demanda", activo: old.preudea?.activo ?? false, descripcion: old.preudea?.descripcion ?? "", objetivo: old.preudea?.objetivo ?? "91+" });
          if (old.cursos !== undefined) mapped.push({ id: "cursos", titulo: "Cursos Especializados", emoji: "⚡", tag: "Flexible", activo: old.cursos?.activo ?? false, descripcion: old.cursos?.descripcion ?? "", objetivo: "" });
          pc.programas = mapped;
        }
        setContent(prev => deepMerge(prev, pc));
      }
    }).finally(() => setFetching(false));
  }, [user, id]);

  function deepMerge(base: any, override: any): any {
    const result = { ...base };
    for (const key in override) {
      if (override[key] && typeof override[key] === "object" && !Array.isArray(override[key])) {
        result[key] = deepMerge(base[key] ?? {}, override[key]);
      } else if (override[key] !== undefined && override[key] !== null) {
        result[key] = override[key];
      }
    }
    return result;
  }

  function setColors(patch: Partial<SchoolColors>) {
    setContent(p => ({ ...p, colors: { ...p.colors, ...patch } }));
  }
  function setHero(patch: Partial<NonNullable<PageContent["hero"]>>) {
    setContent(p => ({ ...p, hero: { ...p.hero, ...patch } }));
  }
  function setSobre(patch: Partial<NonNullable<PageContent["sobreNosotros"]>>) {
    setContent(p => ({ ...p, sobreNosotros: { ...p.sobreNosotros, ...patch } }));
  }
  function updatePrograma(idx: number, patch: Partial<Program>) {
    setContent(p => {
      const progs = [...(p.programas ?? [])];
      progs[idx] = { ...progs[idx], ...patch };
      return { ...p, programas: progs };
    });
  }
  function addPrograma() {
    setContent(p => ({ ...p, programas: [...(p.programas ?? []), NEW_PROGRAM()] }));
  }
  function removePrograma(idx: number) {
    setContent(p => ({ ...p, programas: (p.programas ?? []).filter((_, i) => i !== idx) }));
  }
  function setContacto(patch: Partial<NonNullable<PageContent["contacto"]>>) {
    setContent(p => ({ ...p, contacto: { ...p.contacto, ...patch } }));
  }
  function addGaleriaItem() {
    setContent(p => ({ ...p, galeria: [...(p.galeria ?? []), { url: "", caption: "" }] }));
  }
  function updateGaleriaItem(idx: number, patch: Partial<GaleriaItem>) {
    setContent(p => {
      const g = [...(p.galeria ?? [])];
      g[idx] = { ...g[idx], ...patch };
      return { ...p, galeria: g };
    });
  }
  function removeGaleriaItem(idx: number) {
    setContent(p => ({ ...p, galeria: (p.galeria ?? []).filter((_, i) => i !== idx) }));
  }
  async function uploadGaleriaImage(idx: number, file: File) {
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await api.upload<{ url: string }>("/uploads/image", form);
      updateGaleriaItem(idx, { url: res.url });
    } catch (e: any) {
      setSaveError("Error al subir imagen: " + (e.message ?? ""));
    }
  }

  async function handleLogoUpload(file: File) {
    setLogoUploading(true);
    setLogoError("");
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await api.upload<{ url: string }>("/uploads/logo", form);
      setLogoUrl(res.url);
    } catch (e: any) {
      setLogoError(e.message ?? "Error al subir la imagen");
    } finally {
      setLogoUploading(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    setSaveError("");
    try {
      await Promise.all([
        api.patch(`/schools/${id}/page-content`, content),
        api.patch(`/schools/${id}`, { logoUrl: logoUrl || null }),
      ]);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e: any) {
      setSaveError(e.message ?? "Error al guardar.");
    } finally {
      setSaving(false);
    }
  }

  if (loading || !user) return null;

  const colors = { primary: "#004aad", secondary: "#fc740c", accent: "#0ea5e9", dark: "#0a1628", ...content.colors };

  return (
    <div style={{ minHeight: "100vh", background: "#f0f4ff" }}>
      <AdminSidebar logout={logout} router={router} schoolSlug={schoolSlug} />

      <main style={{ marginLeft: 260, padding: "32px 36px", minHeight: "100vh", boxSizing: "border-box" }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
          <div>
            <Link href={`/admin/schools/${id}`} style={{ fontSize: "0.875rem", color: "#64748b", textDecoration: "none", display: "block", marginBottom: 6 }}>
              ← Volver a la institución
            </Link>
            <h1 style={{ fontSize: "1.4rem", fontWeight: 800, color: "#1e293b", margin: 0 }}>
              Sitio web: {fetching ? "…" : schoolName}
            </h1>
            {schoolSlug && <p style={{ fontSize: "0.8rem", color: "#64748b", margin: "4px 0 0" }}>URL: <strong>/{schoolSlug}/inicio</strong></p>}
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            {saved && <span style={{ fontSize: "0.85rem", color: "#16a34a", fontWeight: 600 }}>✓ Guardado</span>}
            {saveError && <span style={{ fontSize: "0.85rem", color: "#dc2626" }}>{saveError}</span>}
            {schoolSlug && (
              <button
                onClick={async () => { await handleSave(); window.open(`/${schoolSlug}/inicio`, "_blank"); }}
                disabled={saving}
                style={{ padding: "9px 18px", background: "#f1f5f9", color: "#475569", border: "1px solid #e2eaf7", borderRadius: 10, fontWeight: 600, fontSize: "0.875rem", cursor: saving ? "not-allowed" : "pointer" }}>
                🌐 Guardar y ver vista previa
              </button>
            )}
            <button onClick={handleSave} disabled={saving}
              style={{ padding: "9px 22px", background: "#004aad", color: "#fff", border: "none", borderRadius: 10, fontWeight: 700, fontSize: "0.9rem", cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1 }}>
              {saving ? "Guardando…" : "Guardar cambios"}
            </button>
          </div>
        </div>

        {fetching ? (
          <div style={{ textAlign: "center", padding: "80px 0", color: "#64748b" }}>⏳ Cargando…</div>
        ) : (
          <>
            {/* Tabs */}
            <div style={{ display: "flex", gap: 4, marginBottom: 24, background: "#fff", borderRadius: 12, border: "1px solid #e2eaf7", padding: 6, width: "fit-content", flexWrap: "wrap" }}>
              {TABS.map(t => (
                <button key={t} onClick={() => setTab(t)}
                  style={{ padding: "7px 16px", borderRadius: 8, border: "none", fontWeight: 600, fontSize: "0.82rem", cursor: "pointer", background: tab === t ? "#004aad" : "transparent", color: tab === t ? "#fff" : "#475569" }}>
                  {t}
                </button>
              ))}
            </div>

            {/* ── COLORES ── */}
            {tab === "🎨 Colores" && (
              <div style={card}>
                <h2 style={{ fontSize: "1rem", fontWeight: 700, color: "#1e293b", margin: "0 0 6px" }}>Identidad y Colores</h2>
                <p style={{ color: "#64748b", fontSize: "0.85rem", margin: "0 0 22px" }}>
                  El logo y los colores se aplican automáticamente al sitio público de la institución.
                </p>

                {/* Logo */}
                <div style={{ marginBottom: 24 }}>
                  <label style={labelStyle}>Logo de la institución</label>
                  <p style={{ fontSize: "0.72rem", color: "#94a3b8", margin: "0 0 12px" }}>
                    Sube una imagen o pega una URL. Vacío = se muestran las iniciales de la institución.
                  </p>

                  <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
                    {/* Preview */}
                    <div style={{ flexShrink: 0 }}>
                      {logoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={logoUrl} alt="Logo" onError={e => (e.currentTarget.style.display = "none")}
                          style={{ width: 80, height: 80, borderRadius: 12, objectFit: "contain", border: "1px solid #e2eaf7", background: "#f8faff", padding: 6 }} />
                      ) : (
                        <div style={{ width: 80, height: 80, borderRadius: 12, background: `linear-gradient(135deg, ${colors.primary}, ${colors.dark})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.6rem", fontWeight: 900, color: "#fff", fontFamily: "var(--font-poppins)" }}>
                          {schoolName.split(" ").slice(0, 2).map(w => w[0]?.toUpperCase() ?? "").join("") || "?"}
                        </div>
                      )}
                      {logoUrl && (
                        <button onClick={() => setLogoUrl("")}
                          style={{ display: "block", width: "100%", marginTop: 6, padding: "3px 0", background: "#fef2f2", color: "#dc2626", border: "1px solid #fca5a5", borderRadius: 6, fontSize: "0.72rem", fontWeight: 600, cursor: "pointer" }}>
                          Quitar logo
                        </button>
                      )}
                    </div>

                    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10 }}>
                      {/* Upload button */}
                      <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: logoUploading ? "not-allowed" : "pointer" }}>
                        <input type="file" accept="image/jpeg,image/png,image/webp,image/svg+xml"
                          style={{ display: "none" }}
                          disabled={logoUploading}
                          onChange={e => {
                            const f = e.target.files?.[0];
                            if (f) handleLogoUpload(f);
                            e.target.value = "";
                          }} />
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "9px 18px", background: logoUploading ? "#e2eaf7" : "#004aad", color: logoUploading ? "#94a3b8" : "#fff", borderRadius: 10, fontWeight: 700, fontSize: "0.85rem", userSelect: "none" }}>
                          {logoUploading ? "⏳ Subiendo…" : "📁 Subir imagen"}
                        </span>
                        <span style={{ fontSize: "0.72rem", color: "#94a3b8" }}>JPG, PNG, SVG, WEBP · máx. 5 MB</span>
                      </label>

                      {/* Divider */}
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ flex: 1, height: 1, background: "#e2eaf7" }} />
                        <span style={{ fontSize: "0.72rem", color: "#94a3b8", fontWeight: 600 }}>O pega una URL</span>
                        <div style={{ flex: 1, height: 1, background: "#e2eaf7" }} />
                      </div>

                      {/* URL input */}
                      <input type="text" value={logoUrl} onChange={e => setLogoUrl(e.target.value)}
                        placeholder="https://miinstitucion.com/logo.png"
                        style={inputStyle} />

                      {logoError && (
                        <div style={{ fontSize: "0.8rem", color: "#dc2626", background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 8, padding: "6px 10px" }}>
                          ⚠️ {logoError}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <hr style={{ border: "none", borderTop: "1px solid #e2eaf7", margin: "0 0 22px" }} />
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
                  {([
                    { key: "primary" as const, label: "Color principal", hint: "Navbar, botones, títulos" },
                    { key: "secondary" as const, label: "Color secundario", hint: "CTA, acentos naranja" },
                    { key: "accent" as const, label: "Color acento", hint: "Links, highlights" },
                    { key: "dark" as const, label: "Color oscuro / fondo hero", hint: "Hero y sección azul oscuro" },
                  ]).map(({ key, label, hint }) => (
                    <div key={key}>
                      <label style={labelStyle}>{label}</label>
                      <div style={{ fontSize: "0.72rem", color: "#94a3b8", marginBottom: 6 }}>{hint}</div>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <input type="color" value={colors[key]}
                          onChange={e => setColors({ [key]: e.target.value })}
                          style={{ width: 44, height: 38, borderRadius: 8, border: "1px solid #e2eaf7", cursor: "pointer", padding: 2, background: "white" }} />
                        <input type="text" value={colors[key]}
                          onChange={e => setColors({ [key]: e.target.value })}
                          style={{ ...inputStyle, fontFamily: "monospace", fontSize: "0.85rem" }} />
                      </div>
                    </div>
                  ))}
                </div>

                <div style={{ marginTop: 22, padding: "16px 20px", background: "#f8faff", borderRadius: 10, border: "1px solid #e2eaf7" }}>
                  <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "#64748b", marginBottom: 12 }}>VISTA PREVIA</div>
                  <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 14 }}>
                    {Object.entries(colors).map(([k, v]) => (
                      <div key={k} style={{ textAlign: "center" }}>
                        <div style={{ width: 48, height: 48, borderRadius: 10, background: v, border: "2px solid rgba(0,0,0,0.08)", margin: "0 auto 4px", boxShadow: "0 2px 6px rgba(0,0,0,0.15)" }} />
                        <div style={{ fontSize: "0.68rem", color: "#94a3b8" }}>{k}</div>
                        <div style={{ fontSize: "0.68rem", color: "#475569", fontFamily: "monospace" }}>{v}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <div style={{ padding: "8px 20px", borderRadius: 8, background: colors.primary, color: "#fff", fontWeight: 700, fontSize: "0.85rem" }}>Botón principal</div>
                    <div style={{ padding: "8px 20px", borderRadius: 8, background: colors.secondary, color: "#fff", fontWeight: 700, fontSize: "0.85rem" }}>Botón CTA</div>
                    <div style={{ padding: "8px 20px", borderRadius: 8, background: colors.dark, color: "#fff", fontWeight: 700, fontSize: "0.85rem" }}>Fondo oscuro</div>
                  </div>
                </div>
              </div>
            )}

            {/* ── INICIO ── */}
            {tab === "🏠 Inicio" && (
              <div style={card}>
                <h2 style={{ fontSize: "1rem", fontWeight: 700, color: "#1e293b", margin: "0 0 20px" }}>Sección Hero</h2>
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  <div>
                    <label style={labelStyle}>Título principal</label>
                    <input type="text" value={content.hero?.titulo ?? ""}
                      onChange={e => setHero({ titulo: e.target.value })}
                      placeholder={schoolName || "Ej: Academia de Ciencias Avanzadas Exactas"}
                      style={inputStyle} />
                    <p style={{ fontSize: "0.72rem", color: "#94a3b8", margin: "4px 0 0" }}>Vacío = se usa el nombre de la institución.</p>
                  </div>
                  <div>
                    <label style={labelStyle}>Subtítulo / descripción</label>
                    <textarea value={content.hero?.subtitulo ?? ""}
                      onChange={e => setHero({ subtitulo: e.target.value })}
                      placeholder="Formación académica estratégica para las Pruebas Saber 11 y exámenes de admisión universitaria."
                      rows={3} style={{ ...inputStyle, resize: "vertical" }} />
                  </div>
                  <div>
                    <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "#1e293b", marginBottom: 12 }}>Estadísticas (3 indicadores)</div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                      {([1, 2, 3] as const).map(n => {
                        const numKey = `stat${n}` as keyof typeof content.hero;
                        const lblKey = `stat${n}lbl` as keyof typeof content.hero;
                        return (
                          <div key={n} style={{ background: "#f8faff", borderRadius: 10, padding: "12px 14px", border: "1px solid #e2eaf7" }}>
                            <label style={labelStyle}>Número</label>
                            <input type="text" value={(content.hero as any)?.[`stat${n}`] ?? ""}
                              onChange={e => setHero({ [`stat${n}`]: e.target.value } as any)}
                              placeholder={["340+", "91+", "98%"][n - 1]} style={{ ...inputStyle, marginBottom: 8 }} />
                            <label style={labelStyle}>Etiqueta</label>
                            <input type="text" value={(content.hero as any)?.[`stat${n}lbl`] ?? ""}
                              onChange={e => setHero({ [`stat${n}lbl`]: e.target.value } as any)}
                              placeholder={["Puntajes ICFES", "Admisiones UdeA", "Satisfacción"][n - 1]} style={inputStyle} />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── SOBRE NOSOTROS ── */}
            {tab === "🏛 Sobre Nosotros" && (
              <div style={card}>
                <h2 style={{ fontSize: "1rem", fontWeight: 700, color: "#1e293b", margin: "0 0 20px" }}>Página Sobre Nosotros</h2>
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  <div>
                    <label style={labelStyle}>Título</label>
                    <input type="text" value={content.sobreNosotros?.titulo ?? ""}
                      onChange={e => setSobre({ titulo: e.target.value })}
                      placeholder="Sobre Nosotros" style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Historia / descripción general</label>
                    <textarea value={content.sobreNosotros?.contenido ?? ""}
                      onChange={e => setSobre({ contenido: e.target.value })}
                      placeholder="Describe la institución, su historia y lo que la hace especial..."
                      rows={6} style={{ ...inputStyle, resize: "vertical", lineHeight: 1.6 }} />
                  </div>
                  <div>
                    <label style={labelStyle}>Misión</label>
                    <textarea value={content.sobreNosotros?.mision ?? ""}
                      onChange={e => setSobre({ mision: e.target.value })}
                      placeholder="Misión de la institución..." rows={3}
                      style={{ ...inputStyle, resize: "vertical" }} />
                  </div>
                  <div>
                    <label style={labelStyle}>Visión</label>
                    <textarea value={content.sobreNosotros?.vision ?? ""}
                      onChange={e => setSobre({ vision: e.target.value })}
                      placeholder="Visión de la institución..." rows={3}
                      style={{ ...inputStyle, resize: "vertical" }} />
                  </div>
                </div>
              </div>
            )}

            {/* ── PROGRAMAS ── */}
            {tab === "📚 Programas" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <p style={{ fontSize: "0.85rem", color: "#64748b", margin: 0 }}>
                      Agrega los programas, materias o servicios que ofrece tu institución.
                    </p>
                  </div>
                  <button onClick={addPrograma}
                    style={{ padding: "9px 18px", background: "#004aad", color: "#fff", border: "none", borderRadius: 10, fontWeight: 700, fontSize: "0.85rem", cursor: "pointer" }}>
                    + Agregar programa
                  </button>
                </div>

                {(content.programas ?? []).length === 0 && (
                  <div style={{ textAlign: "center", padding: "48px 0", color: "#94a3b8", background: "#fff", borderRadius: 16, border: "1px dashed #e2eaf7" }}>
                    <div style={{ fontSize: "2.5rem", marginBottom: 12 }}>📋</div>
                    <div style={{ fontWeight: 600, marginBottom: 6 }}>Sin programas configurados</div>
                    <div style={{ fontSize: "0.82rem" }}>Haz clic en "Agregar programa" para comenzar.</div>
                  </div>
                )}

                {(content.programas ?? []).map((prog, idx) => (
                  <div key={prog.id} style={card}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <input type="text" value={prog.emoji} onChange={e => updatePrograma(idx, { emoji: e.target.value })}
                          style={{ width: 50, textAlign: "center", fontSize: "1.4rem", padding: "4px 6px", border: "1px solid #e2eaf7", borderRadius: 8, background: "#f8faff" }} />
                        <input type="text" value={prog.titulo} onChange={e => updatePrograma(idx, { titulo: e.target.value })}
                          placeholder="Nombre del programa"
                          style={{ ...inputStyle, fontWeight: 700, fontSize: "0.95rem", maxWidth: 300 }} />
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <div onClick={() => updatePrograma(idx, { activo: !prog.activo })}
                          style={{ display: "flex", alignItems: "center", gap: 7, cursor: "pointer" }}>
                          <div style={{ width: 36, height: 20, borderRadius: 10, background: prog.activo ? "#004aad" : "#cbd5e1", position: "relative", transition: "background 0.2s" }}>
                            <div style={{ position: "absolute", top: 2, left: prog.activo ? 18 : 2, width: 16, height: 16, borderRadius: "50%", background: "#fff", transition: "left 0.2s", boxShadow: "0 1px 4px rgba(0,0,0,0.2)" }} />
                          </div>
                          <span style={{ fontSize: "0.8rem", fontWeight: 600, color: prog.activo ? "#004aad" : "#94a3b8" }}>
                            {prog.activo ? "Visible" : "Oculto"}
                          </span>
                        </div>
                        <button onClick={() => removePrograma(idx)}
                          style={{ background: "#fef2f2", color: "#dc2626", border: "1px solid #fca5a5", borderRadius: 8, padding: "5px 10px", fontSize: "0.78rem", fontWeight: 600, cursor: "pointer" }}>
                          Eliminar
                        </button>
                      </div>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                      <div style={{ gridColumn: "1 / -1" }}>
                        <label style={labelStyle}>Descripción</label>
                        <textarea value={prog.descripcion} onChange={e => updatePrograma(idx, { descripcion: e.target.value })}
                          placeholder="Describe brevemente este programa o materia..."
                          rows={2} style={{ ...inputStyle, resize: "vertical" }} />
                      </div>
                      <div>
                        <label style={labelStyle}>Etiqueta / badge</label>
                        <input type="text" value={prog.tag} onChange={e => updatePrograma(idx, { tag: e.target.value })}
                          placeholder="Ej: Popular, Nuevo, Incluido..." style={inputStyle} />
                      </div>
                      <div>
                        <label style={labelStyle}>Indicador / objetivo</label>
                        <input type="text" value={prog.objetivo} onChange={e => updatePrograma(idx, { objetivo: e.target.value })}
                          placeholder="Ej: 340+, Nivel A2, Flexible..." style={inputStyle} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* ── CONTACTO ── */}
            {tab === "📱 Contacto" && (
              <div style={card}>
                <h2 style={{ fontSize: "1rem", fontWeight: 700, color: "#1e293b", margin: "0 0 20px" }}>Redes sociales y contacto</h2>
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  <div>
                    <label style={labelStyle}>Número de WhatsApp</label>
                    <input type="text" value={content.contacto?.whatsapp ?? ""}
                      onChange={e => setContacto({ whatsapp: e.target.value })}
                      placeholder="573154616531 (con código país, sin + ni espacios)"
                      style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Mensaje predeterminado de WhatsApp</label>
                    <input type="text" value={content.contacto?.whatsappMsg ?? ""}
                      onChange={e => setContacto({ whatsappMsg: e.target.value })}
                      placeholder="Hola, me interesa conocer más sobre los programas."
                      style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>URL Instagram</label>
                    <input type="text" value={content.contacto?.instagram ?? ""}
                      onChange={e => setContacto({ instagram: e.target.value })}
                      placeholder="https://www.instagram.com/miinstitucion/" style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>URL TikTok</label>
                    <input type="text" value={content.contacto?.tiktok ?? ""}
                      onChange={e => setContacto({ tiktok: e.target.value })}
                      placeholder="https://www.tiktok.com/@miinstitucion" style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>URL Facebook</label>
                    <input type="text" value={content.contacto?.facebook ?? ""}
                      onChange={e => setContacto({ facebook: e.target.value })}
                      placeholder="https://www.facebook.com/miinstitucion" style={inputStyle} />
                  </div>
                </div>
              </div>
            )}

            {/* ── GALERÍA ── */}
            {tab === "🖼 Galería" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <p style={{ fontSize: "0.85rem", color: "#64748b", margin: 0 }}>
                    Agrega imágenes que se mostrarán en la página de inicio y sobre nosotros.
                  </p>
                  <button onClick={addGaleriaItem}
                    style={{ padding: "9px 18px", background: "#004aad", color: "#fff", border: "none", borderRadius: 10, fontWeight: 700, fontSize: "0.85rem", cursor: "pointer" }}>
                    + Agregar imagen
                  </button>
                </div>

                {(content.galeria ?? []).length === 0 && (
                  <div style={{ textAlign: "center", padding: "48px 0", color: "#94a3b8", background: "#fff", borderRadius: 16, border: "1px dashed #e2eaf7" }}>
                    <div style={{ fontSize: "2.5rem", marginBottom: 12 }}>🖼</div>
                    <div style={{ fontWeight: 600, marginBottom: 6 }}>Sin imágenes en la galería</div>
                    <div style={{ fontSize: "0.82rem" }}>Haz clic en "Agregar imagen" para comenzar.</div>
                  </div>
                )}

                {(content.galeria ?? []).map((img, idx) => (
                  <div key={idx} style={{ background: "#fff", borderRadius: 16, border: "1px solid #e2eaf7", padding: "20px", display: "flex", gap: 20, alignItems: "flex-start" }}>
                    {/* Preview */}
                    <div style={{ flexShrink: 0 }}>
                      {img.url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={img.url.startsWith("http") ? img.url : `${process.env.NEXT_PUBLIC_API_URL?.replace("/api", "") ?? "http://localhost:3001"}${img.url}`}
                          alt={img.caption || `Imagen ${idx + 1}`}
                          style={{ width: 120, height: 90, objectFit: "cover", borderRadius: 10, border: "1px solid #e2eaf7" }} />
                      ) : (
                        <div style={{ width: 120, height: 90, borderRadius: 10, background: "#f8faff", border: "1px dashed #e2eaf7", display: "flex", alignItems: "center", justifyContent: "center", color: "#cbd5e1", fontSize: "2rem" }}>🖼</div>
                      )}
                    </div>
                    {/* Fields */}
                    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10 }}>
                      <div>
                        <label style={labelStyle}>URL de la imagen</label>
                        <div style={{ display: "flex", gap: 8 }}>
                          <input type="text" value={img.url} onChange={e => updateGaleriaItem(idx, { url: e.target.value })}
                            placeholder="https://... o sube una imagen" style={{ ...inputStyle, flex: 1 }} />
                          <label style={{ display: "flex", alignItems: "center", gap: 6, padding: "0 14px", background: "#004aad", color: "#fff", borderRadius: 10, fontWeight: 700, fontSize: "0.82rem", cursor: "pointer", whiteSpace: "nowrap" }}>
                            <input type="file" accept="image/*" style={{ display: "none" }}
                              onChange={e => { if (e.target.files?.[0]) uploadGaleriaImage(idx, e.target.files[0]); e.target.value = ""; }} />
                            📁 Subir
                          </label>
                        </div>
                      </div>
                      <div>
                        <label style={labelStyle}>Descripción / pie de foto</label>
                        <input type="text" value={img.caption} onChange={e => updateGaleriaItem(idx, { caption: e.target.value })}
                          placeholder="Ej: Nuestras instalaciones" style={inputStyle} />
                      </div>
                    </div>
                    {/* Remove */}
                    <button onClick={() => removeGaleriaItem(idx)}
                      style={{ background: "#fef2f2", color: "#dc2626", border: "1px solid #fca5a5", borderRadius: 8, padding: "8px 12px", fontSize: "0.78rem", fontWeight: 600, cursor: "pointer", flexShrink: 0 }}>
                      Eliminar
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
