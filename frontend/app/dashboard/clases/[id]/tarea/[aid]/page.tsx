"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import DashboardSidebar from "@/components/layout/DashboardSidebar";
import Navbar from "@/components/layout/Navbar";
import { api } from "@/lib/api";

interface TopicActivity {
  id: string; title: string; description?: string; instructions?: string;
  dueDate?: string; maxScore: number; isPublished: boolean;
}
interface TopicSubmission {
  id: string; status: string; content?: string; submittedAt?: string;
  score?: number; feedback?: string; gradedAt?: string;
}

const STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  DRAFT:     { label: "Borrador",    color: "#92400e", bg: "#fef3c7" },
  SUBMITTED: { label: "Entregada",   color: "#1d4ed8", bg: "#dbeafe" },
  LATE:      { label: "Tardía",      color: "#dc2626", bg: "#fee2e2" },
  GRADED:    { label: "Calificada",  color: "#15803d", bg: "#dcfce7" },
  RETURNED:  { label: "Devuelta",    color: "#7c3aed", bg: "#f5f3ff" },
};

export default function StudentTopicTaskPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const classroomId = params.id as string;
  const activityId = params.aid as string;

  const [activity, setActivity] = useState<TopicActivity | null>(null);
  const [submission, setSubmission] = useState<TopicSubmission | null>(null);
  const [fetching, setFetching] = useState(true);
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { if (!loading && !user) router.replace("/auth/login"); }, [user, loading]);

  useEffect(() => {
    if (!user || !activityId) return;
    Promise.all([
      api.get<TopicActivity>(`/classrooms/topic-activities/${activityId}/student`).catch(() => null),
      api.get<TopicSubmission>(`/classrooms/topic-activities/${activityId}/my-submission`).catch(() => null),
    ]).then(([act, sub]) => {
      if (act) setActivity(act);
      if (sub) { setSubmission(sub); setContent(sub.content ?? ""); }
    }).finally(() => setFetching(false));
  }, [user, activityId]);

  async function submit() {
    if (!content.trim()) { alert("Escribe tu respuesta antes de entregar."); return; }
    setSubmitting(true);
    const res = await api.post<TopicSubmission>(`/classrooms/topic-activities/${activityId}/submit`, { content: content.trim() }).catch(() => null);
    if (res) setSubmission(res);
    setSubmitting(false);
  }

  if (loading || fetching) return (
    <>
      <Navbar />
      <div className="dashboard-layout"><DashboardSidebar />
        <main className="dashboard-main"><div style={{ padding: 48, textAlign: "center", color: "#94a3b8" }}>Cargando tarea…</div></main>
      </div>
    </>
  );

  if (!activity) return (
    <>
      <Navbar />
      <div className="dashboard-layout"><DashboardSidebar />
        <main className="dashboard-main">
          <div style={{ padding: 48, textAlign: "center", color: "#94a3b8" }}>
            <div style={{ fontSize: "2rem", marginBottom: 8 }}>😕</div>
            <div>Tarea no encontrada.</div>
            <Link href={`/dashboard/clases/${classroomId}`} style={{ color: "#004aad", marginTop: 16, display: "block" }}>← Volver al aula</Link>
          </div>
        </main>
      </div>
    </>
  );

  const isOverdue = activity.dueDate && new Date(activity.dueDate) < new Date();
  const statusInfo = submission ? STATUS_LABELS[submission.status] : null;
  const canEdit = !submission || submission.status === "DRAFT" || submission.status === "RETURNED";

  return (
    <>
      <Navbar />
      <div className="dashboard-layout">
        <DashboardSidebar />
        <main className="dashboard-main">
          <div className="dashboard-content" style={{ maxWidth: 700 }}>

            {/* Header */}
            <div style={{ marginBottom: 24 }}>
              <Link href={`/dashboard/clases/${classroomId}`} style={{ fontSize: "0.85rem", color: "#64748b", textDecoration: "none" }}>← Volver al aula</Link>
              <h1 style={{ fontFamily: "var(--font-poppins)", fontWeight: 800, fontSize: "1.25rem", color: "#1e293b", margin: "8px 0 4px" }}>
                📋 {activity.title}
              </h1>
              <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                <span style={{ fontSize: "0.78rem", color: "#64748b" }}>Puntaje máximo: <strong>{activity.maxScore} pts</strong></span>
                {activity.dueDate && (
                  <span style={{ fontSize: "0.78rem", color: isOverdue ? "#dc2626" : "#64748b" }}>
                    {isOverdue ? "⚠ " : ""}Límite: {new Date(activity.dueDate).toLocaleDateString("es-CO", { day: "2-digit", month: "long", hour: "2-digit", minute: "2-digit" })}
                  </span>
                )}
                {statusInfo && (
                  <span style={{ padding: "2px 10px", background: statusInfo.bg, color: statusInfo.color, borderRadius: 20, fontSize: "0.72rem", fontWeight: 700 }}>
                    {statusInfo.label}
                  </span>
                )}
              </div>
            </div>

            {/* Description */}
            {activity.description && (
              <div style={{ background: "#f8fafc", borderRadius: 12, border: "1px solid #e2e8f0", padding: "14px 18px", marginBottom: 16 }}>
                <p style={{ margin: 0, whiteSpace: "pre-wrap", fontSize: "0.9rem", color: "#374151", lineHeight: 1.7 }}>{activity.description}</p>
              </div>
            )}

            {/* Instructions */}
            {activity.instructions && (
              <div style={{ background: "#f0f9ff", borderRadius: 12, border: "1px solid #bae6fd", padding: "14px 18px", marginBottom: 20 }}>
                <div style={{ fontWeight: 700, fontSize: "0.78rem", color: "#0369a1", marginBottom: 6 }}>Instrucciones</div>
                <p style={{ margin: 0, whiteSpace: "pre-wrap", fontSize: "0.88rem", color: "#0c4a6e", lineHeight: 1.7 }}>{activity.instructions}</p>
              </div>
            )}

            {/* Grade/Feedback */}
            {submission && submission.status === "GRADED" && (
              <div style={{ background: "#dcfce7", borderRadius: 12, border: "1px solid #86efac", padding: "14px 18px", marginBottom: 20 }}>
                <div style={{ fontWeight: 700, fontSize: "0.85rem", color: "#15803d", marginBottom: 4 }}>
                  ✅ Calificada — Nota: <strong>{submission.score} / {activity.maxScore}</strong>
                </div>
                {submission.feedback && (
                  <div style={{ fontSize: "0.85rem", color: "#166534", whiteSpace: "pre-wrap", lineHeight: 1.6 }}>
                    <span style={{ fontWeight: 600 }}>Retroalimentación:</span> {submission.feedback}
                  </div>
                )}
                {submission.gradedAt && (
                  <div style={{ fontSize: "0.72rem", color: "#15803d", marginTop: 4 }}>
                    Calificada el {new Date(submission.gradedAt).toLocaleDateString("es-CO")}
                  </div>
                )}
              </div>
            )}

            {/* Submission form */}
            <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #e2e8f0", padding: "18px 20px" }}>
              <div style={{ fontWeight: 700, fontSize: "0.88rem", color: "#1e293b", marginBottom: 12 }}>
                {submission ? "Tu entrega" : "Entregar tarea"}
              </div>

              {submission && submission.submittedAt && (
                <div style={{ marginBottom: 10, fontSize: "0.75rem", color: "#64748b" }}>
                  Entregada el {new Date(submission.submittedAt).toLocaleDateString("es-CO", { day: "2-digit", month: "long", hour: "2-digit", minute: "2-digit" })}
                </div>
              )}

              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                disabled={!canEdit}
                placeholder="Escribe tu respuesta aquí…"
                rows={8}
                style={{
                  width: "100%", padding: "12px 14px", borderRadius: 10,
                  border: `1.5px solid ${!canEdit ? "#e2e8f0" : "#c7d7f0"}`,
                  fontSize: "0.9rem", lineHeight: 1.7, resize: "vertical",
                  boxSizing: "border-box", background: !canEdit ? "#f8fafc" : "#fff",
                  color: "#374151", marginBottom: 14,
                }}
              />

              {canEdit && (
                <button
                  onClick={submit}
                  disabled={submitting || !content.trim()}
                  style={{ padding: "10px 24px", background: "#004aad", color: "#fff", border: "none", borderRadius: 9, cursor: "pointer", fontWeight: 800, fontSize: "0.9rem" }}>
                  {submitting ? "Enviando…" : submission ? "Actualizar entrega" : "Entregar"}
                </button>
              )}

              {!canEdit && submission && submission.status !== "GRADED" && (
                <div style={{ fontSize: "0.82rem", color: "#64748b" }}>Tu entrega está siendo revisada por el docente.</div>
              )}
            </div>

          </div>
        </main>
      </div>
    </>
  );
}
