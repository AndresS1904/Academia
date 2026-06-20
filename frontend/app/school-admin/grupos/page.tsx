"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import SchoolAdminSidebar from "@/components/school-admin/SchoolAdminSidebar";
import { Trash2 } from "lucide-react";

interface Group {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
  _count: { members: number };
}

const formatDate = (d: string) =>
  new Date(d).toLocaleDateString("es-CO", { day: "numeric", month: "short", year: "numeric" });

export default function GruposPage() {
  const { user } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);

  // Create form
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  useEffect(() => {
    if (!user) return;
    api.get<Group[]>("/groups").then(setGroups).finally(() => setLoading(false));
  }, [user]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setCreateError("");
    try {
      const g = await api.post<Group>("/groups", { name, description });
      setGroups(prev => [{ ...g, _count: { members: 0 } }, ...prev]);
      setName("");
      setDescription("");
      setShowForm(false);
    } catch (err: any) {
      setCreateError(err.message ?? "Error al crear grupo");
    }
    setCreating(false);
  }

  async function handleDelete(g: Group) {
    if (!confirm(`¿Desactivar el grupo "${g.name}"?`)) return;
    try {
      await api.delete(`/groups/${g.id}`);
      setGroups(prev => prev.map(x => x.id === g.id ? { ...x, isActive: false } : x));
    } catch (err: any) {
      alert(err.message ?? "Error al desactivar");
    }
  }

  const active = groups.filter(g => g.isActive);
  const inactive = groups.filter(g => !g.isActive);

  return (
    <div style={{ minHeight: "100vh", background: "#f0f4ff" }}>
      <SchoolAdminSidebar />
      <main style={{ marginLeft: 260, padding: "32px 36px", minHeight: "100vh", boxSizing: "border-box" }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
          <div>
            <h1 style={{ fontSize: "1.5rem", fontWeight: 800, color: "#1e293b", margin: 0 }}>Grupos</h1>
            <p style={{ color: "#64748b", fontSize: "0.875rem", margin: "4px 0 0" }}>
              Organiza estudiantes en grupos para asignaciones masivas.
            </p>
          </div>
          <button
            onClick={() => setShowForm(v => !v)}
            style={{ padding: "10px 20px", background: "#7c3aed", color: "#fff", borderRadius: 12, border: "none", fontWeight: 700, fontSize: "0.9rem", cursor: "pointer" }}
          >
            + Nuevo grupo
          </button>
        </div>

        {/* Create form */}
        {showForm && (
          <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e2eaf7", padding: 24, marginBottom: 24 }}>
            <h2 style={{ fontSize: "1rem", fontWeight: 700, color: "#1e293b", margin: "0 0 16px" }}>Crear grupo</h2>
            <form onSubmit={handleCreate} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 600, color: "#475569", marginBottom: 5 }}>Nombre *</label>
                <input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Ej: Pre ICFES 2026"
                  required
                  style={{ width: "100%", maxWidth: 400, padding: "9px 12px", border: "1px solid #dde4f0", borderRadius: 9, fontSize: "0.875rem", outline: "none", boxSizing: "border-box" }}
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 600, color: "#475569", marginBottom: 5 }}>Descripción</label>
                <input
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Opcional"
                  style={{ width: "100%", maxWidth: 400, padding: "9px 12px", border: "1px solid #dde4f0", borderRadius: 9, fontSize: "0.875rem", outline: "none", boxSizing: "border-box" }}
                />
              </div>
              {createError && <p style={{ color: "#dc2626", fontSize: "0.82rem", margin: 0 }}>⚠ {createError}</p>}
              <div style={{ display: "flex", gap: 10 }}>
                <button type="submit" disabled={creating || !name.trim()} style={{ padding: "9px 22px", background: "#7c3aed", color: "#fff", border: "none", borderRadius: 9, fontWeight: 700, cursor: "pointer", fontSize: "0.875rem" }}>
                  {creating ? "Creando..." : "Crear grupo"}
                </button>
                <button type="button" onClick={() => setShowForm(false)} style={{ padding: "9px 16px", background: "#f1f5f9", color: "#475569", border: "none", borderRadius: 9, fontWeight: 600, cursor: "pointer", fontSize: "0.875rem" }}>
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 24 }}>
          {[
            { label: "Total grupos", value: groups.length, color: "#7c3aed", bg: "#f5f3ff", border: "#ddd6fe" },
            { label: "Activos", value: active.length, color: "#16a34a", bg: "#f0fdf4", border: "#bbf7d0" },
            { label: "Total estudiantes", value: groups.reduce((s, g) => s + (g._count?.members ?? 0), 0), color: "#004aad", bg: "#eff6ff", border: "#bfdbfe" },
          ].map(c => (
            <div key={c.label} style={{ background: c.bg, border: `1px solid ${c.border}`, borderRadius: 14, padding: "18px 22px" }}>
              <div style={{ fontSize: "1.8rem", fontWeight: 800, color: c.color }}>{c.value}</div>
              <div style={{ fontSize: "0.8rem", color: c.color, fontWeight: 600, marginTop: 2 }}>{c.label}</div>
            </div>
          ))}
        </div>

        {/* Table */}
        <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e2eaf7", overflow: "hidden" }}>
          {loading ? (
            <div style={{ padding: "56px 24px", textAlign: "center", color: "#64748b" }}>⏳ Cargando…</div>
          ) : active.length === 0 ? (
            <div style={{ padding: "56px 24px", textAlign: "center", color: "#94a3b8" }}>
              No tienes grupos aún.{" "}
              <button onClick={() => setShowForm(true)} style={{ color: "#7c3aed", fontWeight: 600, background: "none", border: "none", cursor: "pointer" }}>Crea el primero</button>
            </div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#f8faff", borderBottom: "1px solid #e2eaf7" }}>
                  {["Grupo", "Estudiantes", "Creado", "Estado", "Acciones"].map(h => (
                    <th key={h} style={{ padding: "14px 16px", textAlign: "left", fontSize: "0.78rem", fontWeight: 700, color: "#475569" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {active.map((g, idx) => (
                  <tr
                    key={g.id}
                    style={{ borderBottom: idx < active.length - 1 ? "1px solid #f1f5f9" : "none", transition: "background 0.15s" }}
                    onMouseEnter={e => (e.currentTarget.style.background = "#f8faff")}
                    onMouseLeave={e => (e.currentTarget.style.background = "")}
                  >
                    <td style={{ padding: "14px 16px" }}>
                      <div style={{ fontWeight: 700, color: "#1e293b", fontSize: "0.9rem" }}>{g.name}</div>
                      {g.description && <div style={{ fontSize: "0.75rem", color: "#94a3b8", marginTop: 2 }}>{g.description}</div>}
                    </td>
                    <td style={{ padding: "14px 16px", textAlign: "center" }}>
                      <span style={{ display: "inline-block", padding: "3px 12px", borderRadius: 20, background: "#eff6ff", color: "#1d4ed8", fontWeight: 700, fontSize: "0.85rem" }}>
                        {g._count.members}
                      </span>
                    </td>
                    <td style={{ padding: "14px 16px", fontSize: "0.8rem", color: "#64748b" }}>{formatDate(g.createdAt)}</td>
                    <td style={{ padding: "14px 16px" }}>
                      <span style={{ display: "inline-block", padding: "3px 10px", borderRadius: 20, fontSize: "0.75rem", fontWeight: 600, background: "#dcfce7", color: "#16a34a" }}>● Activo</span>
                    </td>
                    <td style={{ padding: "14px 16px" }}>
                      <div style={{ display: "flex", gap: 6 }}>
                        <Link
                          href={`/school-admin/grupos/${g.id}`}
                          style={{ padding: "6px 14px", background: "#f5f3ff", color: "#7c3aed", border: "1px solid #ddd6fe", borderRadius: 8, fontSize: "0.78rem", fontWeight: 600, textDecoration: "none" }}
                        >
                          Gestionar
                        </Link>
                        <button
                          onClick={() => handleDelete(g)}
                          title="Desactivar"
                          style={{ padding: "6px 10px", background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca", borderRadius: 8, cursor: "pointer", display: "flex", alignItems: "center" }}
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

        {/* Inactive groups */}
        {inactive.length > 0 && (
          <div style={{ marginTop: 24, padding: "14px 18px", background: "#f8fafc", borderRadius: 12, border: "1px solid #e2e8f0", fontSize: "0.8rem", color: "#94a3b8" }}>
            {inactive.length} grupo{inactive.length !== 1 ? "s" : ""} inactivo{inactive.length !== 1 ? "s" : ""} oculto{inactive.length !== 1 ? "s" : ""}.
          </div>
        )}
      </main>
    </div>
  );
}
