"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import DashboardSidebar from "@/components/layout/DashboardSidebar";
import { api } from "@/lib/api";

interface Activity {
  id: string;
  title: string;
  description: string | null;
  dueDate: string | null;
  maxScore: number | null;
  module: { classroomId: string };
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

function isPastDue(dueDate: string | null) {
  if (!dueDate) return false;
  return new Date(dueDate) < new Date();
}

export default function StudentActividadPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const classroomId = params.id as string;
  const activityId = params.aid as string;

  const [activity, setActivity] = useState<Activity | null>(null);
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [fetching, setFetching] = useState(true);

  const [textInput, setTextInput] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!loading && !user) router.replace("/auth/login");
  }, [user, loading]);

  useEffect(() => {
    if (!user) return;
    api.get<Activity & { submissions: Submission[] }>(`/classrooms/activities/${activityId}`)
      .then((data) => {
        setActivity(data);
        const sub = data.submissions?.[0] ?? null;
        setSubmission(sub);
        if (sub?.content) setTextInput(sub.content);
      })
      .catch(() => router.replace(`/dashboard/clases/${classroomId}`))
      .finally(() => setFetching(false));
  }, [user, activityId, classroomId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!textInput.trim() && files.length === 0) {
      setSubmitError("Agrega una respuesta de texto o al menos un archivo.");
      return;
    }
    setSubmitting(true); setSubmitError("");
    try {
      const fd = new FormData();
      fd.append("content", textInput.trim());
      files.forEach((f) => fd.append("file", f));
      const result = await api.postForm<Submission>(`/classrooms/activities/${activityId}/submit`, fd);
      setSubmission(result);
      setSubmitted(true);
      setFiles([]);
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : "Error al enviar la entrega.");
    } finally {
      setSubmitting(false);
    }
  }

  function removeFile(i: number) {
    setFiles((prev) => prev.filter((_, idx) => idx !== i));
  }

  if (loading || fetching) return null;
  if (!activity) return null;

  const overdue = isPastDue(activity.dueDate);
  const isGraded = submission?.status === "GRADED";
  const canEdit = !isGraded && (!submission || submission.status === "RETURNED");
  const sc = submission ? (STATUS_COLORS[submission.status] ?? STATUS_COLORS.DRAFT) : null;

  return (
    <div className="dashboard-layout">
      <DashboardSidebar />
      <main className="dashboard-main">
        <div className="dashboard-content" style={{ maxWidth: 700 }}>

          {/* Breadcrumb */}
          <div style={{ marginBottom: 24 }}>
            <Link href={`/dashboard/clases/${classroomId}`} style={{ color: "#64748b", textDecoration: "none", fontSize: "0.875rem" }}>
              ← Volver a la clase
            </Link>
            <h1 style={{ fontFamily: "var(--font-poppins)", fontWeight: 800, fontSize: "1.4rem", color: "#1e293b", margin: "8px 0 4px" }}>
              {activity.title}
            </h1>
            {activity.description && (
              <p style={{ color: "#64748b", fontSize: "0.9rem", lineHeight: 1.6 }}>{activity.description}</p>
            )}
            <div style={{ display: "flex", gap: 16, marginTop: 10, flexWrap: "wrap" }}>
              {activity.dueDate && (
                <div style={{ fontSize: "0.82rem", color: overdue ? "#dc2626" : "#64748b" }}>
                  Fecha límite: {fmtDate(activity.dueDate)}{overdue ? " — vencida" : ""}
                </div>
              )}
              {activity.maxScore != null && (
                <div style={{ fontSize: "0.82rem", color: "#64748b" }}>Puntaje: {activity.maxScore} pts</div>
              )}
              {submission && sc && (
                <span style={{ padding: "3px 12px", borderRadius: 20, fontSize: "0.75rem", fontWeight: 700, background: sc.bg, color: sc.color }}>
                  {STATUS_LABELS[submission.status]}
                </span>
              )}
            </div>
          </div>

          {/* Grading result */}
          {isGraded && (
            <div style={{ background: "#f0fdf4", border: "1px solid #86efac", borderRadius: 14, padding: "18px 22px", marginBottom: 24 }}>
              <div style={{ fontWeight: 800, fontSize: "1rem", color: "#15803d", marginBottom: 6 }}>
                Calificación: {submission!.score != null ? `${submission!.score}${activity.maxScore != null ? ` / ${activity.maxScore}` : ""} pts` : "—"}
              </div>
              {submission!.feedback && (
                <p style={{ fontSize: "0.875rem", color: "#166534", margin: 0 }}>
                  <strong>Retroalimentación:</strong> {submission!.feedback}
                </p>
              )}
              <div style={{ fontSize: "0.75rem", color: "#4ade80", marginTop: 6 }}>
                Calificado el {fmtDate(submission!.gradedAt)}
              </div>
            </div>
          )}

          {/* Existing submission read-only */}
          {submission && submission.status !== "RETURNED" && !submitted && (
            <div style={{ background: "#f8fafc", borderRadius: 14, border: "1px solid #e2e8f0", padding: "18px 22px", marginBottom: 24 }}>
              <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", marginBottom: 10 }}>
                Tu entrega — {fmtDate(submission.submittedAt)}
              </div>
              {submission.content && (
                <p style={{ fontSize: "0.9rem", color: "#374151", margin: "0 0 12px", whiteSpace: "pre-wrap" }}>{submission.content}</p>
              )}
              {submission.fileNames.length > 0 && (
                <div>
                  {submission.fileNames.map((name, i) => (
                    <a
                      key={i}
                      href={`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api"}/classrooms/files/${submission.fileKeys[i]}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "#004aad", fontSize: "0.85rem", marginRight: 12, marginBottom: 4 }}
                    >
                      📎 {name}
                    </a>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Success state */}
          {submitted && (
            <div style={{ background: "#f0fdf4", border: "1px solid #86efac", borderRadius: 14, padding: "20px 22px", marginBottom: 24 }}>
              <div style={{ fontWeight: 800, fontSize: "1rem", color: "#15803d" }}>Entrega enviada correctamente</div>
              <p style={{ fontSize: "0.85rem", color: "#166534", margin: "6px 0 0" }}>Tu docente recibirá tu entrega y la calificará pronto.</p>
            </div>
          )}

          {/* Submission form */}
          {(canEdit || !submission) && !submitted && (
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              {submission?.status === "RETURNED" && (
                <div style={{ background: "#fef3c7", borderRadius: 10, padding: "12px 16px", fontSize: "0.85rem", color: "#b45309" }}>
                  Tu entrega fue devuelta para corrección. Puedes editarla y reenviarla.
                </div>
              )}

              <div>
                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, color: "#374151", marginBottom: 6 }}>
                  Respuesta escrita
                </label>
                <textarea
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  rows={6}
                  placeholder="Escribe tu respuesta aquí…"
                  style={{ width: "100%", padding: "12px 14px", borderRadius: 10, border: "1.5px solid #e2e8f0", fontSize: "0.9rem", color: "#1e293b", resize: "vertical", boxSizing: "border-box" }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, color: "#374151", marginBottom: 6 }}>
                  Archivos adjuntos (opcional)
                </label>
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  style={{ padding: "9px 18px", background: "#f1f5f9", color: "#475569", borderRadius: 8, border: "1.5px dashed #cbd5e1", cursor: "pointer", fontWeight: 600, fontSize: "0.85rem" }}
                >
                  + Agregar archivo
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  multiple
                  style={{ display: "none" }}
                  onChange={(e) => { if (e.target.files) setFiles((prev) => [...prev, ...Array.from(e.target.files!)]); e.target.value = ""; }}
                />
                {files.length > 0 && (
                  <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 6 }}>
                    {files.map((f, i) => (
                      <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, background: "#f8fafc", borderRadius: 8, padding: "8px 12px" }}>
                        <span style={{ flex: 1, fontSize: "0.85rem", color: "#374151" }}>📎 {f.name}</span>
                        <span style={{ fontSize: "0.75rem", color: "#94a3b8" }}>{(f.size / 1024).toFixed(0)} KB</span>
                        <button type="button" onClick={() => removeFile(i)} style={{ background: "none", border: "none", cursor: "pointer", color: "#dc2626", fontSize: "0.85rem" }}>✕</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {submitError && (
                <div style={{ background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 10, padding: "10px 14px", color: "#991b1b", fontSize: "0.875rem" }}>
                  {submitError}
                </div>
              )}

              {overdue && !submission && (
                <div style={{ background: "#fef2f2", borderRadius: 10, padding: "10px 14px", fontSize: "0.85rem", color: "#dc2626" }}>
                  La fecha límite ha pasado. Tu entrega quedará marcada como tardía.
                </div>
              )}

              <div style={{ display: "flex", gap: 12 }}>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{ flex: 1, padding: "13px 0", background: submitting ? "#94a3b8" : "#004aad", color: "#fff", borderRadius: 10, border: "none", cursor: submitting ? "not-allowed" : "pointer", fontWeight: 800, fontSize: "0.95rem", fontFamily: "var(--font-poppins)" }}
                >
                  {submitting ? "Enviando…" : submission ? "Actualizar entrega" : "Enviar entrega"}
                </button>
                <Link href={`/dashboard/clases/${classroomId}`} style={{ padding: "13px 20px", background: "#f1f5f9", color: "#475569", borderRadius: 10, textDecoration: "none", fontWeight: 700, fontSize: "0.9rem", display: "flex", alignItems: "center" }}>
                  Cancelar
                </Link>
              </div>
            </form>
          )}

          {/* Already graded — no edit */}
          {isGraded && (
            <div style={{ textAlign: "center", marginTop: 16 }}>
              <Link href={`/dashboard/clases/${classroomId}`} style={{ color: "#004aad", textDecoration: "none", fontWeight: 600, fontSize: "0.9rem" }}>
                ← Volver al aula
              </Link>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
