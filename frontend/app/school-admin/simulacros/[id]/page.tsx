"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import SchoolAdminSidebar from "@/components/school-admin/SchoolAdminSidebar";
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
}

const EMOJIS = ["📋", "📝", "🧠", "🎯", "📊", "🔬", "📐", "🌍", "📚", "💡", "🏆", "⚡"];
const COLORS = [
  "#eff6ff", "#f5f3ff", "#fdf4ff", "#fff7ed", "#f0fdf4",
  "#fef2f2", "#f8fafc", "#fffbeb", "#ecfdf5", "#faf5ff",
];

export default function EditSimulacroSchoolAdminPage() {
  const { user } = useAuth();
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

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saveOk, setSaveOk] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [togglingPublish, setTogglingPublish] = useState(false);

  useEffect(() => {
    if (!user) return;
    api.get<SimulacroDetail>(`/simulacros/admin/${simId}`)
      .then(data => {
        setSim(data);
        setTitulo(data.titulo);
        setDescripcion(data.descripcion ?? "");
        setEmoji(data.emoji ?? "📋");
        setColor(data.color ?? "#eff6ff");
      })
      .catch((e: any) => setFetchError(e.message ?? "Error al cargar el simulacro"))
      .finally(() => setFetching(false));
  }, [user, simId]);

  async function handleSave() {
    setSaving(true);
    setSaveError("");
    setSaveOk(false);
    try {
      const updated = await api.patch<SimulacroDetail>(`/simulacros/admin/${simId}`, { titulo, descripcion, emoji, color });
      setSim(prev => prev ? { ...prev, titulo: updated.titulo, descripcion: updated.descripcion, emoji: updated.emoji, color: updated.color } : prev);
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
      router.push("/school-admin/simulacros");
    } catch (e: any) {
      alert(e.message ?? "Error al eliminar");
      setDeleting(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f0f4ff" }}>
      <SchoolAdminSidebar />
      <main style={{ marginLeft: 260, padding: "32px 36px", minHeight: "100vh", boxSizing: "border-box" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, marginBottom: 28 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <Link
              href="/school-admin/simulacros"
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
          {sim && !sim.isGlobal && (
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
                      style={{ width: 38, height: 38, borderRadius: 8, border: emoji === e ? "2px solid #7c3aed" : "1px solid #e2eaf7", background: emoji === e ? "#f5f3ff" : "#fff", fontSize: "1.2rem", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
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
                      style={{ width: 32, height: 32, borderRadius: 8, background: c, border: color === c ? "2px solid #7c3aed" : "1px solid #e2eaf7", cursor: "pointer" }}
                    />
                  ))}
                </div>
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
                style={{ padding: "11px 28px", background: saving ? "#c4b5fd" : "#7c3aed", color: "#fff", borderRadius: 10, border: "none", fontWeight: 700, fontSize: "0.9rem", cursor: saving ? "not-allowed" : "pointer" }}
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
