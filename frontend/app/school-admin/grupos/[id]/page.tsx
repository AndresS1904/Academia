"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import SchoolAdminSidebar from "@/components/school-admin/SchoolAdminSidebar";
import { Trash2, Upload, Download, Users } from "lucide-react";

interface Group {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
}

interface Member {
  id: string;
  addedAt: string;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    isActive: boolean;
    documento?: string;
    phone?: string;
    _count: { enrollments: number; simulacroAssignments: number };
  };
}

interface ImportError { row: number; email?: string; reason: string }
interface ImportResult {
  success: number;
  failed: number;
  errors: ImportError[];
  passwords: { nombre: string; email: string; password: string }[];
}

interface StudentBasic { id: string; firstName: string; lastName: string; email: string; documento?: string }
interface CourseOption  { id: string; title: string }
interface SimOption     { id: string; titulo: string; emoji: string }

interface Analytics {
  totalMembers: number;
  totalWithScores: number;
  avgScore: number | null;
  passRate: number | null;
  bySimulacro: { id: string; titulo: string; emoji: string; totalAsignados: number; totalCompletados: number; avgScore: number | null; passRate: number | null }[];
  topStudents: { id: string; nombre: string; email: string; avgScore: number; total: number }[];
  bottomStudents: { id: string; nombre: string; email: string; avgScore: number; total: number }[];
}

const BASE_API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";

const formatDate = (d: string) =>
  new Date(d).toLocaleDateString("es-CO", { day: "numeric", month: "short", year: "numeric" });

type Tab = "members" | "import" | "assign" | "analytics";

