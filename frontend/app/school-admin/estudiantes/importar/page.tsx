"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import SchoolAdminSidebar from "@/components/school-admin/SchoolAdminSidebar";

interface Group { id: string; name: string; _count: { members: number } }
interface ImportError { row: number; field: string; message: string }
interface ImportResult { total: number; created: number; updated: number; errors: ImportError[] }

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";

export default function ImportarEstudiantesPage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [groupId, setGroupId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api.get<Group[]>("/users/my-school/groups").then(setGroups).catch(() => {});
  }, []);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    setFile(f);
    setResult(null);
    setError("");
  }

  async function downloadTemplate() {
    const res = await fetch(`${BASE}/users/my-school/import/template`, { credentials: "include" });
    if (!res.ok) { alert("Error al descargar la plantilla"); return; }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "plantilla_estudiantes.xlsx";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleImport(e: React.FormEvent) {
    e.preventDefault();
    if (!file) { setError("Selecciona un archivo Excel para importar."); return; }
    setImporting(true);
    setError("");
    setResult(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      if (groupId) fd.append("groupId", groupId);
      const data = await api.postForm<ImportResult>("/users/my-school/import", fd);
      setResult(data);
    } catch (e: any) {
      setError(e.message ?? "Error al procesar el archivo.");
    } finally {
      setImporting(false);
    }
  }

  function resetForm() {
    setFile(null);
    setResult(null);
    setError("");
    if (fileRef.current) fileRef.current.value = "";
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f0f4ff" }}>
      <SchoolAdminSidebar />
      <main style={{ marginLeft: 260, padding: "32px 36px", minHeight: "100vh", boxSizing: "border-box" }}>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28 }}>
          <div>
            <Link href="/school-admin/estudiantes" style={{ fontSize: "0.875rem", color: "#64748b", textDecoration: "none" }}>
              ← Volver a estudiantes
            </Link>
            <h1 style={{ fontSize: "1.5rem", fontWeight: 800, color: "#1e293b", margin: "8px 0 4px" }}>
              Importación masiva
            </h1>
            <p style={{ color: "#64748b", fontSize: "0.875rem", margin: 0 }}>
              Registra o actualiza cientos de estudiantes desde un archivo Excel.
            </p>
          </div>
          <button
            onClick={downloadTemplate}
            style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "10px 18px", background: "#fff", color: "#059669",
              border: "1.5px solid #059669", borderRadius: 10,
              fontWeight: 700, fontSize: "0.875rem", cursor: "pointer",
            }}
          >
            ⬇ Descargar plantilla
          </button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, alignItems: "start" }}>

          {/* Panel izquierdo: instrucciones + formulario */}
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

            {/* Instrucciones */}
            <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #e2eaf7", padding: 24 }}>
              <div style={{ fontWeight: 700, color: "#1e293b", marginBottom: 14, fontSize: "0.9rem" }}>
                Instrucciones
              </div>
              <ol style={{ margin: 0, paddingLeft: 20, display: "flex", flexDirection: "column", gap: 10, fontSize: "0.85rem", color: "#475569" }}>
                <li>Descarga la <strong>plantilla oficial</strong> usando el botón de arriba.</li>
                <li>Completa los datos: <strong>Identificacion, Nombres, Apellidos, Correo</strong> (obligatorios) y <strong>Telefono</strong> (opcional).</li>
                <li>Selecciona el <strong>grupo académico</strong> al que pertenecerán los estudiantes (opcional).</li>
                <li>Sube el archivo y confirma la importación.</li>
              </ol>
              <div style={{ marginTop: 16, background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 8, padding: "10px 14px" }}>
                <div style={{ fontWeight: 700, color: "#15803d", fontSize: "0.8rem", marginBottom: 4 }}>Comportamiento del sistema</div>
                <ul style={{ margin: 0, paddingLeft: 16, fontSize: "0.78rem", color: "#166534", lineHeight: 1.6 }}>
                  <li><strong>Nuevo estudiante:</strong> se crea la cuenta con contraseña = identificación.</li>
                  <li><strong>Estudiante existente:</strong> se actualizan sus datos (nombre, correo, teléfono).</li>
                  <li>El estudiante deberá cambiar su contraseña en el primer acceso.</li>
                </ul>
              </div>
            </div>

            {/* Formulario */}
            <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #e2eaf7", padding: 24 }}>
              <form onSubmit={handleImport}>
                <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>

                  {/* Grupo */}
                  <div>
                    <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 700, color: "#374151", marginBottom: 6 }}>
                      Grupo académico
                    </label>
                    {groups.length === 0 ? (
                      <p style={{ fontSize: "0.82rem", color: "#94a3b8", margin: 0 }}>
                        Sin grupos creados.{" "}
                        <Link href="/school-admin/grupos" style={{ color: "#004aad" }}>Crear grupo</Link>
                      </p>
                    ) : (
                      <select
                        value={groupId}
                        onChange={e => setGroupId(e.target.value)}
                        style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: "1px solid #e2eaf7", fontSize: "0.9rem", background: "#fff" }}
                      >
                        <option value="">Sin grupo (importar sin asignar)</option>
                        {groups.map(g => (
                          <option key={g.id} value={g.id}>{g.name} — {g._count.members} miembros</option>
                        ))}
                      </select>
                    )}
                    {groupId && (
                      <p style={{ fontSize: "0.75rem", color: "#059669", margin: "4px 0 0" }}>
                        Todos los estudiantes importados quedarán en este grupo.
                      </p>
                    )}
                  </div>

                  {/* Archivo */}
                  <div>
                    <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 700, color: "#374151", marginBottom: 6 }}>
                      Archivo Excel <span style={{ color: "#dc2626" }}>*</span>
                    </label>
                    <div
                      onClick={() => fileRef.current?.click()}
                      style={{
                        border: `2px dashed ${file ? "#059669" : "#e2eaf7"}`,
                        borderRadius: 12, padding: "28px 20px", textAlign: "center",
                        cursor: "pointer", background: file ? "#f0fdf4" : "#f8faff",
                        transition: "all 0.2s",
                      }}
                    >
                      {file ? (
                        <>
                          <div style={{ fontSize: "1.8rem", marginBottom: 8 }}>📄</div>
                          <div style={{ fontWeight: 700, color: "#059669", fontSize: "0.9rem" }}>{file.name}</div>
                          <div style={{ fontSize: "0.78rem", color: "#64748b", marginTop: 4 }}>
                            {(file.size / 1024).toFixed(0)} KB · Haz clic para cambiar
                          </div>
                        </>
                      ) : (
                        <>
                          <div style={{ fontSize: "2rem", marginBottom: 8, color: "#94a3b8" }}>📁</div>
                          <div style={{ fontWeight: 600, color: "#475569", fontSize: "0.9rem" }}>Haz clic para seleccionar</div>
                          <div style={{ fontSize: "0.78rem", color: "#94a3b8", marginTop: 4 }}>Excel (.xlsx, .xls) o CSV</div>
                        </>
                      )}
                    </div>
                    <input
                      ref={fileRef} type="file"
                      accept=".xlsx,.xls,.csv"
                      onChange={handleFileChange}
                      style={{ display: "none" }}
                    />
                  </div>

                  {error && (
                    <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, padding: "10px 14px", color: "#dc2626", fontSize: "0.875rem" }}>
                      {error}
                    </div>
                  )}

                  <div style={{ display: "flex", gap: 10 }}>
                    <button
                      type="submit" disabled={importing || !file}
                      style={{
                        flex: 1, padding: "12px 0", borderRadius: 10, border: "none",
                        background: importing || !file ? "#94a3b8" : "#004aad",
                        color: "#fff", fontWeight: 700, fontSize: "0.9rem",
                        cursor: importing || !file ? "not-allowed" : "pointer",
                      }}
                    >
                      {importing ? "Importando…" : "Importar estudiantes"}
                    </button>
                    {file && !importing && (
                      <button type="button" onClick={resetForm}
                        style={{ padding: "12px 16px", borderRadius: 10, border: "1px solid #e2eaf7", background: "#fff", color: "#64748b", cursor: "pointer", fontWeight: 600, fontSize: "0.875rem" }}
                      >
                        Limpiar
                      </button>
                    )}
                  </div>
                </div>
              </form>
            </div>
          </div>

          {/* Panel derecho: resultados */}
          <div>
            {!result ? (
              <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #e2eaf7", padding: 40, textAlign: "center", color: "#94a3b8" }}>
                <div style={{ fontSize: "3rem", marginBottom: 12 }}>📊</div>
                <div style={{ fontWeight: 600, fontSize: "1rem", color: "#64748b" }}>Resultados de la importación</div>
                <div style={{ fontSize: "0.85rem", marginTop: 8 }}>Aquí verás el resumen después de importar el archivo.</div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

                {/* Stats */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
                  {[
                    { label: "Total procesados", value: result.total, color: "#004aad", bg: "#eff6ff" },
                    { label: "Creados",           value: result.created, color: "#059669", bg: "#f0fdf4" },
                    { label: "Actualizados",      value: result.updated, color: "#7c3aed", bg: "#f5f3ff" },
                    { label: "Errores",           value: result.errors.length, color: result.errors.length ? "#dc2626" : "#94a3b8", bg: result.errors.length ? "#fef2f2" : "#f8faff" },
                  ].map(s => (
                    <div key={s.label} style={{ background: s.bg, borderRadius: 12, padding: "18px 16px", textAlign: "center" }}>
                      <div style={{ fontSize: "2rem", fontWeight: 900, color: s.color }}>{s.value}</div>
                      <div style={{ fontSize: "0.78rem", color: "#64748b", marginTop: 4, fontWeight: 600 }}>{s.label}</div>
                    </div>
                  ))}
                </div>

                {result.errors.length === 0 && (
                  <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 12, padding: "16px 20px", display: "flex", alignItems: "center", gap: 12 }}>
                    <span style={{ fontSize: "1.5rem" }}>✅</span>
                    <div>
                      <div style={{ fontWeight: 700, color: "#15803d" }}>Importación completada sin errores</div>
                      <div style={{ fontSize: "0.82rem", color: "#166534", marginTop: 2 }}>
                        {result.created} estudiante{result.created !== 1 ? "s" : ""} creado{result.created !== 1 ? "s" : ""}
                        {result.updated > 0 && `, ${result.updated} actualizado${result.updated !== 1 ? "s" : ""}`}.
                      </div>
                    </div>
                  </div>
                )}

                {/* Tabla de errores */}
                {result.errors.length > 0 && (
                  <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #fecaca", overflow: "hidden" }}>
                    <div style={{ background: "#fef2f2", padding: "12px 16px", fontWeight: 700, color: "#dc2626", fontSize: "0.85rem" }}>
                      ⚠ {result.errors.length} error{result.errors.length !== 1 ? "es" : ""} encontrado{result.errors.length !== 1 ? "s" : ""}
                    </div>
                    <div style={{ maxHeight: 300, overflowY: "auto" }}>
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem" }}>
                        <thead>
                          <tr style={{ background: "#fff5f5", borderBottom: "1px solid #fecaca" }}>
                            <th style={{ padding: "8px 12px", textAlign: "left", color: "#64748b", fontWeight: 600, width: 60 }}>Fila</th>
                            <th style={{ padding: "8px 12px", textAlign: "left", color: "#64748b", fontWeight: 600, width: 130 }}>Campo</th>
                            <th style={{ padding: "8px 12px", textAlign: "left", color: "#64748b", fontWeight: 600 }}>Problema</th>
                          </tr>
                        </thead>
                        <tbody>
                          {result.errors.map((err, i) => (
                            <tr key={i} style={{ borderBottom: "1px solid #fef2f2" }}>
                              <td style={{ padding: "8px 12px", color: "#dc2626", fontWeight: 700 }}>{err.row}</td>
                              <td style={{ padding: "8px 12px", color: "#475569", fontWeight: 600 }}>{err.field}</td>
                              <td style={{ padding: "8px 12px", color: "#64748b" }}>{err.message}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                <div style={{ display: "flex", gap: 10 }}>
                  <Link href="/school-admin/estudiantes" style={{
                    flex: 1, padding: "11px 0", background: "#004aad", color: "#fff",
                    borderRadius: 10, textDecoration: "none", fontWeight: 700,
                    fontSize: "0.875rem", textAlign: "center",
                  }}>
                    Ver estudiantes
                  </Link>
                  <button onClick={resetForm}
                    style={{ padding: "11px 16px", borderRadius: 10, border: "1px solid #e2eaf7", background: "#fff", color: "#64748b", cursor: "pointer", fontWeight: 600, fontSize: "0.875rem" }}
                  >
                    Nueva importación
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
