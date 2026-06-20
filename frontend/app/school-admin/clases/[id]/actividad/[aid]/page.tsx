"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import SchoolAdminSidebar from "@/components/school-admin/SchoolAdminSidebar";
import { api } from "@/lib/api";

interface Activity {
  id: string;
  title: string;
  description: string | null;
  dueDate: string | null;
  maxScore: number | null;
  isPublished: boolean;
  classroom: { id: string; title: string } | null;
}

interface Submission {
  id: string;
  status: string;
  content: string | null;
  fileKeys: string[];
  fileNames: string[];
  score: number | null;
  feedback: string | null;
  submittedAt: string | null;
  gradedAt: string | null;
  student: { id: string; firstName: string; lastName: string; email: string };
}

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Borrador",
  SUBMITTED: "Entregado",
  LATE: "Tardío",
  GRADED: "Calificado",
  RETURNED: "Devuelto",
};

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  DRAFT:     { bg: "#f1f5f9", color: "#64748b" },
  SUBMITTED: { bg: "#dbeafe", color: "#1d4ed8" },
  LATE:      { bg: "#fef3c7", color: "#b45309" },
  GRADED:    { bg: "#dcfce7", color: "#15803d" },
  RETURNED:  { bg: "#fce7f3", color: "#9d174d" },
};

