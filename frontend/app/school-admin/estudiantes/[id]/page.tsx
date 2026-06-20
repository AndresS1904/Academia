"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import SchoolAdminSidebar from "@/components/school-admin/SchoolAdminSidebar";

interface StudentDetail {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  isActive: boolean;
  createdAt: string;
  enrollments: {
    course: { id: string; title: string };
    status: string;
    enrolledAt: string;
  }[];
}

interface SimulacroAssignment {
  id: string;
  assignedAt: string;
  dueDate: string | null;
  score: number | null;
  completedAt: string | null;
  simulacro: { id: string; titulo: string; emoji: string; color: string };
}

const formatDate = (d: string | null) =>
  d ? new Date(d).toLocaleDateString("es-CO", { day: "numeric", month: "short", year: "numeric" }) : "—";

export default function EstudianteDetailPage() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;

  const [student, setStudent] = useState<StudentDetail | null>(null);
  const [assignments, setAssignments] = useState<SimulacroAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [togglingStatus, setTogglingStatus] = useState(false);
  const [resetingId, setResetingId] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !id) return;
    Promise.all([
      api.get<StudentDetail>(`/users/${id}`),
      api.get<SimulacroAssignment[]>(`/simulacros/assignments?userId=${id}`).catch(() => []),
    ]).then(([s, studentAssignments]) => {
      setStudent(s);
      setAssignments(studentAssignments);
    }).finally(() => setLoading(false));
  }, [user, id]);

  async function resetAttempt(assignmentId: string, titulo: string) {
    if (!confirm(`¿Reiniciar el simulacro "${titulo}"?\n\nSe borrarán todos los intentos del estudiante y podrá realizarlo de nuevo.`)) return;
    setResetingId(assignmentId);
    try {
      await api.post(`/simulacros/assignments/${assignmentId}/reset`, {});
      setAssignments(prev => prev.map(a =>
        a.id === assignmentId ? { ...a, score: null, completedAt: null } : a
      ));
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Error al reiniciar");
    } finally {
      setResetingId(null);
    }
  }

  async function toggleStatus() {
    if (!student) return;
    setTogglingStatus(true);
    try {
      await api.patch(`/users/${student.id}/status`, { isActive: !student.isActive });
      setStudent(prev => prev ? { ...prev, isActive: !prev.isActive } : prev);
    } catch { /* silencioso */ }
    setTogglingStatus(false);
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f0f4ff" }}>
      <SchoolAdminSidebar />
      <main style={{ marginLeft: 260, padding: "32px 36px", minHeight: "100vh", boxSizing: "border-box" }}>

        <Link
          href="/school-admin/estudiantes"
          style={{ fontSize: "0.875rem", color: "#64748b", textDecoration: "none", display: "inline-block", marginBottom: 24 }}
        >
          ← Volver a estudiantes
        </Link>

        {loading ? (
          <div style={{ padding: "80px 0", textAlign: "center", color: "#64748b" }}>⏳ Cargando…</div>
        ) : !student ? (
          <div style={{ padding: "80px 0", textAlign: "center", color: "#94a3b8" }}>Estudiante no encontrado.</div>
        ) : (
          <>
            {/* Header */}
            <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e2eaf7", boxShadow: "0 2px 8px rgba(0,74,173,0.06)", padding: "24px 28px", marginBottom: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <h1 style={{ fontSize: "1.4rem", fontWeight: 800, color: "#1e293b", margin: "0 0 4px" }}>
                    {student.firstName} {student.lastName}
                  </h1>
                  <div style={{ fontSize: "0.875rem", color: "#64748b" }}>{student.email}</div>
                  <div style={{ marginTop: 10, display: "flex", gap: 10, alignItems: "center" }}>
                    <span style={{ display: "inline-block", padding: "3px 10px", borderRadius: 20, fontSize: "0.75rem", fontWeight: 600, background: student.isActive ? "#dcfce7" : "#f1f5f9", color: student.isActive ? "#16a34a" : "#64748b" }}>
                      {student.isActive ? "● Activo" : "○ Inactivo"}
                    </span>
                    <span style={{ fontSize: "0.8rem", color: "#94a3b8" }}>Registrado {formatDate(student.createdAt)}</span>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 10 }}>
                  <Link
                    href={`/school-admin/asignaciones?studentId=${student.id}`}
                    style={{ padding: "8px 16px", background: "#004aad", color: "#fff", borderRadius: 10, textDecoration: "none", fontWeight: 700, fontSize: "0.85rem" }}
                  >
                    Asignar contenido
                  </Link>
                  <button
                    onClick={toggleStatus}
                    disabled={togglingStatus}
                    style={{ padding: "8px 16px", background: student.isActive ? "#fef2f2" : "#f0fdf4", color: student.isActive ? "#dc2626" : "#16a34a", border: `1px solid ${student.isActive ? "#fecaca" : "#bbf7d0"}`, borderRadius: 10, fontWeight: 700, fontSize: "0.85rem", cursor: "pointer" }}
                  >
                    {togglingStatus ? "..." : student.isActive ? "Desactivar" : "Activar"}
                  </button>
                </div>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
              {/* Courses */}
              <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e2eaf7", boxShadow: "0 2px 8px rgba(0,74,173,0.06)", overflow: "hidden" }}>
                <div style={{ padding: "16px 20px", borderBottom: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <h2 style={{ fontSize: "0.9rem", fontWeight: 700, color: "#1e293b", margin: 0 }}>
                    📚 Cursos inscritos ({student.enrollments.length})
                  </h2>
                </div>
                {student.enrollments.length === 0 ? (
                  <div style={{ padding: "32px 20px", textAlign: "center", color: "#94a3b8", fontSize: "0.875rem" }}>
                    Sin inscripciones.
                  </div>
                ) : (
                  <div>
                    {student.enrollments.map((e, idx) => (
                      <div
                        key={idx}
                        style={{ padding: "12px 20px", borderBottom: idx < student.enrollments.length - 1 ? "1px solid #f1f5f9" : "none", display: "flex", justifyContent: "space-between", alignItems: "center" }}
                      >
                        <div>
                          <div style={{ fontSize: "0.875rem", fontWeight: 600, color: "#1e293b" }}>{e.course.title}</div>
                          <div style={{ fontSize: "0.75rem", color: "#94a3b8" }}>Inscrito {formatDate(e.enrolledAt)}</div>
                        </div>
                        <span style={{ padding: "2px 8px", borderRadius: 20, fontSize: "0.72rem", fontWeight: 600, background: e.status === "COMPLETED" ? "#dcfce7" : "#eff6ff", color: e.status === "COMPLETED" ? "#16a34a" : "#004aad" }}>
                          {e.status === "COMPLETED" ? "Completado" : "Activo"}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Simulacros */}
              <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e2eaf7", boxShadow: "0 2px 8px rgba(0,74,173,0.06)", overflow: "hidden" }}>
                <div style={{ padding: "16px 20px", borderBottom: "1px solid #f1f5f9" }}>
                  <h2 style={{ fontSize: "0.9rem", fontWeight: 700, color: "#1e293b", margin: 0 }}>
                    📋 Simulacros asignados ({assignments.length})
                  </h2>
                </div>
                {assignments.length === 0 ? (
                  <div style={{ padding: "32px 20px", textAlign: "center", color: "#94a3b8", fontSize: "0.875rem" }}>
                    Sin simulacros asignados.
                  </div>
                ) : (
                  <div>
                    {assignments.map((a, idx) => (
                      <div
                        key={a.id}
                        style={{ padding: "12px 20px", borderBottom: idx < assignments.length - 1 ? "1px solid #f1f5f9" : "none" }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, minWidth: 0 }}>
                            <span style={{ fontSize: "1.1rem" }}>{a.simulacro.emoji}</span>
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontSize: "0.875rem", fontWeight: 600, color: "#1e293b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.simulacro.titulo}</div>
                              <div style={{ fontSize: "0.75rem", color: "#94a3b8" }}>Asignado {formatDate(a.assignedAt)}</div>
                            </div>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                            <div style={{ textAlign: "right" }}>
                              {a.score != null ? (
                                <div style={{ fontSize: "1rem", fontWeight: 800, color: a.score >= 300 ? "#16a34a" : "#dc2626" }}>
                                  {a.score.toFixed(0)}
                                </div>
                              ) : (
                                <span style={{ fontSize: "0.75rem", color: a.completedAt ? "#64748b" : "#94a3b8" }}>
                                  {a.completedAt ? "Completado" : "Pendiente"}
                                </span>
                              )}
                              {a.dueDate && (
                                <div style={{ fontSize: "0.72rem", color: "#94a3b8" }}>Límite: {formatDate(a.dueDate)}</div>
                              )}
                            </div>
                            <button
                              onClick={() => resetAttempt(a.id, a.simulacro.titulo)}
                              disabled={resetingId === a.id}
                              title="Reiniciar simulacro"
                              style={{
                                padding: "4px 10px",
                                background: resetingId === a.id ? "#f1f5f9" : "#fff7ed",
                                color: "#ea580c",
                                border: "1px solid #fed7aa",
                                borderRadius: 8,
                                fontWeight: 700,
                                fontSize: "0.75rem",
                                cursor: "pointer",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {resetingId === a.id ? "..." : "↺ Reiniciar"}
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
