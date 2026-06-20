"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { Trash2 } from "lucide-react";

interface SimulacroDetail {
  id: string;
  titulo: string;
  descripcion?: string;
  emoji: string;
  color: string;
  isPublished: boolean;
  isGlobal: boolean;
  examType: string;
  totalPreguntas: number;
  duracionMinutos: number;
  areasEvaluadas: string[];
  createdAt: string;
  scaledScoring: boolean;
  allowBackNavigation: boolean;
  showResultsImmediately: boolean;
}

const EMOJIS = ["📋", "📝", "🧠", "🎯", "📊", "🔬", "📐", "🌍", "📚", "💡", "🏆", "⚡"];
const COLORS = [
  "#eff6ff", "#f5f3ff", "#fdf4ff", "#fff7ed", "#f0fdf4",
  "#fef2f2", "#f8fafc", "#fffbeb", "#ecfdf5", "#faf5ff",
];

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
        <Link href="/admin/simulacros" className="sidebar-link active"><span className="sidebar-link-icon">📋</span> Simulacros</Link>
        <Link href="/admin/enrollments" className="sidebar-link"><span className="sidebar-link-icon">📝</span> Inscripciones</Link>
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

export default function EditSimulacroAdminPage() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const params = useParams();
  const simId = params.id as string;

  const [sim, setSim] = useState<SimulacroDetail | null>(null);
  const [fetching, setFetching] = useState(true);
  const [fetchError, setFetchError] = useState("");

  const [titulo, setTitulo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [emoji, setEmoji] = useState("📋");
  const [color, setColor] = useState("#eff6ff");

  const [scaledScoring, setScaledScoring] = useState(false);
  const [allowBackNavigation, setAllowBackNavigation] = useState(true);
  const [showResultsImmediately, setShowResultsImmediately] = useState(true);

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saveOk, setSaveOk] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [togglingPublish, setTogglingPublish] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.replace("/auth/login");
    if (!loading && user && user.role !== "ADMIN" && user.role !== "SUPER_ADMIN") router.replace("/dashboard");
  }, [user, loading]);

  useEffect(() => {
    if (!user || (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN")) return;
    api.get<SimulacroDetail>(`/simulacros/admin/${simId}`)
      .then(data => {
        setSim(data);
        setTitulo(data.titulo);
        setDescripcion(data.descripcion ?? "");
        setEmoji(data.emoji ?? "📋");
        setColor(data.color ?? "#eff6ff");
        setScaledScoring(data.scaledScoring ?? false);
        setAllowBackNavigation(data.allowBackNavigation ?? true);
        setShowResultsImmediately(data.showResultsImmediately ?? true);
      })
      .catch((e: any) => setFetchError(e.message ?? "Error al cargar el simulacro"))
      .finally(() => setFetching(false));
  }, [user, simId]);

  async function handleSave() {
    setSaving(true);
    setSaveError("");
    setSaveOk(false);
    try {
      const updated = await api.patch<SimulacroDetail>(`/simulacros/admin/${simId}`, {
        titulo, descripcion, emoji, color, scaledScoring, allowBackNavigation, showResultsImmediately,
      });
      setSim(prev => prev ? { ...prev, ...updated } : prev);
      setSaveOk(true);
      setTimeout(() => setSaveOk(false), 2500);
    } catch (e: any) {
      setSaveError(e.message ?? "Error al guardar");
    }
    setSaving(false);
  }

  async function handleTogglePublish() {
    if (!sim) return;
    setTogglingPublish(true);
    try {
      await api.patch(`/simulacros/admin/${simId}/publish`, {});
      setSim(prev => prev ? { ...prev, isPublished: !prev.isPublished } : prev);
    } catch { /* silencioso */ }
    setTogglingPublish(false);
  }

  async function handleDelete() {
    if (!sim) return;
    if (!confirm(`¿Eliminar "${sim.titulo}"? Esta acción no se puede deshacer.`)) return;
    setDeleting(true);
    try {
      await api.delete(`/simulacros/admin/${simId}`);
      router.push("/admin/simulacros");
    } catch (e: any) {
      alert(e.message ?? "Error al eliminar");
      setDeleting(false);
    }
  }

  if (loading || !user) return null;

  return (
    <div style={{ minHeight: "100vh", background: "#f0f4ff" }}>
      <AdminSidebar logout={logout} router={router} isSuperAdmin={user.role === "SUPER_ADMIN"} />

      <main style={{ marginLeft: 260, padding: "32px 36px", minHeight: "100vh", boxSizing: "border-box" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, marginBottom: 28 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <Link
              href="/admin/simulacros"
              style={{ padding: "8px 14px", background: "#fff", border: "1px solid #e2eaf7", borderRadius: 10, color: "#475569", textDecoration: "none", fontSize: "0.85rem", fontWeight: 600 }}
            >
              ← Volver
            </Link>
            <div>
              <h1 style={{ fontSize: "1.5rem", fontWeight: 800, color: "#1e293b", margin: 0 }}>
                {fetching ? "Cargando..." : sim ? `Editar: ${sim.titulo}` : "Simulacro"}
              </h1>
              <p style={{ color: "#64748b", fontSize: "0.875rem", margin: "4px 0 0" }}>Modifica los datos del simulacro</p>
            </div>
          </div>
          {sim && (
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={handleTogglePublish}
                disabled={togglingPublish}
                style={{ padding: "9px 16px", background: sim.isPublished ? "#fff7ed" : "#f0fdf4", color: sim.isPublished ? "#c2410c" : "#16a34a", border: `1px solid ${sim.isPublished ? "#fed7aa" : "#bbf7d0"}`, borderRadius: 10, cursor: "pointer", fontSize: "0.85rem", fontWeight: 600 }}
              >
                {togglingPublish ? "..." : sim.isPublished ? "Despublicar" : "Publicar"}
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 16px", background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca", borderRadius: 10, cursor: deleting ? "not-allowed" : "pointer", fontSize: "0.85rem", fontWeight: 600 }}
              >
                <Trash2 size={15} />
                {deleting ? "Eliminando..." : "Eliminar"}
              </button>
            </div>
          )}
        </div>

        {fetching && <div style={{ padding: "56px 24px", textAlign: "center", color: "#64748b" }}>⏳ Cargando simulacro…</div>}
        {fetchError && <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 12, padding: "16px 20px", color: "#dc2626" }}>⚠ {fetchError}</div>}

        {!fetching && sim && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 24, alignItems: "start" }}>
            {/* Form */}
            <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e2eaf7", padding: 28 }}>
              <h2 style={{ fontSize: "1rem", fontWeight: 700, color: "#1e293b", margin: "0 0 20px" }}>Información general</h2>

              <div style={{ marginBottom: 18 }}>
                <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 600, color: "#475569", marginBottom: 6 }}>Título</label>
                <input
                  value={titulo}
                  onChange={e => setTitulo(e.target.value)}
                  style={{ width: "100%", padding: "10px 14px", border: "1px solid #dde4f0", borderRadius: 10, fontSize: "0.875rem", color: "#1e293b", outline: "none", boxSizing: "border-box" }}
                />
              </div>

              <div style={{ marginBottom: 18 }}>
                <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 600, color: "#475569", marginBottom: 6 }}>Descripción</label>
                <textarea
                  value={descripcion}
                  onChange={e => setDescripcion(e.target.value)}
                  rows={4}
                  style={{ width: "100%", padding: "10px 14px", border: "1px solid #dde4f0", borderRadius: 10, fontSize: "0.875rem", color: "#1e293b", outline: "none", resize: "vertical", boxSizing: "border-box" }}
                />
              </div>

              <div style={{ marginBottom: 18 }}>
                <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 600, color: "#475569", marginBottom: 8 }}>Emoji</label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {EMOJIS.map(e => (
                    <button
                      key={e}
                      onClick={() => setEmoji(e)}
                      style={{ width: 38, height: 38, borderRadius: 8, border: emoji === e ? "2px solid #004aad" : "1px solid #e2eaf7", background: emoji === e ? "#eff6ff" : "#fff", fontSize: "1.2rem", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                    >
                      {e}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ marginBottom: 24 }}>
                <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 600, color: "#475569", marginBottom: 8 }}>Color de fondo</label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {COLORS.map(c => (
                    <button
                      key={c}
                      onClick={() => setColor(c)}
                      style={{ width: 32, height: 32, borderRadius: 8, background: c, border: color === c ? "2px solid #004aad" : "1px solid #e2eaf7", cursor: "pointer" }}
                    />
                  ))}
                </div>
              </div>

              {/* Exam behavior */}
              <div style={{ marginBottom: 24 }}>
                <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 700, color: "#475569", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                  Comportamiento del examen
                </label>
                {[
                  { key: "scaledScoring" as const, label: "Puntuación escalada ICFES (300–500)", desc: "Convierte el puntaje bruto a la escala ICFES oficial", value: scaledScoring, set: setScaledScoring },
                  { key: "allowBackNavigation" as const, label: "Permitir navegación hacia atrás", desc: "El estudiante puede volver a preguntas anteriores", value: allowBackNavigation, set: setAllowBackNavigation },
                  { key: "showResultsImmediately" as const, label: "Mostrar resultados al finalizar", desc: "El estudiante ve su puntaje y revisión al entregar", value: showResultsImmediately, set: setShowResultsImmediately },
                ].map(({ label, desc, value, set }) => (
                  <div key={label} style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, padding: "10px 0", borderBottom: "1px solid #f1f5f9" }}>
                    <div>
                      <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "#1e293b" }}>{label}</div>
                      <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: 2 }}>{desc}</div>
                    </div>
                    <button
                      onClick={() => set(!value)}
                      style={{
                        flexShrink: 0, width: 44, height: 24, borderRadius: 12, border: "none", cursor: "pointer",
                        background: value ? "#004aad" : "#e2e8f0", position: "relative", transition: "background 0.2s",
                      }}
                    >
                      <div style={{
                        width: 18, height: 18, borderRadius: "50%", background: "#fff",
                        position: "absolute", top: 3, left: value ? 23 : 3, transition: "left 0.2s",
                      }} />
                    </button>
                  </div>
                ))}
              </div>

              {saveError && (
                <div style={{ marginBottom: 14, padding: "10px 14px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, color: "#dc2626", fontSize: "0.85rem" }}>
                  ⚠ {saveError}
                </div>
              )}
              {saveOk && (
                <div style={{ marginBottom: 14, padding: "10px 14px", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 10, color: "#16a34a", fontSize: "0.85rem" }}>
                  ✓ Guardado correctamente
                </div>
              )}

              <button
                onClick={handleSave}
                disabled={saving || !titulo.trim()}
                style={{ padding: "11px 28px", background: saving ? "#93c5fd" : "#004aad", color: "#fff", borderRadius: 10, border: "none", fontWeight: 700, fontSize: "0.9rem", cursor: saving ? "not-allowed" : "pointer" }}
              >
                {saving ? "Guardando..." : "Guardar cambios"}
              </button>
            </div>

            {/* Summary panel */}
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {/* Preview */}
              <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e2eaf7", padding: 20 }}>
                <h3 style={{ fontSize: "0.85rem", fontWeight: 700, color: "#475569", margin: "0 0 14px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Vista previa</h3>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 48, height: 48, borderRadius: 12, background: color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.5rem", flexShrink: 0 }}>
                    {emoji}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, color: "#1e293b", fontSize: "0.9rem" }}>{titulo || "Sin título"}</div>
                    <div style={{ fontSize: "0.75rem", color: "#94a3b8", marginTop: 2 }}>{descripcion || "Sin descripción"}</div>
                  </div>
                </div>
              </div>

              {/* Stats */}
              <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e2eaf7", padding: 20 }}>
                <h3 style={{ fontSize: "0.85rem", fontWeight: 700, color: "#475569", margin: "0 0 14px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Estadísticas</h3>
                {[
                  { label: "Tipo de examen", value: sim.examType },
                  { label: "Preguntas", value: sim.totalPreguntas },
                  { label: "Duración", value: `${sim.duracionMinutos} min` },
                  { label: "Estado", value: sim.isPublished ? "Publicado" : "Borrador" },
                  { label: "Áreas evaluadas", value: (sim.areasEvaluadas ?? []).join(", ") || "—" },
                ].map(({ label, value }) => (
                  <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "8px 0", borderBottom: "1px solid #f1f5f9" }}>
                    <span style={{ fontSize: "0.8rem", color: "#64748b" }}>{label}</span>
                    <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "#1e293b", textAlign: "right", maxWidth: 160 }}>{value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