function fmtDate(s: string | null) {
  if (!s) return "—";
  return new Date(s).toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function AdminActividadPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const classroomId = params.id as string;
  const activityId = params.aid as string;

  const [activity, setActivity] = useState<Activity | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [fetching, setFetching] = useState(true);
  const [selected, setSelected] = useState<Submission | null>(null);
  const [scoreInput, setScoreInput] = useState("");
  const [feedbackInput, setFeedbackInput] = useState("");
  const [grading, setGrading] = useState(false);
  const [gradeError, setGradeError] = useState("");

  useEffect(() => {
    if (!loading && (!user || user.role !== "ADMIN")) router.replace("/auth/login");
  }, [user, loading]);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      api.get<Activity>(`/classrooms/admin/activities/${activityId}`),
      api.get<Submission[]>(`/classrooms/admin/activities/${activityId}/submissions`),
    ] as const)
      .then(([act, subs]) => { setActivity(act); setSubmissions(subs); })
      .catch(() => {})
      .finally(() => setFetching(false));
  }, [user, activityId]);

  function openGrade(sub: Submission) {
    setSelected(sub);
    setScoreInput(sub.score != null ? String(sub.score) : "");
    setFeedbackInput(sub.feedback ?? "");
    setGradeError("");
  }

  async function submitGrade() {
    if (!selected) return;
    const scoreNum = scoreInput.trim() ? parseFloat(scoreInput) : null;
    if (scoreNum != null && isNaN(scoreNum)) { setGradeError("Calificación inválida"); return; }
    if (scoreNum != null && activity?.maxScore != null && scoreNum > activity.maxScore) {
      setGradeError(`Máximo permitido: ${activity.maxScore}`); return;
    }
    setGrading(true); setGradeError("");
    try {
      const updated = await api.patch<Submission>(`/classrooms/admin/submissions/${selected.id}/grade`, {
        score: scoreNum,
        feedback: feedbackInput.trim() || null,
        status: "GRADED",
      });
      setSubmissions((prev) => prev.map((s) => s.id === updated.id ? updated : s));
      setSelected(null);
    } catch {
      setGradeError("Error al guardar calificación.");
    } finally {
      setGrading(false);
    }
  }

  if (loading || fetching) return null;

  const submitted = submissions.filter((s) => s.status !== "DRAFT").length;
  const graded = submissions.filter((s) => s.status === "GRADED").length;
  const avgScore = graded > 0
    ? (submissions.filter((s) => s.score != null).reduce((a, s) => a + s.score!, 0) / graded).toFixed(1)
    : null;

  return (
    <div className="admin-layout">
      <SchoolAdminSidebar />
      <main className="admin-main">
        <div className="admin-content" style={{ maxWidth: 900 }}>

          {/* Breadcrumb */}
          <div style={{ marginBottom: 24 }}>
            <Link href={`/school-admin/clases/${classroomId}`} style={{ color: "#64748b", textDecoration: "none", fontSize: "0.875rem" }}>
              ← {activity?.classroom?.title ?? "Aula"}
            </Link>
            <h1 style={{ fontFamily: "var(--font-poppins)", fontWeight: 800, fontSize: "1.4rem", color: "#1e293b", margin: "8px 0 4px" }}>
              {activity?.title ?? "Actividad"}
            </h1>
            {activity?.description && (
              <p style={{ color: "#64748b", fontSize: "0.9rem" }}>{activity.description}</p>
            )}
            <div style={{ display: "flex", gap: 16, marginTop: 8, fontSize: "0.82rem", color: "#94a3b8" }}>
              {activity?.dueDate && <span>Entrega: {fmtDate(activity.dueDate)}</span>}
              {activity?.maxScore != null && <span>Puntaje máx: {activity.maxScore}</span>}
            </div>
          </div>

          {/* Stats */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 28 }}>
            {[
              { label: "Entregas recibidas", value: submitted },
              { label: "Calificadas", value: graded },
              { label: "Promedio", value: avgScore ?? "—" },
            ].map(({ label, value }) => (
              <div key={label} style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", padding: "16px 20px" }}>
                <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "#1e293b" }}>{value}</div>
                <div style={{ fontSize: "0.8rem", color: "#64748b", marginTop: 2 }}>{label}</div>
              </div>
            ))}
          </div>

          {/* Table */}
          <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e2e8f0", overflow: "hidden" }}>
            {submissions.length === 0 ? (
              <div style={{ padding: "48px 24px", textAlign: "center", color: "#94a3b8" }}>
                Ningún estudiante ha entregado esta actividad aún.
              </div>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid #e2e8f0", background: "#f8fafc" }}>
                    {["Estudiante", "Estado", "Entregado", "Calificación", ""].map((h) => (
                      <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontSize: "0.78rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.04em" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {submissions.map((sub) => {
                    const sc = STATUS_COLORS[sub.status] ?? STATUS_COLORS.DRAFT;
                    return (
                      <tr key={sub.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                        <td style={{ padding: "14px 16px" }}>
                          <div style={{ fontWeight: 600, color: "#1e293b", fontSize: "0.9rem" }}>
                            {sub.student.firstName} {sub.student.lastName}
                          </div>
                          <div style={{ fontSize: "0.78rem", color: "#94a3b8" }}>{sub.student.email}</div>
                        </td>
                        <td style={{ padding: "14px 16px" }}>
                          <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: "0.75rem", fontWeight: 700, background: sc.bg, color: sc.color }}>
                            {STATUS_LABELS[sub.status] ?? sub.status}
                          </span>
                        </td>
                        <td style={{ padding: "14px 16px", fontSize: "0.82rem", color: "#64748b" }}>
                          {fmtDate(sub.submittedAt)}
                        </td>
                        <td style={{ padding: "14px 16px", fontSize: "0.9rem", fontWeight: 700, color: sub.score != null ? "#1e293b" : "#94a3b8" }}>
                          {sub.score != null ? `${sub.score}${activity?.maxScore != null ? ` / ${activity.maxScore}` : ""}` : "—"}
                        </td>
                        <td style={{ padding: "14px 16px" }}>
                          <button
                            onClick={() => openGrade(sub)}
                            style={{ padding: "6px 14px", background: "#f0f4ff", color: "#004aad", borderRadius: 8, border: "none", cursor: "pointer", fontWeight: 700, fontSize: "0.8rem" }}
                          >
                            {sub.status === "GRADED" ? "Editar nota" : "Calificar"}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

        </div>
      </main>

      {/* Grade modal */}
      {selected && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "#fff", borderRadius: 20, padding: 32, width: "100%", maxWidth: 520, boxShadow: "0 20px 60px rgba(0,0,0,0.15)" }}>
            <h2 style={{ fontFamily: "var(--font-poppins)", fontWeight: 800, fontSize: "1.1rem", color: "#1e293b", marginBottom: 4 }}>
              Calificar entrega
            </h2>
            <p style={{ color: "#64748b", fontSize: "0.85rem", marginBottom: 20 }}>
              {selected.student.firstName} {selected.student.lastName}
            </p>

            {/* Submission content */}
            {selected.content && (
              <div style={{ background: "#f8fafc", borderRadius: 10, padding: "12px 14px", marginBottom: 16, fontSize: "0.875rem", color: "#374151", maxHeight: 160, overflowY: "auto" }}>
                <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#94a3b8", marginBottom: 6, textTransform: "uppercase" }}>Respuesta del estudiante</div>
                {selected.content}
              </div>
            )}
            {selected.fileNames.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#94a3b8", marginBottom: 6, textTransform: "uppercase" }}>Archivos adjuntos</div>
                {selected.fileNames.map((name, i) => (
                  <a
                    key={i}
                    href={`/api/classrooms/files/${selected.fileKeys[i]}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ display: "block", color: "#004aad", fontSize: "0.85rem", marginBottom: 4 }}
                  >
                    {name}
                  </a>
                ))}
              </div>
            )}

            <div style={{ display: "flex", gap: 14, marginBottom: 16 }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: "0.82rem", fontWeight: 700, color: "#374151", display: "block", marginBottom: 6 }}>
                  Calificación{activity?.maxScore != null ? ` (máx ${activity.maxScore})` : ""}
                </label>
                <input
                  type="number"
                  value={scoreInput}
                  onChange={(e) => setScoreInput(e.target.value)}
                  min={0}
                  max={activity?.maxScore ?? undefined}
                  step="0.1"
                  style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1.5px solid #e2e8f0", fontSize: "0.95rem", boxSizing: "border-box" }}
                />
              </div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: "0.82rem", fontWeight: 700, color: "#374151", display: "block", marginBottom: 6 }}>
                Retroalimentación (opcional)
              </label>
              <textarea
                value={feedbackInput}
                onChange={(e) => setFeedbackInput(e.target.value)}
                rows={3}
                style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1.5px solid #e2e8f0", fontSize: "0.875rem", resize: "vertical", boxSizing: "border-box" }}
              />
            </div>

            {gradeError && (
              <div style={{ background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 8, padding: "8px 12px", color: "#991b1b", fontSize: "0.8rem", marginBottom: 16 }}>
                {gradeError}
              </div>
            )}

            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={submitGrade}
                disabled={grading}
                style={{ flex: 1, padding: "11px 0", background: grading ? "#94a3b8" : "#004aad", color: "#fff", borderRadius: 10, border: "none", cursor: grading ? "not-allowed" : "pointer", fontWeight: 800, fontSize: "0.9rem" }}
              >
                {grading ? "Guardando…" : "Guardar calificación"}
              </button>
              <button
                onClick={() => setSelected(null)}
                style={{ padding: "11px 18px", background: "#f1f5f9", color: "#475569", borderRadius: 10, border: "none", cursor: "pointer", fontWeight: 700 }}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
