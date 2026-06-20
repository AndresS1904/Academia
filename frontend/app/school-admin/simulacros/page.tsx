"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import SchoolAdminSidebar from "@/components/school-admin/SchoolAdminSidebar";
import { Trash2 } from "lucide-react";

interface Simulacro {
  id: string;
  titulo: string;
  isPublished: boolean;
  isGlobal: boolean;
  totalPreguntas: number;
  duracionMinutos: number;
  emoji: string;
  color: string;
  createdAt: string;
  simulacroType: "ICFES_OFFICIAL" | "LIBRE";
}

const formatDate = (d: string) =>
  new Date(d).toLocaleDateString("es-CO", { day: "numeric", month: "short", year: "numeric" });

export default function SchoolAdminSimulacrosPage() {
  const { user } = useAuth();
  const [simulacros, setSimulacros] = useState<Simulacro[]>([]);
  const [loading, setLoading] = useState(true);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    api.get<Simulacro[]>("/simulacros/admin/all")
      .then(data => setSimulacros(data.filter(s => !s.isGlobal)))
      .finally(() => setLoading(false));
  }, [user]);

  async function deleteSimulacro(sim: Simulacro) {
    if (!confirm(`¿Eliminar el simulacro "${sim.titulo}"? Esta acción no se puede deshacer.`)) return;
    setDeletingId(sim.id);
    try {
      await api.delete(`/simulacros/admin/${sim.id}`);
      setSimulacros(prev => prev.filter(s => s.id !== sim.id));
    } catch (e: any) {
      alert(e.message ?? "Error al eliminar el simulacro");
    }
    setDeletingId(null);
  }

  async function togglePublish(sim: Simulacro) {
    setTogglingId(sim.id);
    try {
      await api.patch(`/simulacros/admin/${sim.id}/publish`, {});
      setSimulacros(prev => prev.map(s => s.id === sim.id ? { ...s, isPublished: !s.isPublished } : s));
    } catch { /* silencioso */ }
    setTogglingId(null);
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f0f4ff" }}>
      <SchoolAdminSidebar />
      <main style={{ marginLeft: 260, padding: "32px 36px", minHeight: "100vh", boxSizing: "border-box" }}>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
          <div>
            <h1 style={{ fontSize: "1.5rem", fontWeight: 800, color: "#1e293b", margin: 0 }}>Mis simulacros</h1>
            <p style={{ color: "#64748b", fontSize: "0.875rem", margin: "4px 0 0" }}>
              Simulacros creados por tu colegio.
            </p>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <Link
              href="/school-admin/catalogo?tab=simulacros"
              style={{ padding: "10px 16px", background: "#f1f5f9", color: "#475569", borderRadius: 10, textDecoration: "none", fontWeight: 600, fontSize: "0.875rem", border: "1px solid #e2eaf7" }}
            >
              🗂️ Ver catálogo
            </Link>
            <Link
              href="/school-admin/simulacros/nuevo-libre"
              style={{ padding: "10px 18px", background: "#059669", color: "#fff", borderRadius: 12, textDecoration: "none", fontWeight: 700, fontSize: "0.875rem" }}
            >
              + Simulacro libre
            </Link>
            <Link
              href="/school-admin/simulacros/nuevo"
              style={{ padding: "10px 18px", background: "#7c3aed", color: "#fff", borderRadius: 12, textDecoration: "none", fontWeight: 700, fontSize: "0.875rem" }}
            >
              + ICFES oficial
            </Link>
          </div>
        </div>

        <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e2eaf7", boxShadow: "0 2px 8px rgba(0,74,173,0.06)", overflow: "hidden" }}>
          {loading ? (
            <div style={{ padding: "56px 24px", textAlign: "center", color: "#64748b" }}>⏳ Cargando…</div>
          ) : simulacros.length === 0 ? (
            <div style={{ padding: "56px 24px", textAlign: "center", color: "#94a3b8" }}>
              No has creado simulacros propios.{" "}
              <Link href="/school-admin/simulacros/nuevo" style={{ color: "#7c3aed", fontWeight: 600 }}>Crea el primero</Link>
            </div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#f8faff", borderBottom: "1px solid #e2eaf7" }}>
                  {["Simulacro", "Tipo", "Preguntas", "Duración", "Estado", "Creado", "Acciones"].map(h => (
                    <th key={h} style={{ padding: "14px 16px", textAlign: "left", fontSize: "0.78rem", fontWeight: 700, color: "#475569" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {simulacros.map((s, idx) => (
                  <tr
                    key={s.id}
                    style={{ borderBottom: idx < simulacros.length - 1 ? "1px solid #f1f5f9" : "none", transition: "background 0.15s" }}
                    onMouseEnter={e => (e.currentTarget.style.background = "#f8faff")}
                    onMouseLeave={e => (e.currentTarget.style.background = "")}
                  >
                    <td style={{ padding: "14px 16px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ width: 36, height: 36, borderRadius: 10, background: s.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.1rem", flexShrink: 0 }}>
                          {s.emoji}
                        </div>
                        <span style={{ fontWeight: 600, color: "#1e293b", fontSize: "0.875rem" }}>{s.titulo}</span>
                      </div>
                    </td>
                    <td style={{ padding: "14px 16px" }}>
                      <span style={{
                        display: "inline-block", padding: "2px 9px", borderRadius: 20, fontSize: "0.72rem", fontWeight: 700,
                        background: s.simulacroType === "LIBRE" ? "#d1fae5" : "#ede9fe",
                        color: s.simulacroType === "LIBRE" ? "#065f46" : "#5b21b6",
                      }}>
                        {s.simulacroType === "LIBRE" ? "Libre" : "ICFES"}
                      </span>
                    </td>
                    <td style={{ padding: "14px 16px", fontSize: "0.85rem", color: "#475569", textAlign: "center" }}>{s.totalPreguntas}</td>
                    <td style={{ padding: "14px 16px", fontSize: "0.85rem", color: "#475569" }}>{s.duracionMinutos} min</td>
                    <td style={{ padding: "14px 16px" }}>
                      <span style={{ display: "inline-block", padding: "3px 10px", borderRadius: 20, fontSize: "0.75rem", fontWeight: 600, background: s.isPublished ? "#dcfce7" : "#f1f5f9", color: s.isPublished ? "#16a34a" : "#64748b" }}>
                        {s.isPublished ? "● Publicado" : "○ Borrador"}
                      </span>
                    </td>
                    <td style={{ padding: "14px 16px", fontSize: "0.8rem", color: "#64748b" }}>{formatDate(s.createdAt)}</td>
                    <td style={{ padding: "14px 16px" }}>
                      <div style={{ display: "flex", gap: 6 }}>
                        <Link
                          href={`/school-admin/simulacros/${s.id}`}
                          style={{ padding: "6px 12px", background: "#f5f3ff", color: "#6d28d9", border: "1px solid #ddd6fe", borderRadius: 8, fontSize: "0.78rem", fontWeight: 600, textDecoration: "none" }}
                        >
                          Editar
                        </Link>
                        <Link
                          href={`/school-admin/asignaciones?simulacroId=${s.id}`}
                          style={{ padding: "6px 12px", background: "#f5f3ff", color: "#7c3aed", border: "1px solid #ddd6fe", borderRadius: 8, fontSize: "0.78rem", fontWeight: 600, textDecoration: "none" }}
                        >
                          Asignar
                        </Link>
                        <button
                          onClick={() => togglePublish(s)}
                          disabled={togglingId === s.id}
                          style={{ padding: "6px 12px", background: s.isPublished ? "#fff7ed" : "#f0fdf4", color: s.isPublished ? "#c2410c" : "#16a34a", border: `1px solid ${s.isPublished ? "#fed7aa" : "#bbf7d0"}`, borderRadius: 8, fontSize: "0.78rem", fontWeight: 600, cursor: "pointer" }}
                        >
                          {togglingId === s.id ? "..." : s.isPublished ? "Despublicar" : "Publicar"}
                        </button>
                        <button
                          onClick={() => deleteSimulacro(s)}
                          disabled={deletingId === s.id}
                          title="Eliminar simulacro"
                          style={{ padding: "6px 10px", background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca", borderRadius: 8, cursor: deletingId === s.id ? "not-allowed" : "pointer", display: "flex", alignItems: "center" }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>
    </div>
  );
}
