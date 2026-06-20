"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import SchoolAdminSidebar from "@/components/school-admin/SchoolAdminSidebar";

interface Student {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  documento: string | null;
  phone: string | null;
  isActive: boolean;
  createdAt: string;
  _count: { enrollments: number; simulacroAssignments: number };
}

const formatDate = (d: string) =>
  new Date(d).toLocaleDateString("es-CO", { day: "numeric", month: "short", year: "numeric" });

export default function SchoolAdminEstudiantesPage() {
  const { user } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [fetching, setFetching] = useState(true);
  const [search, setSearch] = useState("");

  const [resetModal, setResetModal]   = useState<Student | null>(null);
  const [editModal, setEditModal]     = useState<Student | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [editData, setEditData]       = useState({ firstName: "", lastName: "", email: "", documento: "", phone: "", isActive: true });
  const [saving, setSaving]           = useState(false);
  const [successMsg, setSuccessMsg]   = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    api.get<Student[]>("/users/my-school/students")
      .then(setStudents)
      .finally(() => setFetching(false));
  }, [user]);

  const filtered = students.filter(s =>
    search === "" ||
    `${s.firstName} ${s.lastName} ${s.email} ${s.documento ?? ""}`.toLowerCase().includes(search.toLowerCase())
  );

  async function handleResetPassword() {
    if (!resetModal || !newPassword.trim()) return;
    setSaving(true);
    try {
      await api.patch(`/users/my-school/students/${resetModal.id}/reset-password`, { newPassword });
      setSuccessMsg(`Contraseña reseteada para ${resetModal.firstName} ${resetModal.lastName}`);
      setResetModal(null);
      setNewPassword("");
    } catch (e: any) {
      alert(e.message ?? "Error al resetear la contraseña.");
    } finally {
      setSaving(false);
    }
  }

  function openEdit(s: Student) {
    setEditData({ firstName: s.firstName, lastName: s.lastName, email: s.email, documento: s.documento ?? "", phone: s.phone ?? "", isActive: s.isActive });
    setEditModal(s);
  }

  async function handleEditSave() {
    if (!editModal) return;
    setSaving(true);
    try {
      const updated = await api.patch<Student>(`/users/my-school/students/${editModal.id}`, {
        ...editData,
        documento: editData.documento || undefined,
        phone: editData.phone || undefined,
      });
      setStudents(prev => prev.map(s => s.id === editModal.id ? { ...s, ...updated } : s));
      setSuccessMsg(`Datos actualizados para ${editData.firstName} ${editData.lastName}`);
      setEditModal(null);
    } catch (e: any) {
      alert(e.message ?? "Error al actualizar el estudiante.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f0f4ff" }}>
      <SchoolAdminSidebar />
      <main style={{ marginLeft: 260, padding: "32px 36px", minHeight: "100vh", boxSizing: "border-box" }}>

        {successMsg && (
          <div style={{ position: "fixed", top: 24, right: 24, zIndex: 9999, background: "#059669", color: "#fff", padding: "14px 22px", borderRadius: 12, fontWeight: 600, fontSize: "0.875rem", boxShadow: "0 4px 20px rgba(0,0,0,0.15)" }}>
            ✓ {successMsg}
            <button onClick={() => setSuccessMsg(null)} style={{ marginLeft: 12, background: "none", border: "none", color: "#fff", cursor: "pointer", fontSize: "1rem" }}>×</button>
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28 }}>
          <div>
            <h1 style={{ fontSize: "1.5rem", fontWeight: 800, color: "#1e293b", margin: 0 }}>Estudiantes</h1>
            <p style={{ color: "#64748b", fontSize: "0.875rem", margin: "4px 0 0" }}>
              {students.length} estudiante{students.length !== 1 ? "s" : ""} registrados
            </p>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <Link
              href="/school-admin/estudiantes/importar"
              style={{ padding: "10px 16px", background: "#fff", color: "#059669", border: "1.5px solid #059669", borderRadius: 10, textDecoration: "none", fontWeight: 700, fontSize: "0.875rem" }}
            >
              ⬆ Importar masivo
            </Link>
            <Link
              href="/school-admin/estudiantes/nuevo"
              style={{ padding: "10px 20px", background: "#004aad", color: "#fff", borderRadius: 10, textDecoration: "none", fontWeight: 700, fontSize: "0.9rem" }}
            >
              + Nuevo estudiante
            </Link>
          </div>
        </div>

        <div style={{ marginBottom: 18 }}>
          <input
            type="text"
            placeholder="Buscar por nombre, identificación o correo…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ padding: "10px 14px", borderRadius: 10, border: "1px solid #e2eaf7", fontSize: "0.875rem", width: 360, outline: "none", background: "#fff" }}
          />
        </div>

        <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e2eaf7", boxShadow: "0 2px 8px rgba(0,74,173,0.06)", overflow: "hidden" }}>
          {fetching ? (
            <div style={{ padding: "56px 24px", textAlign: "center", color: "#64748b" }}>⏳ Cargando…</div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: "56px 24px", textAlign: "center", color: "#94a3b8" }}>
              {search ? "No hay resultados." : "No hay estudiantes registrados."}{" "}
              {!search && <Link href="/school-admin/estudiantes/nuevo" style={{ color: "#004aad", fontWeight: 600 }}>Agrega el primero</Link>}
            </div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#f8faff", borderBottom: "1px solid #e2eaf7" }}>
                  {["Identificación", "Nombre", "Correo", "Cursos", "Simulacros", "Estado", "Registrado", "Acciones"].map(h => (
                    <th key={h} style={{ padding: "12px 14px", textAlign: "left", fontSize: "0.77rem", fontWeight: 700, color: "#475569", whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((s, idx) => (
                  <tr
                    key={s.id}
                    style={{ borderBottom: idx < filtered.length - 1 ? "1px solid #f1f5f9" : "none", transition: "background 0.15s" }}
                    onMouseEnter={e => (e.currentTarget.style.background = "#f8faff")}
                    onMouseLeave={e => (e.currentTarget.style.background = "")}
                  >
                    <td style={{ padding: "12px 14px" }}>
                      {s.documento ? (
                        <span style={{ fontFamily: "monospace", fontSize: "0.82rem", background: "#f0f4ff", color: "#004aad", padding: "2px 8px", borderRadius: 6, fontWeight: 700 }}>
                          {s.documento}
                        </span>
                      ) : (
                        <span style={{ color: "#cbd5e1", fontSize: "0.78rem" }}>—</span>
                      )}
                    </td>
                    <td style={{ padding: "12px 14px", fontWeight: 600, color: "#1e293b", fontSize: "0.875rem" }}>
                      {s.firstName} {s.lastName}
                    </td>
                    <td style={{ padding: "12px 14px", fontSize: "0.82rem", color: "#475569", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.email}</td>
                    <td style={{ padding: "12px 14px", fontSize: "0.85rem", color: "#475569", textAlign: "center" }}>{s._count.enrollments}</td>
                    <td style={{ padding: "12px 14px", fontSize: "0.85rem", color: "#475569", textAlign: "center" }}>{s._count.simulacroAssignments}</td>
                    <td style={{ padding: "12px 14px" }}>
                      <span style={{ display: "inline-block", padding: "3px 10px", borderRadius: 20, fontSize: "0.75rem", fontWeight: 600, background: s.isActive ? "#dcfce7" : "#f1f5f9", color: s.isActive ? "#16a34a" : "#64748b" }}>
                        {s.isActive ? "● Activo" : "○ Inactivo"}
                      </span>
                    </td>
                    <td style={{ padding: "12px 14px", fontSize: "0.78rem", color: "#64748b" }}>{formatDate(s.createdAt)}</td>
                    <td style={{ padding: "12px 14px" }}>
                      <div style={{ display: "flex", gap: 5 }}>
                        <Link href={`/school-admin/estudiantes/${s.id}`}
                          style={{ padding: "5px 10px", background: "#eff6ff", color: "#004aad", border: "1px solid #bfdbfe", borderRadius: 8, fontSize: "0.75rem", fontWeight: 600, textDecoration: "none" }}>
                          Ver
                        </Link>
                        <button onClick={() => openEdit(s)}
                          style={{ padding: "5px 10px", background: "#f8faff", color: "#475569", border: "1px solid #e2eaf7", borderRadius: 8, fontSize: "0.75rem", fontWeight: 600, cursor: "pointer" }}>
                          Editar
                        </button>
                        <button onClick={() => { setResetModal(s); setNewPassword(""); }}
                          style={{ padding: "5px 10px", background: "#fff7ed", color: "#c2410c", border: "1px solid #fed7aa", borderRadius: 8, fontSize: "0.75rem", fontWeight: 600, cursor: "pointer" }}>
                          Contraseña
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

      {/* Modal: reset contraseña */}
      {resetModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9998 }}>
          <div style={{ background: "#fff", borderRadius: 20, padding: "36px 32px", maxWidth: 420, width: "100%", boxShadow: "0 24px 80px rgba(0,0,0,0.2)" }}>
            <h3 style={{ fontSize: "1.1rem", fontWeight: 800, color: "#1e293b", margin: "0 0 8px" }}>Resetear contraseña</h3>
            <p style={{ color: "#64748b", fontSize: "0.875rem", margin: "0 0 20px" }}>
              Establece una contraseña temporal para <strong>{resetModal.firstName} {resetModal.lastName}</strong>.
            </p>
            {resetModal.documento && (
              <div style={{ background: "#f0f4ff", border: "1px solid #bfdbfe", borderRadius: 8, padding: "8px 12px", marginBottom: 12, fontSize: "0.82rem", color: "#475569" }}>
                Sugerencia: usar su identificación <strong>{resetModal.documento}</strong> como contraseña temporal.
              </div>
            )}
            <input
              type="text" placeholder="Nueva contraseña temporal"
              value={newPassword} onChange={e => setNewPassword(e.target.value)}
              style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: "1px solid #e2eaf7", fontSize: "0.875rem", marginBottom: 20, boxSizing: "border-box", outline: "none" }}
            />
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button onClick={() => setResetModal(null)}
                style={{ padding: "10px 20px", background: "#f1f5f9", color: "#475569", border: "none", borderRadius: 10, fontWeight: 600, cursor: "pointer", fontSize: "0.875rem" }}>
                Cancelar
              </button>
              <button onClick={handleResetPassword} disabled={saving || !newPassword.trim()}
                style={{ padding: "10px 20px", background: "#c2410c", color: "#fff", border: "none", borderRadius: 10, fontWeight: 700, cursor: "pointer", fontSize: "0.875rem", opacity: (!newPassword.trim() || saving) ? 0.5 : 1 }}>
                {saving ? "Guardando…" : "Resetear contraseña"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: editar estudiante */}
      {editModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9998 }}>
          <div style={{ background: "#fff", borderRadius: 20, padding: "36px 32px", maxWidth: 500, width: "100%", boxShadow: "0 24px 80px rgba(0,0,0,0.2)" }}>
            <h3 style={{ fontSize: "1.1rem", fontWeight: 800, color: "#1e293b", margin: "0 0 20px" }}>Editar estudiante</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 20 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "#475569", display: "block", marginBottom: 4 }}>Nombres</label>
                  <input type="text" value={editData.firstName} onChange={e => setEditData(p => ({ ...p, firstName: e.target.value }))}
                    style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid #e2eaf7", fontSize: "0.875rem", boxSizing: "border-box", outline: "none" }} />
                </div>
                <div>
                  <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "#475569", display: "block", marginBottom: 4 }}>Apellidos</label>
                  <input type="text" value={editData.lastName} onChange={e => setEditData(p => ({ ...p, lastName: e.target.value }))}
                    style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid #e2eaf7", fontSize: "0.875rem", boxSizing: "border-box", outline: "none" }} />
                </div>
              </div>
              <div>
                <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "#475569", display: "block", marginBottom: 4 }}>Identificación</label>
                <input type="text" value={editData.documento} onChange={e => setEditData(p => ({ ...p, documento: e.target.value }))}
                  placeholder="Número de identificación"
                  style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid #e2eaf7", fontSize: "0.875rem", boxSizing: "border-box", outline: "none" }} />
              </div>
              <div>
                <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "#475569", display: "block", marginBottom: 4 }}>Correo electrónico</label>
                <input type="email" value={editData.email} onChange={e => setEditData(p => ({ ...p, email: e.target.value }))}
                  style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid #e2eaf7", fontSize: "0.875rem", boxSizing: "border-box", outline: "none" }} />
              </div>
              <div>
                <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "#475569", display: "block", marginBottom: 4 }}>Teléfono</label>
                <input type="tel" value={editData.phone} onChange={e => setEditData(p => ({ ...p, phone: e.target.value }))}
                  placeholder="(opcional)"
                  style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid #e2eaf7", fontSize: "0.875rem", boxSizing: "border-box", outline: "none" }} />
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <input type="checkbox" id="isActive" checked={editData.isActive} onChange={e => setEditData(p => ({ ...p, isActive: e.target.checked }))} />
                <label htmlFor="isActive" style={{ fontSize: "0.875rem", color: "#475569", cursor: "pointer" }}>Cuenta activa</label>
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button onClick={() => setEditModal(null)}
                style={{ padding: "10px 20px", background: "#f1f5f9", color: "#475569", border: "none", borderRadius: 10, fontWeight: 600, cursor: "pointer", fontSize: "0.875rem" }}>
                Cancelar
              </button>
              <button onClick={handleEditSave} disabled={saving}
                style={{ padding: "10px 20px", background: "#004aad", color: "#fff", border: "none", borderRadius: 10, fontWeight: 700, cursor: "pointer", fontSize: "0.875rem", opacity: saving ? 0.5 : 1 }}>
                {saving ? "Guardando…" : "Guardar cambios"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
