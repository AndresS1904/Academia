"use client";

import { useEffect, useState, Suspense } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import SchoolAdminSidebar from "@/components/school-admin/SchoolAdminSidebar";
import Link from "next/link";

interface Student { id: string; firstName: string; lastName: string; email: string; }
interface Group { id: string; name: string; _count: { members: number }; }
interface Course { id: string; title: string; isGlobal: boolean; }
interface Simulacro { id: string; titulo: string; isGlobal: boolean; }

type Tab = "course" | "simulacro" | "group-course" | "group-simulacro";

function AsignacionesContent() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const preselectedCourseId = searchParams.get("courseId") ?? "";
  const preselectedSimulacroId = searchParams.get("simulacroId") ?? "";

  const [students, setStudents] = useState<Student[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [simulacros, setSimulacros] = useState<Simulacro[]>([]);
  const [loading, setLoading] = useState(true);

  const [tab, setTab] = useState<Tab>(preselectedSimulacroId ? "simulacro" : "course");

  // Course → Estudiante
  const [courseForm, setCourseForm] = useState({ courseId: preselectedCourseId, studentId: "" });
  const [courseSaving, setCourseSaving] = useState(false);
  const [courseMsg, setCourseMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  // Simulacro → Estudiante
  const [simForm, setSimForm] = useState({
    simulacroId: preselectedSimulacroId,
    studentId: "",
    dueDate: "",
    instructions: "",
  });
  const [simSaving, setSimSaving] = useState(false);
  const [simMsg, setSimMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  // Course → Grupo
  const [gcForm, setGcForm] = useState({ courseId: preselectedCourseId, groupId: "" });
  const [gcSaving, setGcSaving] = useState(false);
  const [gcMsg, setGcMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  // Simulacro → Grupo
  const [gsForm, setGsForm] = useState({
    simulacroId: preselectedSimulacroId,
    groupId: "",
    dueDate: "",
    instructions: "",
  });
  const [gsSaving, setGsSaving] = useState(false);
  const [gsMsg, setGsMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      api.get<Student[]>("/users/my-school/students"),
      api.get<Group[]>("/groups"),
      api.get<Course[]>("/access/catalog/courses"),
      api.get<Simulacro[]>("/access/catalog/simulacros"),
    ]).then(([s, g, c, sim]) => {
      setStudents(s);
      setGroups(g);
      setCourses(c);
      setSimulacros(sim);
    }).finally(() => setLoading(false));
  }, [user]);

  async function handleCourseAssign(e: React.FormEvent) {
    e.preventDefault();
    if (!courseForm.courseId || !courseForm.studentId) {
      setCourseMsg({ type: "err", text: "Selecciona un curso y un estudiante." });
      return;
    }
    setCourseSaving(true);
    setCourseMsg(null);
    try {
      await api.post("/enrollments/admin/assign", {
        courseId: courseForm.courseId,
        studentId: courseForm.studentId,
      });
      setCourseMsg({ type: "ok", text: "Estudiante inscrito correctamente en el curso." });
      setCourseForm(prev => ({ ...prev, studentId: "" }));
    } catch (e: any) {
      setCourseMsg({ type: "err", text: e.message ?? "Error al asignar." });
    } finally {
      setCourseSaving(false);
    }
  }

  async function handleSimAssign(e: React.FormEvent) {
    e.preventDefault();
    if (!simForm.simulacroId || !simForm.studentId) {
      setSimMsg({ type: "err", text: "Selecciona un simulacro y un estudiante." });
      return;
    }
    setSimSaving(true);
    setSimMsg(null);
    try {
      await api.post("/simulacros/assign", {
        simulacroId: simForm.simulacroId,
        userId: simForm.studentId,
        dueDate: simForm.dueDate || undefined,
        instructions: simForm.instructions || undefined,
      });
      setSimMsg({ type: "ok", text: "Simulacro asignado correctamente." });
      setSimForm(prev => ({ ...prev, studentId: "", dueDate: "", instructions: "" }));
    } catch (e: any) {
      setSimMsg({ type: "err", text: e.message ?? "Error al asignar." });
    } finally {
      setSimSaving(false);
    }
  }

  async function handleGroupCourseAssign(e: React.FormEvent) {
    e.preventDefault();
    if (!gcForm.courseId || !gcForm.groupId) {
      setGcMsg({ type: "err", text: "Selecciona un curso y un grupo." });
      return;
    }
    setGcSaving(true);
    setGcMsg(null);
    try {
      const res = await api.post<{ enrolled: number; skipped: number }>(
        `/groups/${gcForm.groupId}/assign-course`,
        { courseId: gcForm.courseId },
      );
      setGcMsg({ type: "ok", text: `Curso asignado: ${res.enrolled} inscrito(s), ${res.skipped} ya tenían acceso.` });
      setGcForm(prev => ({ ...prev, groupId: "" }));
    } catch (e: any) {
      setGcMsg({ type: "err", text: e.message ?? "Error al asignar." });
    } finally {
      setGcSaving(false);
    }
  }

  async function handleGroupSimAssign(e: React.FormEvent) {
    e.preventDefault();
    if (!gsForm.simulacroId || !gsForm.groupId) {
      setGsMsg({ type: "err", text: "Selecciona un simulacro y un grupo." });
      return;
    }
    setGsSaving(true);
    setGsMsg(null);
    try {
      const res = await api.post<{ assigned: number; skipped: number }>(
        `/groups/${gsForm.groupId}/assign-simulacro`,
        {
          simulacroId: gsForm.simulacroId,
          dueDate: gsForm.dueDate || undefined,
          instructions: gsForm.instructions || undefined,
        },
      );
      setGsMsg({ type: "ok", text: `Simulacro asignado: ${res.assigned} estudiante(s) nuevos, ${res.skipped} ya lo tenían.` });
      setGsForm(prev => ({ ...prev, groupId: "", dueDate: "", instructions: "" }));
    } catch (e: any) {
      setGsMsg({ type: "err", text: e.message ?? "Error al asignar." });
    } finally {
      setGsSaving(false);
    }
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

  const tabStyle = (active: boolean, color = "#004aad"): React.CSSProperties => ({
    padding: "9px 18px",
    borderRadius: 10,
    border: "none",
    fontWeight: 700,
    fontSize: "0.82rem",
    cursor: "pointer",
    background: active ? color : "#f1f5f9",
    color: active ? "#fff" : "#475569",
  });

  const msgBox = (msg: { type: "ok" | "err"; text: string } | null) =>
    msg ? (
      <div style={{ padding: "12px 16px", borderRadius: 10, marginBottom: 18, fontSize: "0.875rem", background: msg.type === "ok" ? "#f0fdf4" : "#fef2f2", border: `1px solid ${msg.type === "ok" ? "#bbf7d0" : "#fecaca"}`, color: msg.type === "ok" ? "#16a34a" : "#dc2626" }}>
        {msg.text}
      </div>
    ) : null;

  const submitBtn = (label: string, saving: boolean, color = "#004aad") => (
    <div style={{ display: "flex", justifyContent: "flex-end" }}>
      <button
        type="submit"
        disabled={saving}
        style={{ padding: "10px 24px", background: color, color: "#fff", border: "none", borderRadius: 10, fontWeight: 700, fontSize: "0.9rem", cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1 }}
      >
        {saving ? "Procesando…" : label}
      </button>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "#f0f4ff" }}>
      <SchoolAdminSidebar />
      <main style={{ marginLeft: 260, padding: "32px 36px", minHeight: "100vh", boxSizing: "border-box" }}>
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 800, color: "#1e293b", margin: 0 }}>Asignaciones</h1>
          <p style={{ color: "#64748b", fontSize: "0.875rem", margin: "4px 0 0" }}>
            Inscribe estudiantes o grupos completos en cursos y simulacros.
          </p>
        </div>

        {loading ? (
          <div style={{ padding: "80px 0", textAlign: "center", color: "#64748b" }}>Cargando…</div>
        ) : (
          <>
            {students.length === 0 && (
              <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 12, padding: "14px 18px", marginBottom: 22, fontSize: "0.875rem", color: "#92400e" }}>
                No tienes estudiantes registrados. <Link href="/school-admin/estudiantes/nuevo" style={{ color: "#004aad", fontWeight: 700 }}>Agrega estudiantes</Link> primero.
              </div>
            )}

            {/* Tabs: individual */}
            <div style={{ marginBottom: 8 }}>
              <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#94a3b8", letterSpacing: "0.05em", textTransform: "uppercase", marginRight: 8 }}>Individual</span>
            </div>
            <div style={{ display: "flex", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
              <button onClick={() => setTab("course")} style={tabStyle(tab === "course", "#004aad")}>📚 Curso → Estudiante</button>
              <button onClick={() => setTab("simulacro")} style={tabStyle(tab === "simulacro", "#7c3aed")}>📋 Simulacro → Estudiante</button>
            </div>

            {/* Tabs: grupo */}
            <div style={{ marginBottom: 8, marginTop: 12 }}>
              <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#94a3b8", letterSpacing: "0.05em", textTransform: "uppercase", marginRight: 8 }}>Por grupo</span>
            </div>
            <div style={{ display: "flex", gap: 8, marginBottom: 24, flexWrap: "wrap" }}>
              <button onClick={() => setTab("group-course")} style={tabStyle(tab === "group-course", "#0369a1")}>👥 Curso → Grupo</button>
              <button onClick={() => setTab("group-simulacro")} style={tabStyle(tab === "group-simulacro", "#6d28d9")}>👥 Simulacro → Grupo</button>
            </div>

            <div style={{ maxWidth: 620 }}>
              <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e2eaf7", boxShadow: "0 2px 8px rgba(0,74,173,0.06)", padding: "28px 32px" }}>

                {/* ── Curso → Estudiante ── */}
                {tab === "course" && (
                  <>
                    <h2 style={{ fontSize: "1rem", fontWeight: 700, color: "#1e293b", margin: "0 0 20px" }}>
                      Inscribir estudiante en un curso
                    </h2>
                    {msgBox(courseMsg)}
                    <form onSubmit={handleCourseAssign}>
                      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                        <div>
                          <label style={labelStyle}>Curso <span style={{ color: "#dc2626" }}>*</span></label>
                          <select value={courseForm.courseId} onChange={e => setCourseForm(p => ({ ...p, courseId: e.target.value }))} required style={inputStyle}>
                            <option value="">— Selecciona un curso —</option>
                            {courses.map(c => <option key={c.id} value={c.id}>{c.title} {c.isGlobal ? "⭐" : "🏫"}</option>)}
                          </select>
                        </div>
                        <div>
                          <label style={labelStyle}>Estudiante <span style={{ color: "#dc2626" }}>*</span></label>
                          <select value={courseForm.studentId} onChange={e => setCourseForm(p => ({ ...p, studentId: e.target.value }))} required style={inputStyle}>
                            <option value="">— Selecciona un estudiante —</option>
                            {students.map(s => <option key={s.id} value={s.id}>{s.firstName} {s.lastName} — {s.email}</option>)}
                          </select>
                        </div>
                        {submitBtn("Inscribir estudiante", courseSaving, "#004aad")}
                      </div>
                    </form>
                  </>
                )}

                {/* ── Simulacro → Estudiante ── */}
                {tab === "simulacro" && (
                  <>
                    <h2 style={{ fontSize: "1rem", fontWeight: 700, color: "#1e293b", margin: "0 0 20px" }}>
                      Asignar simulacro a un estudiante
                    </h2>
                    {msgBox(simMsg)}
                    <form onSubmit={handleSimAssign}>
                      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                        <div>
                          <label style={labelStyle}>Simulacro <span style={{ color: "#dc2626" }}>*</span></label>
                          <select value={simForm.simulacroId} onChange={e => setSimForm(p => ({ ...p, simulacroId: e.target.value }))} required style={inputStyle}>
                            <option value="">— Selecciona un simulacro —</option>
                            {simulacros.map(s => <option key={s.id} value={s.id}>{s.titulo} {s.isGlobal ? "⭐" : "🏫"}</option>)}
                          </select>
                        </div>
                        <div>
                          <label style={labelStyle}>Estudiante <span style={{ color: "#dc2626" }}>*</span></label>
                          <select value={simForm.studentId} onChange={e => setSimForm(p => ({ ...p, studentId: e.target.value }))} required style={inputStyle}>
                            <option value="">— Selecciona un estudiante —</option>
                            {students.map(s => <option key={s.id} value={s.id}>{s.firstName} {s.lastName} — {s.email}</option>)}
                          </select>
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                          <div>
                            <label style={labelStyle}>Fecha límite <span style={{ fontSize: "0.75rem", color: "#94a3b8" }}>(opcional)</span></label>
                            <input type="date" value={simForm.dueDate} onChange={e => setSimForm(p => ({ ...p, dueDate: e.target.value }))} style={inputStyle} />
                          </div>
                          <div style={{ gridColumn: "1 / -1" }}>
                            <label style={labelStyle}>Instrucciones <span style={{ fontSize: "0.75rem", color: "#94a3b8" }}>(opcional)</span></label>
                            <textarea value={simForm.instructions} onChange={e => setSimForm(p => ({ ...p, instructions: e.target.value }))} placeholder="Instrucciones para el estudiante…" rows={3} style={{ ...inputStyle, resize: "vertical" }} />
                          </div>
                        </div>
                        {submitBtn("Asignar simulacro", simSaving, "#7c3aed")}
                      </div>
                    </form>
                  </>
                )}

                {/* ── Curso → Grupo ── */}
                {tab === "group-course" && (
                  <>
                    <h2 style={{ fontSize: "1rem", fontWeight: 700, color: "#1e293b", margin: "0 0 6px" }}>
                      Inscribir grupo completo en un curso
                    </h2>
                    <p style={{ fontSize: "0.82rem", color: "#64748b", margin: "0 0 20px" }}>
                      Todos los miembros del grupo quedarán inscritos. Los que ya estén inscritos se omiten.
                    </p>
                    {groups.length === 0 && (
                      <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 10, padding: "12px 16px", marginBottom: 18, fontSize: "0.875rem", color: "#92400e" }}>
                        No tienes grupos creados. <Link href="/school-admin/grupos" style={{ color: "#004aad", fontWeight: 700 }}>Crea un grupo</Link> primero.
                      </div>
                    )}
                    {msgBox(gcMsg)}
                    <form onSubmit={handleGroupCourseAssign}>
                      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                        <div>
                          <label style={labelStyle}>Curso <span style={{ color: "#dc2626" }}>*</span></label>
                          <select value={gcForm.courseId} onChange={e => setGcForm(p => ({ ...p, courseId: e.target.value }))} required style={inputStyle}>
                            <option value="">— Selecciona un curso —</option>
                            {courses.map(c => <option key={c.id} value={c.id}>{c.title} {c.isGlobal ? "⭐" : "🏫"}</option>)}
                          </select>
                        </div>
                        <div>
                          <label style={labelStyle}>Grupo <span style={{ color: "#dc2626" }}>*</span></label>
                          <select value={gcForm.groupId} onChange={e => setGcForm(p => ({ ...p, groupId: e.target.value }))} required style={inputStyle}>
                            <option value="">— Selecciona un grupo —</option>
                            {groups.map(g => <option key={g.id} value={g.id}>{g.name} ({g._count?.members ?? 0} miembros)</option>)}
                          </select>
                        </div>
                        {submitBtn("Inscribir grupo", gcSaving, "#0369a1")}
                      </div>
                    </form>
                  </>
                )}

                {/* ── Simulacro → Grupo ── */}
                {tab === "group-simulacro" && (
                  <>
                    <h2 style={{ fontSize: "1rem", fontWeight: 700, color: "#1e293b", margin: "0 0 6px" }}>
                      Asignar simulacro a grupo completo
                    </h2>
                    <p style={{ fontSize: "0.82rem", color: "#64748b", margin: "0 0 20px" }}>
                      Todos los miembros del grupo recibirán el simulacro. Los que ya lo tengan asignado se omiten.
                    </p>
                    {groups.length === 0 && (
                      <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 10, padding: "12px 16px", marginBottom: 18, fontSize: "0.875rem", color: "#92400e" }}>
                        No tienes grupos creados. <Link href="/school-admin/grupos" style={{ color: "#004aad", fontWeight: 700 }}>Crea un grupo</Link> primero.
                      </div>
                    )}
                    {msgBox(gsMsg)}
                    <form onSubmit={handleGroupSimAssign}>
                      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                        <div>
                          <label style={labelStyle}>Simulacro <span style={{ color: "#dc2626" }}>*</span></label>
                          <select value={gsForm.simulacroId} onChange={e => setGsForm(p => ({ ...p, simulacroId: e.target.value }))} required style={inputStyle}>
                            <option value="">— Selecciona un simulacro —</option>
                            {simulacros.map(s => <option key={s.id} value={s.id}>{s.titulo} {s.isGlobal ? "⭐" : "🏫"}</option>)}
                          </select>
                        </div>
                        <div>
                          <label style={labelStyle}>Grupo <span style={{ color: "#dc2626" }}>*</span></label>
                          <select value={gsForm.groupId} onChange={e => setGsForm(p => ({ ...p, groupId: e.target.value }))} required style={inputStyle}>
                            <option value="">— Selecciona un grupo —</option>
                            {groups.map(g => <option key={g.id} value={g.id}>{g.name} ({g._count?.members ?? 0} miembros)</option>)}
                          </select>
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                          <div>
                            <label style={labelStyle}>Fecha límite <span style={{ fontSize: "0.75rem", color: "#94a3b8" }}>(opcional)</span></label>
                            <input type="date" value={gsForm.dueDate} onChange={e => setGsForm(p => ({ ...p, dueDate: e.target.value }))} style={inputStyle} />
                          </div>
                          <div style={{ gridColumn: "1 / -1" }}>
                            <label style={labelStyle}>Instrucciones <span style={{ fontSize: "0.75rem", color: "#94a3b8" }}>(opcional)</span></label>
                            <textarea value={gsForm.instructions} onChange={e => setGsForm(p => ({ ...p, instructions: e.target.value }))} placeholder="Instrucciones para los estudiantes…" rows={3} style={{ ...inputStyle, resize: "vertical" }} />
                          </div>
                        </div>
                        {submitBtn("Asignar a grupo", gsSaving, "#6d28d9")}
                      </div>
                    </form>
                  </>
                )}
              </div>

              <div style={{ marginTop: 16, padding: "14px 18px", background: "#f8faff", border: "1px solid #e2eaf7", borderRadius: 12, fontSize: "0.875rem", color: "#64748b", display: "flex", alignItems: "center", gap: 10 }}>
                <span>🗂️</span>
                <span>¿No encuentras el contenido? <Link href="/school-admin/catalogo" style={{ color: "#004aad", fontWeight: 600 }}>Ve al catálogo completo</Link> para explorar todo el contenido disponible.</span>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

export default function AsignacionesPage() {
  return (
    <Suspense fallback={null}>
      <AsignacionesContent />
    </Suspense>
  );
}