export default function GroupDetailPage() {
  const { user } = useAuth();
  const params = useParams();
  const groupId = params.id as string;

  const [group, setGroup] = useState<Group | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("members");

  // Import state
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [updateExisting, setUpdateExisting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [importError, setImportError] = useState("");

  // Assign state
  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [sims, setSims] = useState<SimOption[]>([]);
  const [selectedCourse, setSelectedCourse] = useState("");
  const [selectedSim, setSelectedSim] = useState("");
  const [simDueDate, setSimDueDate] = useState("");
  const [assigning, setAssigning] = useState<"course" | "sim" | null>(null);
  const [assignResult, setAssignResult] = useState<string>("");

  // Add existing student
  const [allStudents, setAllStudents] = useState<StudentBasic[]>([]);
  const [studentSearch, setStudentSearch] = useState("");
  const [addingStudentId, setAddingStudentId] = useState<string | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);

  // Remove member
  const [removingId, setRemovingId] = useState<string | null>(null);

  // Analytics
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [exportingStudents, setExportingStudents] = useState(false);
  const [exportingSims, setExportingSims] = useState(false);

  useEffect(() => {
    if (!user || !groupId) return;
    Promise.all([
      api.get<Group>(`/groups/${groupId}`).catch(() => null),
      api.get<Member[]>(`/groups/${groupId}/members`),
      api.get<StudentBasic[]>("/users/my-school/students").catch(() => []),
    ]).then(([g, m, students]) => {
      if (g) setGroup(g);
      setMembers(m);
      setAllStudents(students);
    }).finally(() => setLoading(false));
  }, [user, groupId]);

  // Load courses & simulacros when Assign tab is opened
  useEffect(() => {
    if (tab !== "assign" || !user) return;
    Promise.all([
      api.get<CourseOption[]>("/courses/admin/all").catch(() => []),
      api.get<SimOption[]>("/simulacros/admin/all").catch(() => []),
    ]).then(([c, s]) => {
      setCourses(c.filter((x: any) => x.isPublished));
      setSims(s.filter((x: any) => x.isPublished));
    });
  }, [tab, user]);

  async function handleAddExisting(student: StudentBasic) {
    setAddingStudentId(student.id);
    try {
      await api.post(`/groups/${groupId}/members`, { userId: student.id });
      const m = await api.get<Member[]>(`/groups/${groupId}/members`);
      setMembers(m);
      setStudentSearch("");
      setShowDropdown(false);
    } catch (e: any) { alert(e.message ?? "Error al agregar estudiante"); }
    setAddingStudentId(null);
  }

  async function handleRemoveMember(userId: string) {
    if (!confirm("¿Remover este estudiante del grupo?")) return;
    setRemovingId(userId);
    try {
      await api.delete(`/groups/${groupId}/members/${userId}`);
      setMembers(prev => prev.filter(m => m.user.id !== userId));
    } catch (e: any) { alert(e.message); }
    setRemovingId(null);
  }

  function handleFileDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) setSelectedFile(f);
  }

  async function handleImport() {
    if (!selectedFile) return;
    setImporting(true);
    setImportResult(null);
    setImportError("");
    try {
      const fd = new FormData();
      fd.append("file", selectedFile);
      const result = await api.upload<ImportResult>(
        `/groups/${groupId}/import?updateExisting=${updateExisting}`,
        fd,
      );
      setImportResult(result);
      // Refresh members
      api.get<Member[]>(`/groups/${groupId}/members`).then(setMembers);
    } catch (e: any) {
      setImportError(e.message ?? "Error al importar");
    }
    setImporting(false);
  }

  async function handleAssignCourse() {
    if (!selectedCourse) return;
    setAssigning("course");
    setAssignResult("");
    try {
      const r = await api.post<{ enrolled: number; skipped: number }>(`/groups/${groupId}/assign-course`, { courseId: selectedCourse });
      setAssignResult(`✓ ${r.enrolled} inscripci${r.enrolled !== 1 ? "ones" : "ón"} creada${r.enrolled !== 1 ? "s" : ""}. ${r.skipped} ya estaban inscritos.`);
      setSelectedCourse("");
    } catch (e: any) { setAssignResult(`⚠ ${e.message}`); }
    setAssigning(null);
  }

  async function handleAssignSim() {
    if (!selectedSim) return;
    setAssigning("sim");
    setAssignResult("");
    try {
      const r = await api.post<{ assigned: number; skipped: number }>(`/groups/${groupId}/assign-simulacro`, {
        simulacroId: selectedSim,
        ...(simDueDate ? { dueDate: simDueDate } : {}),
      });
      setAssignResult(`✓ ${r.assigned} asignaci${r.assigned !== 1 ? "ones" : "ón"} creada${r.assigned !== 1 ? "s" : ""}. ${r.skipped} ya estaban asignados.`);
      setSelectedSim("");
      setSimDueDate("");
    } catch (e: any) { setAssignResult(`⚠ ${e.message}`); }
    setAssigning(null);
  }

  // Load analytics when tab is opened
  useEffect(() => {
    if (tab !== "analytics" || !user || !groupId) return;
    setAnalyticsLoading(true);
    api.get<Analytics>(`/groups/${groupId}/analytics`)
      .then(setAnalytics)
      .finally(() => setAnalyticsLoading(false));
  }, [tab, user, groupId]);

  async function downloadCsv(path: string, filename: string, setLoading: (v: boolean) => void) {
    setLoading(true);
    try {
      const res = await fetch(`${BASE_API}${path}`, { credentials: "include" });
      if (!res.ok) throw new Error("Error al exportar");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = filename; a.click();
      URL.revokeObjectURL(url);
    } catch (e: any) { alert(e.message); }
    setLoading(false);
  }

  const tabStyle = (t: Tab): React.CSSProperties => ({
    padding: "9px 20px", borderRadius: 9, fontWeight: 600, fontSize: "0.875rem",
    cursor: "pointer", border: "none", background: tab === t ? "#7c3aed" : "#f1f5f9",
    color: tab === t ? "#fff" : "#475569",
  });

  if (loading) return (
    <div style={{ minHeight: "100vh", background: "#f0f4ff" }}>
      <SchoolAdminSidebar />
      <main style={{ marginLeft: 260, padding: "32px 36px" }}>
        <div style={{ padding: "80px 0", textAlign: "center", color: "#64748b" }}>⏳ Cargando…</div>
      </main>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "#f0f4ff" }}>
      <SchoolAdminSidebar />
      <main style={{ marginLeft: 260, padding: "32px 36px", minHeight: "100vh", boxSizing: "border-box" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 28 }}>
          <Link href="/school-admin/grupos" style={{ padding: "8px 14px", background: "#fff", border: "1px solid #e2eaf7", borderRadius: 10, color: "#475569", textDecoration: "none", fontSize: "0.85rem", fontWeight: 600 }}>
            ← Volver
          </Link>
          <div>
            <h1 style={{ fontSize: "1.5rem", fontWeight: 800, color: "#1e293b", margin: 0 }}>
              <Users size={20} style={{ display: "inline", marginRight: 8, verticalAlign: "middle" }} />
              {group?.name ?? "Grupo"}
            </h1>
            {group?.description && <p style={{ color: "#64748b", fontSize: "0.875rem", margin: "4px 0 0" }}>{group.description}</p>}
          </div>
          <span style={{ marginLeft: "auto", padding: "4px 14px", borderRadius: 20, background: "#eff6ff", color: "#1d4ed8", fontWeight: 700, fontSize: "0.875rem" }}>
            {members.length} estudiante{members.length !== 1 ? "s" : ""}
          </span>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 8, marginBottom: 24, flexWrap: "wrap", alignItems: "center" }}>
          <button style={tabStyle("members")} onClick={() => setTab("members")}>👥 Miembros</button>
          <button style={tabStyle("import")} onClick={() => setTab("import")}>📥 Importar</button>
          <button style={tabStyle("assign")} onClick={() => setTab("assign")}>📌 Asignar</button>
          <button style={tabStyle("analytics")} onClick={() => setTab("analytics")}>📊 Analytics</button>
          <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
            <button
              onClick={() => downloadCsv(`/groups/${groupId}/export/students`, `estudiantes_${group?.name ?? groupId}.csv`, setExportingStudents)}
              disabled={exportingStudents}
              style={{ padding: "8px 14px", background: "#f0fdf4", color: "#16a34a", border: "1px solid #bbf7d0", borderRadius: 9, fontSize: "0.8rem", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 5 }}
            >
              <Download size={14} /> {exportingStudents ? "…" : "CSV Estudiantes"}
            </button>
            <button
              onClick={() => downloadCsv(`/groups/${groupId}/export/simulacros`, `simulacros_${group?.name ?? groupId}.csv`, setExportingSims)}
              disabled={exportingSims}
              style={{ padding: "8px 14px", background: "#eff6ff", color: "#004aad", border: "1px solid #bfdbfe", borderRadius: 9, fontSize: "0.8rem", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 5 }}
            >
              <Download size={14} /> {exportingSims ? "…" : "CSV Simulacros"}
            </button>
          </div>
        </div>

        {/* ── MIEMBROS ── */}
        {tab === "members" && (
          <>
            {/* Agregar estudiante existente */}
            <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e2eaf7", padding: "16px 20px", marginBottom: 16 }}>
              <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "#1e293b", marginBottom: 10 }}>
                Agregar estudiante existente
              </div>
              <div style={{ position: "relative" }}>
                <input
                  type="text"
                  placeholder="Buscar por nombre, apellido o email…"
                  value={studentSearch}
                  onChange={e => { setStudentSearch(e.target.value); setShowDropdown(true); }}
                  onFocus={() => setShowDropdown(true)}
                  onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
                  style={{ width: "100%", maxWidth: 480, padding: "9px 14px", border: "1px solid #dde4f0", borderRadius: 9, fontSize: "0.875rem", outline: "none", boxSizing: "border-box" }}
                />
                {showDropdown && studentSearch.trim().length > 0 && (() => {
                  const memberIds = new Set(members.map(m => m.user.id));
                  const q = studentSearch.toLowerCase();
                  const results = allStudents.filter(s =>
                    !memberIds.has(s.id) && (
                      s.firstName.toLowerCase().includes(q) ||
                      s.lastName.toLowerCase().includes(q) ||
                      s.email.toLowerCase().includes(q) ||
                      (s.documento ?? "").includes(q)
                    )
                  ).slice(0, 8);
                  if (results.length === 0) return (
                    <div style={{ position: "absolute", top: "100%", left: 0, width: 480, background: "#fff", border: "1px solid #e2eaf7", borderRadius: 10, boxShadow: "0 4px 16px rgba(0,0,0,0.08)", zIndex: 50, padding: "14px 16px", fontSize: "0.82rem", color: "#94a3b8" }}>
                      Sin resultados — puede que ya esté en el grupo o no exista.
                    </div>
                  );
                  return (
                    <div style={{ position: "absolute", top: "100%", left: 0, width: 480, background: "#fff", border: "1px solid #e2eaf7", borderRadius: 10, boxShadow: "0 4px 16px rgba(0,0,0,0.08)", zIndex: 50, overflow: "hidden" }}>
                      {results.map((s, i) => (
                        <div
                          key={s.id}
                          style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", borderTop: i > 0 ? "1px solid #f1f5f9" : "none", gap: 10 }}
                        >
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: "0.875rem", fontWeight: 600, color: "#1e293b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {s.firstName} {s.lastName}
                            </div>
                            <div style={{ fontSize: "0.75rem", color: "#94a3b8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {s.email}{s.documento ? ` · ${s.documento}` : ""}
                            </div>
                          </div>
                          <button
                            onMouseDown={() => handleAddExisting(s)}
                            disabled={addingStudentId === s.id}
                            style={{ padding: "5px 14px", background: "#f5f3ff", color: "#7c3aed", border: "1px solid #ddd6fe", borderRadius: 8, fontWeight: 700, fontSize: "0.78rem", cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0 }}
                          >
                            {addingStudentId === s.id ? "..." : "+ Agregar"}
                          </button>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            </div>

          <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e2eaf7", overflow: "hidden" }}>
            {members.length === 0 ? (
              <div style={{ padding: "56px 24px", textAlign: "center", color: "#94a3b8" }}>
                No hay estudiantes en este grupo. Usa{" "}
                <button onClick={() => setTab("import")} style={{ color: "#7c3aed", fontWeight: 600, background: "none", border: "none", cursor: "pointer" }}>Importar estudiantes</button>{" "}
                o agrega uno arriba.
              </div>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "#f8faff", borderBottom: "1px solid #e2eaf7" }}>
                    {["Estudiante", "Documento", "Email", "Cursos", "Simulacros", ""].map(h => (
                      <th key={h} style={{ padding: "13px 16px", textAlign: "left", fontSize: "0.78rem", fontWeight: 700, color: "#475569" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {members.map((m, idx) => (
                    <tr
                      key={m.id}
                      style={{ borderBottom: idx < members.length - 1 ? "1px solid #f1f5f9" : "none", transition: "background 0.15s" }}
                      onMouseEnter={e => (e.currentTarget.style.background = "#f8faff")}
                      onMouseLeave={e => (e.currentTarget.style.background = "")}
                    >
                      <td style={{ padding: "13px 16px" }}>
                        <div style={{ fontWeight: 600, color: "#1e293b", fontSize: "0.875rem" }}>
                          {m.user.firstName} {m.user.lastName}
                        </div>
                        <div style={{ fontSize: "0.75rem", color: "#94a3b8" }}>{m.user.phone ?? ""}</div>
                      </td>
                      <td style={{ padding: "13px 16px", fontSize: "0.82rem", color: "#64748b" }}>{m.user.documento ?? "—"}</td>
                      <td style={{ padding: "13px 16px", fontSize: "0.82rem", color: "#64748b" }}>{m.user.email}</td>
                      <td style={{ padding: "13px 16px", textAlign: "center" }}>
                        <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "#004aad" }}>{m.user._count.enrollments}</span>
                      </td>
                      <td style={{ padding: "13px 16px", textAlign: "center" }}>
                        <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "#7c3aed" }}>{m.user._count.simulacroAssignments}</span>
                      </td>
                      <td style={{ padding: "13px 16px" }}>
                        <button
                          onClick={() => handleRemoveMember(m.user.id)}
                          disabled={removingId === m.user.id}
                          title="Remover del grupo"
                          style={{ padding: "5px 9px", background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca", borderRadius: 7, cursor: "pointer", display: "flex", alignItems: "center" }}
                        >
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          </>
        )}

        {/* ── IMPORTAR ── */}
        {tab === "import" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 20, alignItems: "start" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

              {/* Step 1: Download template */}
              <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e2eaf7", padding: 22 }}>
                <h3 style={{ fontSize: "0.9rem", fontWeight: 700, color: "#1e293b", margin: "0 0 10px" }}>
                  1. Descarga la plantilla
                </h3>
                <p style={{ fontSize: "0.82rem", color: "#64748b", margin: "0 0 14px" }}>
                  Usa la plantilla oficial para garantizar un formato correcto. Columnas: <strong>Nombre, Apellido, Email, Documento, Telefono</strong>.
                </p>
                <a
                  href={`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api"}/groups/import/template`}
                  download="plantilla_estudiantes.xlsx"
                  style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "9px 18px", background: "#eff6ff", color: "#1d4ed8", border: "1px solid #bfdbfe", borderRadius: 9, textDecoration: "none", fontWeight: 600, fontSize: "0.85rem" }}
                >
                  <Download size={15} /> Descargar plantilla Excel
                </a>
              </div>

              {/* Step 2: Upload */}
              <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e2eaf7", padding: 22 }}>
                <h3 style={{ fontSize: "0.9rem", fontWeight: 700, color: "#1e293b", margin: "0 0 10px" }}>
                  2. Sube tu archivo
                </h3>

                {/* Drag & drop zone */}
                <div
                  onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleFileDrop}
                  onClick={() => fileRef.current?.click()}
                  style={{
                    border: `2px dashed ${dragOver ? "#7c3aed" : "#c4b5fd"}`,
                    borderRadius: 12,
                    padding: "32px 20px",
                    textAlign: "center",
                    background: dragOver ? "#faf5ff" : "#fefbff",
                    cursor: "pointer",
                    transition: "all 0.15s",
                    marginBottom: 14,
                  }}
                >
                  <Upload size={28} style={{ color: "#a78bfa", marginBottom: 8 }} />
                  <div style={{ fontWeight: 600, color: "#4c1d95", fontSize: "0.9rem" }}>
                    {selectedFile ? selectedFile.name : "Arrastra tu archivo aquí o haz clic para seleccionar"}
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "#94a3b8", marginTop: 4 }}>
                    Formatos: .xlsx, .xls, .csv — Máx. 5 MB
                  </div>
                </div>
                <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" style={{ display: "none" }}
                  onChange={e => { if (e.target.files?.[0]) setSelectedFile(e.target.files[0]); }} />

                {/* Options */}
                <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", marginBottom: 16, fontSize: "0.85rem", color: "#475569", fontWeight: 500 }}>
                  <input type="checkbox" checked={updateExisting} onChange={e => setUpdateExisting(e.target.checked)} />
                  Actualizar datos de estudiantes que ya existen
                </label>

                {importError && (
                  <div style={{ padding: "10px 14px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 9, color: "#dc2626", fontSize: "0.85rem", marginBottom: 14 }}>
                    ⚠ {importError}
                  </div>
                )}

                <button
                  onClick={handleImport}
                  disabled={!selectedFile || importing}
                  style={{ padding: "11px 28px", background: importing ? "#c4b5fd" : "#7c3aed", color: "#fff", border: "none", borderRadius: 10, fontWeight: 700, fontSize: "0.9rem", cursor: !selectedFile || importing ? "not-allowed" : "pointer" }}
                >
                  {importing ? "Importando..." : "Importar estudiantes"}
                </button>
              </div>

              {/* Results */}
              {importResult && (
                <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e2eaf7", padding: 22 }}>
                  <h3 style={{ fontSize: "0.9rem", fontWeight: 700, color: "#1e293b", margin: "0 0 14px" }}>
                    Resultado de importación
                  </h3>
                  <div style={{ display: "flex", gap: 14, marginBottom: 16 }}>
                    <div style={{ flex: 1, padding: "14px", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 10, textAlign: "center" }}>
                      <div style={{ fontSize: "1.6rem", fontWeight: 800, color: "#16a34a" }}>{importResult.success}</div>
                      <div style={{ fontSize: "0.78rem", color: "#16a34a", fontWeight: 600 }}>Exitosos</div>
                    </div>
                    <div style={{ flex: 1, padding: "14px", background: importResult.failed > 0 ? "#fef2f2" : "#f1f5f9", border: `1px solid ${importResult.failed > 0 ? "#fecaca" : "#e2e8f0"}`, borderRadius: 10, textAlign: "center" }}>
                      <div style={{ fontSize: "1.6rem", fontWeight: 800, color: importResult.failed > 0 ? "#dc2626" : "#94a3b8" }}>{importResult.failed}</div>
                      <div style={{ fontSize: "0.78rem", color: importResult.failed > 0 ? "#dc2626" : "#94a3b8", fontWeight: 600 }}>Fallidos</div>
                    </div>
                  </div>

                  {/* Errors */}
                  {importResult.errors.length > 0 && (
                    <div>
                      <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "#dc2626", marginBottom: 8 }}>Errores encontrados:</div>
                      <div style={{ maxHeight: 200, overflowY: "auto", borderRadius: 9, border: "1px solid #fecaca" }}>
                        {importResult.errors.map((err, i) => (
                          <div key={i} style={{ padding: "8px 12px", borderBottom: i < importResult.errors.length - 1 ? "1px solid #fef2f2" : "none", fontSize: "0.8rem" }}>
                            <span style={{ color: "#dc2626", fontWeight: 700 }}>Fila {err.row}</span>
                            {err.email && <span style={{ color: "#64748b" }}> — {err.email}</span>}
                            <span style={{ color: "#475569" }}>: {err.reason}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Passwords */}
                  {importResult.passwords.length > 0 && (
                    <div style={{ marginTop: 14 }}>
                      <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "#1e293b", marginBottom: 8 }}>
                        Contraseñas generadas para nuevos estudiantes:
                      </div>
                      <div style={{ maxHeight: 200, overflowY: "auto", borderRadius: 9, border: "1px solid #e2eaf7", fontSize: "0.78rem" }}>
                        {importResult.passwords.map((p, i) => (
                          <div key={i} style={{ padding: "7px 12px", borderBottom: i < importResult.passwords.length - 1 ? "1px solid #f1f5f9" : "none", display: "flex", justifyContent: "space-between" }}>
                            <span style={{ color: "#475569" }}>{p.nombre} — {p.email}</span>
                            <span style={{ fontFamily: "monospace", fontWeight: 700, color: "#7c3aed" }}>{p.password}</span>
                          </div>
                        ))}
                      </div>
                      <div style={{ fontSize: "0.75rem", color: "#94a3b8", marginTop: 6 }}>
                        ⚠ Guarda estas contraseñas. No se mostrarán de nuevo. Los estudiantes deberán cambiarlas al iniciar sesión.
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Right: instructions */}
            <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e2eaf7", padding: 22 }}>
              <h3 style={{ fontSize: "0.85rem", fontWeight: 700, color: "#475569", margin: "0 0 14px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Instrucciones</h3>
              {[
                { n: "1", t: "Descarga la plantilla Excel", d: "Usa la plantilla oficial para evitar errores de formato." },
                { n: "2", t: "Completa los datos", d: "Nombre y Email son obligatorios. Documento y Teléfono son opcionales." },
                { n: "3", t: "Sube el archivo", d: "Arrastra el archivo o selecciónalo. Soporta .xlsx, .xls y .csv." },
                { n: "4", t: "Importa", d: "El sistema crea los estudiantes y los agrega automáticamente a este grupo." },
                { n: "5", t: "Guarda las contraseñas", d: "Se generan contraseñas aleatorias para nuevos estudiantes. No se pueden recuperar después." },
              ].map(s => (
                <div key={s.n} style={{ display: "flex", gap: 12, marginBottom: 14 }}>
                  <div style={{ width: 24, height: 24, borderRadius: "50%", background: "#f5f3ff", border: "1px solid #ddd6fe", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.72rem", fontWeight: 800, color: "#7c3aed", flexShrink: 0 }}>
                    {s.n}
                  </div>
                  <div>
                    <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "#1e293b" }}>{s.t}</div>
                    <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: 2 }}>{s.d}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── ASIGNAR CONTENIDO ── */}
        {tab === "assign" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>

            {/* Assign Course */}
            <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e2eaf7", padding: 24 }}>
              <h3 style={{ fontSize: "1rem", fontWeight: 700, color: "#1e293b", margin: "0 0 6px" }}>📚 Asignar curso</h3>
              <p style={{ fontSize: "0.82rem", color: "#64748b", margin: "0 0 18px" }}>
                Inscribe a todos los <strong>{members.length} estudiantes</strong> del grupo en el curso seleccionado.
              </p>
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 600, color: "#475569", marginBottom: 6 }}>Curso</label>
                <select
                  value={selectedCourse}
                  onChange={e => setSelectedCourse(e.target.value)}
                  style={{ width: "100%", padding: "9px 12px", border: "1px solid #dde4f0", borderRadius: 9, fontSize: "0.875rem", color: "#1e293b", outline: "none" }}
                >
                  <option value="">— Seleccionar curso —</option>
                  {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                </select>
              </div>
              <button
                onClick={handleAssignCourse}
                disabled={!selectedCourse || assigning === "course" || members.length === 0}
                style={{ padding: "10px 22px", background: assigning === "course" ? "#93c5fd" : "#004aad", color: "#fff", border: "none", borderRadius: 9, fontWeight: 700, fontSize: "0.875rem", cursor: !selectedCourse || assigning !== null ? "not-allowed" : "pointer" }}
              >
                {assigning === "course" ? "Inscribiendo..." : `Inscribir ${members.length} estudiantes`}
              </button>
            </div>

            {/* Assign Simulacro */}
            <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e2eaf7", padding: 24 }}>
              <h3 style={{ fontSize: "1rem", fontWeight: 700, color: "#1e293b", margin: "0 0 6px" }}>📋 Asignar simulacro</h3>
              <p style={{ fontSize: "0.82rem", color: "#64748b", margin: "0 0 18px" }}>
                Asigna un simulacro a todos los <strong>{members.length} estudiantes</strong> del grupo.
              </p>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 600, color: "#475569", marginBottom: 6 }}>Simulacro</label>
                <select
                  value={selectedSim}
                  onChange={e => setSelectedSim(e.target.value)}
                  style={{ width: "100%", padding: "9px 12px", border: "1px solid #dde4f0", borderRadius: 9, fontSize: "0.875rem", color: "#1e293b", outline: "none" }}
                >
                  <option value="">— Seleccionar simulacro —</option>
                  {sims.map(s => <option key={s.id} value={s.id}>{s.emoji} {s.titulo}</option>)}
                </select>
              </div>
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 600, color: "#475569", marginBottom: 6 }}>Fecha límite (opcional)</label>
                <input
                  type="datetime-local"
                  value={simDueDate}
                  onChange={e => setSimDueDate(e.target.value)}
                  style={{ width: "100%", padding: "9px 12px", border: "1px solid #dde4f0", borderRadius: 9, fontSize: "0.875rem", color: "#1e293b", outline: "none" }}
                />
              </div>
              <button
                onClick={handleAssignSim}
                disabled={!selectedSim || assigning === "sim" || members.length === 0}
                style={{ padding: "10px 22px", background: assigning === "sim" ? "#c4b5fd" : "#7c3aed", color: "#fff", border: "none", borderRadius: 9, fontWeight: 700, fontSize: "0.875rem", cursor: !selectedSim || assigning !== null ? "not-allowed" : "pointer" }}
              >
                {assigning === "sim" ? "Asignando..." : `Asignar a ${members.length} estudiantes`}
              </button>
            </div>

            {/* Assignment result */}
            {assignResult && (
              <div style={{ gridColumn: "1 / -1", padding: "12px 18px", borderRadius: 10, background: assignResult.startsWith("✓") ? "#f0fdf4" : "#fef2f2", border: `1px solid ${assignResult.startsWith("✓") ? "#bbf7d0" : "#fecaca"}`, color: assignResult.startsWith("✓") ? "#16a34a" : "#dc2626", fontSize: "0.875rem", fontWeight: 600 }}>
                {assignResult}
              </div>
            )}

            {members.length === 0 && (
              <div style={{ gridColumn: "1 / -1", padding: "20px", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 12, color: "#92400e", fontSize: "0.875rem" }}>
                ⚠ Este grupo no tiene estudiantes. Importa estudiantes primero antes de asignar contenido.
              </div>
            )}
          </div>
        )}

        {/* ── ANALYTICS ── */}
        {tab === "analytics" && (
          <div>
            {analyticsLoading ? (
              <div style={{ padding: "60px 0", textAlign: "center", color: "#64748b" }}>⏳ Cargando analytics…</div>
            ) : !analytics ? null : (
              <>
                {/* Stat cards */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}>
                  {[
                    { label: "Estudiantes", value: analytics.totalMembers, color: "#7c3aed", bg: "#f3f0ff" },
                    { label: "Con resultados", value: analytics.totalWithScores, color: "#004aad", bg: "#eff6ff" },
                    { label: "Prom. general", value: analytics.avgScore !== null ? `${analytics.avgScore}%` : "—", color: "#c2410c", bg: "#fff7ed" },
                    { label: "Tasa aprobación", value: analytics.passRate !== null ? `${analytics.passRate}%` : "—", color: "#16a34a", bg: "#f0fdf4" },
                  ].map(s => (
                    <div key={s.label} style={{ background: s.bg, borderRadius: 14, padding: "18px 22px", border: "1px solid #e2eaf7" }}>
                      <div style={{ fontSize: "1.8rem", fontWeight: 800, color: s.color }}>{s.value}</div>
                      <div style={{ fontSize: "0.78rem", color: "#64748b", fontWeight: 600, marginTop: 2 }}>{s.label}</div>
                    </div>
                  ))}
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
                  {/* Por simulacro */}
                  <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e2eaf7", overflow: "hidden" }}>
                    <div style={{ padding: "16px 20px", borderBottom: "1px solid #f1f5f9", fontWeight: 700, color: "#1e293b", fontSize: "0.9rem" }}>
                      Resultados por simulacro
                    </div>
                    {analytics.bySimulacro.length === 0 ? (
                      <div style={{ padding: "32px", textAlign: "center", color: "#94a3b8", fontSize: "0.875rem" }}>Sin simulacros asignados aún</div>
                    ) : (
                      <table style={{ width: "100%", borderCollapse: "collapse" }}>
                        <thead>
                          <tr style={{ background: "#f8faff" }}>
                            {["Simulacro", "Asignados", "Completados", "Promedio", "Aprobación"].map(h => (
                              <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontSize: "0.72rem", fontWeight: 700, color: "#64748b" }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {analytics.bySimulacro.map((s, i) => (
                            <tr key={s.id} style={{ borderTop: "1px solid #f1f5f9" }}>
                              <td style={{ padding: "10px 14px", fontSize: "0.82rem", fontWeight: 600, color: "#1e293b" }}>
                                {s.emoji} {s.titulo}
                              </td>
                              <td style={{ padding: "10px 14px", fontSize: "0.82rem", color: "#64748b", textAlign: "center" }}>{s.totalAsignados}</td>
                              <td style={{ padding: "10px 14px", fontSize: "0.82rem", color: "#64748b", textAlign: "center" }}>{s.totalCompletados}</td>
                              <td style={{ padding: "10px 14px", fontSize: "0.82rem", fontWeight: 700, color: "#004aad", textAlign: "center" }}>{s.avgScore !== null ? `${s.avgScore}%` : "—"}</td>
                              <td style={{ padding: "10px 14px", textAlign: "center" }}>
                                {s.passRate !== null ? (
                                  <span style={{ padding: "2px 8px", borderRadius: 20, fontSize: "0.72rem", fontWeight: 700, background: s.passRate >= 60 ? "#dcfce7" : "#fee2e2", color: s.passRate >= 60 ? "#16a34a" : "#dc2626" }}>
                                    {s.passRate}%
                                  </span>
                                ) : "—"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>

                  {/* Top estudiantes */}
                  <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e2eaf7", overflow: "hidden" }}>
                    <div style={{ padding: "16px 20px", borderBottom: "1px solid #f1f5f9", fontWeight: 700, color: "#1e293b", fontSize: "0.9rem" }}>
                      Ranking de estudiantes
                    </div>
                    {analytics.topStudents.length === 0 ? (
                      <div style={{ padding: "32px", textAlign: "center", color: "#94a3b8", fontSize: "0.875rem" }}>Sin resultados aún</div>
                    ) : (
                      <>
                        <div style={{ padding: "8px 14px 4px", fontSize: "0.7rem", fontWeight: 700, color: "#16a34a", textTransform: "uppercase", letterSpacing: "0.05em" }}>🏆 Mejores</div>
                        {analytics.topStudents.map((s, i) => (
                          <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 14px", borderTop: i > 0 ? "1px solid #f8faff" : "none" }}>
                            <span style={{ fontSize: "0.82rem", fontWeight: 800, color: i === 0 ? "#f59e0b" : "#94a3b8", minWidth: 18 }}>#{i + 1}</span>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: "0.82rem", fontWeight: 600, color: "#1e293b" }}>{s.nombre}</div>
                              <div style={{ fontSize: "0.72rem", color: "#94a3b8" }}>{s.total} simulacro{s.total !== 1 ? "s" : ""}</div>
                            </div>
                            <span style={{ fontSize: "0.875rem", fontWeight: 800, color: s.avgScore >= 60 ? "#16a34a" : "#dc2626" }}>{s.avgScore}%</span>
                          </div>
                        ))}
                        {analytics.bottomStudents.length > 0 && analytics.bottomStudents[0].id !== analytics.topStudents[0]?.id && (
                          <>
                            <div style={{ padding: "8px 14px 4px", fontSize: "0.7rem", fontWeight: 700, color: "#c2410c", textTransform: "uppercase", letterSpacing: "0.05em", borderTop: "1px solid #f1f5f9" }}>⚠ Necesitan apoyo</div>
                            {analytics.bottomStudents.filter(s => !analytics.topStudents.find(t => t.id === s.id)).slice(0, 3).map((s, i) => (
                              <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 14px", borderTop: i > 0 ? "1px solid #f8faff" : "none" }}>
                                <div style={{ flex: 1 }}>
                                  <div style={{ fontSize: "0.82rem", fontWeight: 600, color: "#1e293b" }}>{s.nombre}</div>
                                  <div style={{ fontSize: "0.72rem", color: "#94a3b8" }}>{s.total} simulacro{s.total !== 1 ? "s" : ""}</div>
                                </div>
                                <span style={{ fontSize: "0.875rem", fontWeight: 800, color: "#dc2626" }}>{s.avgScore}%</span>
                              </div>
                            ))}
                          </>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
