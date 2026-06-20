"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import SchoolAdminSidebar from "@/components/school-admin/SchoolAdminSidebar";

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "10px 14px", borderRadius: 10,
  border: "1px solid #e2eaf7", fontSize: "0.9rem", outline: "none",
  boxSizing: "border-box", background: "#fff",
};
const labelStyle: React.CSSProperties = {
  display: "block", fontSize: "0.82rem", fontWeight: 600, color: "#475569", marginBottom: 6,
};

interface Group { id: string; name: string; _count: { members: number } }

export default function NuevoEstudiantePage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [groups, setGroups] = useState<Group[]>([]);
  const [form, setForm] = useState({
    documento: "", firstName: "", lastName: "", email: "", phone: "", groupId: "",
  });

  useEffect(() => {
    api.get<Group[]>("/users/my-school/groups").then(setGroups).catch(() => {});
  }, []);

  function set(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.documento.trim()) { setError("El número de identificación es obligatorio."); return; }
    if (!form.firstName.trim() || !form.lastName.trim()) { setError("El nombre completo es obligatorio."); return; }
    if (!form.email.trim()) { setError("El correo es obligatorio."); return; }
    setSaving(true);
    setError("");
    try {
      await api.post("/users/my-school/students", {
        documento: form.documento.trim(),
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim().toLowerCase(),
        phone: form.phone.trim() || undefined,
        groupId: form.groupId || undefined,
      });
      router.push("/school-admin/estudiantes");
    } catch (e: any) {
      setError(e.message ?? "Error al crear el estudiante.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f0f4ff" }}>
      <SchoolAdminSidebar />
      <main style={{ marginLeft: 260, padding: "32px 36px", minHeight: "100vh", boxSizing: "border-box" }}>
        <Link href="/school-admin/estudiantes" style={{ fontSize: "0.875rem", color: "#64748b", textDecoration: "none", display: "inline-block", marginBottom: 24 }}>
          ← Volver a estudiantes
        </Link>

        <div style={{ maxWidth: 580, margin: "0 auto" }}>
          <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e2eaf7", boxShadow: "0 2px 8px rgba(0,74,173,0.06)", padding: "36px 40px" }}>
            <h1 style={{ fontSize: "1.3rem", fontWeight: 800, color: "#1e293b", margin: "0 0 6px" }}>Nuevo estudiante</h1>
            <p style={{ color: "#64748b", fontSize: "0.875rem", margin: "0 0 28px" }}>
              La contraseña inicial será el número de identificación. El estudiante deberá cambiarla en su primer acceso.
            </p>

            {error && (
              <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, padding: "12px 16px", marginBottom: 20, color: "#dc2626", fontSize: "0.875rem" }}>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

                {/* Identificación */}
                <div>
                  <label style={labelStyle}>Número de identificación <span style={{ color: "#dc2626" }}>*</span></label>
                  <input
                    type="text" value={form.documento}
                    onChange={e => set("documento", e.target.value)}
                    placeholder="Ej: 1053812345" required style={inputStyle}
                  />
                  <p style={{ fontSize: "0.72rem", color: "#94a3b8", margin: "4px 0 0" }}>
                    Se usará como usuario y contraseña inicial para el estudiante.
                  </p>
                </div>

                {/* Nombre y apellido */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                  <div>
                    <label style={labelStyle}>Nombres <span style={{ color: "#dc2626" }}>*</span></label>
                    <input type="text" value={form.firstName} onChange={e => set("firstName", e.target.value)} placeholder="Ana María" required style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Apellidos <span style={{ color: "#dc2626" }}>*</span></label>
                    <input type="text" value={form.lastName} onChange={e => set("lastName", e.target.value)} placeholder="García López" required style={inputStyle} />
                  </div>
                </div>

                {/* Correo */}
                <div>
                  <label style={labelStyle}>Correo electrónico <span style={{ color: "#dc2626" }}>*</span></label>
                  <input type="email" value={form.email} onChange={e => set("email", e.target.value)} placeholder="estudiante@colegio.edu.co" required style={inputStyle} />
                </div>

                {/* Teléfono */}
                <div>
                  <label style={labelStyle}>Teléfono</label>
                  <input type="tel" value={form.phone} onChange={e => set("phone", e.target.value)} placeholder="3001234567 (opcional)" style={inputStyle} />
                </div>

                {/* Grupo */}
                {groups.length > 0 && (
                  <div>
                    <label style={labelStyle}>Grupo académico</label>
                    <select value={form.groupId} onChange={e => set("groupId", e.target.value)} style={{ ...inputStyle, color: form.groupId ? "#1e293b" : "#94a3b8" }}>
                      <option value="">Sin grupo (opcional)</option>
                      {groups.map(g => (
                        <option key={g.id} value={g.id}>{g.name} ({g._count.members} miembros)</option>
                      ))}
                    </select>
                  </div>
                )}

                <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", marginTop: 8 }}>
                  <Link href="/school-admin/estudiantes" style={{ padding: "10px 20px", background: "#f1f5f9", color: "#475569", border: "1px solid #e2eaf7", borderRadius: 10, textDecoration: "none", fontWeight: 600, fontSize: "0.875rem" }}>
                    Cancelar
                  </Link>
                  <button
                    type="submit" disabled={saving}
                    style={{ padding: "10px 24px", background: "#004aad", color: "#fff", border: "none", borderRadius: 10, fontWeight: 700, fontSize: "0.9rem", cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1 }}
                  >
                    {saving ? "Creando…" : "Crear estudiante"}
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
