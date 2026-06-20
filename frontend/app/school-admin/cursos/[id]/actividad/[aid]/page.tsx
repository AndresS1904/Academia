"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import SchoolAdminSidebar from "@/components/school-admin/SchoolAdminSidebar";
import { api } from "@/lib/api";

interface Submission {
  id: string; content?: string; status: string; submittedAt?: string;
  score?: number; feedback?: string; gradedAt?: string;
  student: { id: string; firstName: string; lastName: string };
}

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Borrador", SUBMITTED: "Entregada", LATE: "Tardía", GRADED: "Calificada", RETURNED: "Devuelta",
};

export default function CourseActivitySubmissionsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const courseId = params.id as string;
  const activityId = params.aid as string;

  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [fetching, setFetching] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [gradeScore, setGradeScore] = useState("");
  const [gradeFeedback, setGradeFeedback] = useState("");
  const [grading, setGrading] = useState(false);

  useEffect(() => { if (!loading && !user) router.replace("/auth/login"); }, [user, loading]);

  useEffect(() => {
    if (!user) return;
    api.get<Submission[]>(`/classrooms/topic-activities/${activityId}/submissions`)
      .then(setSubmissions).catch(() => {}).finally(() => setFetching(false));
  }, [user, activityId]);

  const active = submissions.find(s => s.id === activeId);

  async function submitGrade() {
    if (!activeId || !gradeScore) return;
    setGrading(true);
    const updated = await api.patch<Submission>(`/classrooms/topic-submissions/${activeId}/grade`, {
      score: parseFloat(gradeScore), feedback: gradeFeedback || undefined,
    }).catch(() => null);
    if (updated) {
      setSubmissions(prev => prev.map(s => s.id === activeId ? { ...s, score: updated.score, feedback: updated.feedback, status: "GRADED", gradedAt: updated.gradedAt } : s));
      setActiveId(null); setGradeScore(""); setGradeFeedback("");
    }
    setGrading(false);
  }

  if (loading || fetching) return null;

  const statusColor = (s: string) => {
    if (s === "GRADED") return { bg: "#dcfce7", color: "#166534" };
    if (s === "SUBMITTED") return { bg: "#dbeafe", color: "#1d4ed8" };
    if (s === "LATE") return { bg: "#fee2e2", color: "#dc2626" };
    return { bg: "#fef3c7", color: "#92400e" };
  };

  return (
    <div style={{ minHeight: "100vh", background: "#f0f4ff" }}>
      <SchoolAdminSidebar />
      <main style={{ marginLeft: 260, padding: "28px 36px", minHeight: "100vh", boxSizing: "border-box" }}>
        <div style={{ maxWidth: 900 }}>
          <div style={{ marginBottom: 20 }}>
            <Link href={`/school-admin/cursos/${courseId}`} style={{ fontSize: "0.875rem", color: "#64748b", textDecoration: "none" }}>← Volver al curso</Link>
            <h1 style={{ fontFamily: "var(--font-poppins)", fontWeight: 800, fontSize: "1.3rem", color: "#1e293b", margin: "8px 0 4px" }}>📝 Entregas de la tarea</h1>
            <p style={{ color: "#64748b", fontSize: "0.875rem", margin: 0 }}>{submissions.length} entrega(s)</p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "260px 1fr", gap: 20 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {submissions.length === 0 ? (
                <div style={{ textAlign: "center", padding: "32px 0", color: "#94a3b8", fontSize: "0.85rem" }}>Sin entregas aún.</div>
              ) : submissions.map(s => {
                const sc = statusColor(s.status);
                return (
                  <div key={s.id} onClick={() => { setActiveId(s.id); setGradeScore(s.score?.toString() ?? ""); setGradeFeedback(s.feedback ?? ""); }}
                    style={{ padding: "11px 13px", borderRadius: 10, border: activeId === s.id ? "2px solid #004aad" : "1px solid #e2e8f0", background: activeId === s.id ? "#f0f4ff" : "#fff", cursor: "pointer" }}>
                    <div style={{ fontWeight: 700, fontSize: "0.85rem", color: "#1e293b" }}>{s.student.firstName} {s.student.lastName}</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 3 }}>
                      <span style={{ padding: "1px 7px", background: sc.bg, color: sc.color, borderRadius: 10, fontSize: "0.65rem", fontWeight: 700 }}>{STATUS_LABELS[s.status]}</span>
                      {s.score != null && <span style={{ fontSize: "0.7rem", color: "#64748b" }}>{s.score} pts</span>}
                    </div>
                  </div>
                );
              })}
            </div>

            <div>
              {!active ? (
                <div style={{ textAlign: "center", padding: "48px 24px", background: "#f8fafc", borderRadius: 14, border: "2px dashed #e2e8f0", color: "#94a3b8" }}>
                  <div style={{ fontSize: "2.5rem", marginBottom: 8 }}>📋</div>
                  <div style={{ fontWeight: 600 }}>Selecciona una entrega</div>
                </div>
              ) : (
                <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #e2e8f0" }}>
                  <div style={{ padding: "14px 18px", background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                    <div style={{ fontWeight: 800, fontSize: "1rem", color: "#1e293b" }}>{active.student.firstName} {active.student.lastName}</div>
                    {active.submittedAt && <div style={{ fontSize: "0.72rem", color: "#94a3b8" }}>Entregado: {new Date(active.submittedAt).toLocaleDateString("es-CO", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</div>}
                  </div>
                  <div style={{ padding: "16px 18px" }}>
                    {active.content ? (
                      <div style={{ background: "#f8fafc", borderRadius: 10, padding: 14, marginBottom: 16 }}>
                        <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "#64748b", marginBottom: 6 }}>RESPUESTA</div>
                        <p style={{ margin: 0, whiteSpace: "pre-wrap", fontSize: "0.875rem", color: "#374151", lineHeight: 1.7 }}>{active.content}</p>
                      </div>
                    ) : (
                      <div style={{ color: "#94a3b8", fontSize: "0.85rem", marginBottom: 16 }}>Sin texto adjunto.</div>
                    )}
                    <div style={{ borderTop: "1px solid #e2e8f0", paddingTop: 16 }}>
                      <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "#374151", marginBottom: 10 }}>Calificación</div>
                      {active.status === "GRADED" && active.gradedAt && (
                        <div style={{ marginBottom: 10, padding: "8px 12px", background: "#dcfce7", borderRadius: 8, fontSize: "0.78rem", color: "#166534" }}>
                          ✅ Calificada el {new Date(active.gradedAt).toLocaleDateString("es-CO")} — Nota: <strong>{active.score}</strong>
                        </div>
                      )}
                      <input type="number" step="0.5" placeholder="Nota" value={gradeScore} onChange={e => setGradeScore(e.target.value)}
                        style={{ padding: "8px 10px", borderRadius: 8, border: "1.5px solid #c7d7f0", fontSize: "0.82rem", width: 100, marginBottom: 10, display: "block" }} />
                      <textarea placeholder="Retroalimentación (opcional)" value={gradeFeedback} onChange={e => setGradeFeedback(e.target.value)} rows={3}
                        style={{ padding: "8px 10px", borderRadius: 8, border: "1.5px solid #c7d7f0", fontSize: "0.82rem", width: "100%", marginBottom: 10, boxSizing: "border-box", resize: "vertical" }} />
                      <button onClick={submitGrade} disabled={grading || !gradeScore}
                        style={{ padding: "8px 18px", background: "#004aad", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 700, fontSize: "0.82rem" }}>
                        {grading ? "Guardando…" : active.status === "GRADED" ? "Actualizar nota" : "Calificar"}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
