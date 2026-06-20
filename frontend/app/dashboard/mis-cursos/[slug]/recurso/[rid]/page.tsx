"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import DashboardSidebar from "@/components/layout/DashboardSidebar";
import Navbar from "@/components/layout/Navbar";
import { api } from "@/lib/api";

interface Material { id: string; title: string; type: string; externalUrl?: string; description?: string }
interface Submission { id: string; status: string; score?: number; submittedAt?: string; feedback?: string; gradedAt?: string }
interface Activity { id: string; title: string; description?: string; dueDate?: string; maxScore: number; isPublished: boolean; submissions: Submission[] }
interface QuizAttempt { id: string; score?: number; status: string; createdAt: string }
interface Quiz { id: string; title: string; timeLimit?: number; maxAttempts: number; passingScore: number; status: string; questions: { id: string }[]; attempts: QuizAttempt[] }
interface Forum { id: string; title: string; description?: string; threads: { id: string }[] }
interface ResourceFull {
  id: string; title: string; type: string; url?: string; filePath?: string;
  lesson: { id: string; title: string; courseId: string };
  materials: Material[]; activities: Activity[]; quizzes: Quiz[]; forums: Forum[];
}

const MAT_ICONS: Record<string, string> = {
  PDF: "📄", VIDEO_YOUTUBE: "▶️", VIDEO_VIMEO: "▶️", LINK: "🔗", FILE: "📎",
  IMAGE: "🖼️", AUDIO: "🎵", PRESENTATION: "📊", WORD: "📝", EXCEL: "📊",
};

const STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  DRAFT:     { label: "Borrador",   color: "#92400e", bg: "#fef3c7" },
  SUBMITTED: { label: "Entregada",  color: "#1d4ed8", bg: "#dbeafe" },
  LATE:      { label: "Tardía",     color: "#dc2626", bg: "#fee2e2" },
  GRADED:    { label: "Calificada", color: "#15803d", bg: "#dcfce7" },
  RETURNED:  { label: "Devuelta",   color: "#7c3aed", bg: "#f5f3ff" },
};

function youtubeEmbed(url: string) {
  const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&?/]+)/);
  return m ? `https://www.youtube.com/embed/${m[1]}` : null;
}
function vimeoEmbed(url: string) {
  const m = url.match(/vimeo\.com\/(\d+)/);
  return m ? `https://player.vimeo.com/video/${m[1]}` : null;
}

export default function StudentResourcePage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const slug = params.slug as string;
  const resourceId = params.rid as string;

  const [data, setData] = useState<ResourceFull | null>(null);
  const [fetching, setFetching] = useState(true);

  useEffect(() => { if (!loading && !user) router.replace("/auth/login"); }, [user, loading]);

  useEffect(() => {
    if (!user || !resourceId) return;
    api.get<ResourceFull>(`/resources/${resourceId}/student`)
      .then(setData).catch(() => null).finally(() => setFetching(false));
  }, [user, resourceId]);

  if (loading || fetching) return (
    <>
      <Navbar />
      <div className="dashboard-layout"><DashboardSidebar />
        <main className="dashboard-main"><div style={{ padding: 48, textAlign: "center", color: "#94a3b8" }}>Cargando…</div></main>
      </div>
    </>
  );

  if (!data) return (
    <>
      <Navbar />
      <div className="dashboard-layout"><DashboardSidebar />
        <main className="dashboard-main">
          <div style={{ padding: 48, textAlign: "center", color: "#94a3b8" }}>
            <div style={{ fontSize: "2rem", marginBottom: 8 }}>😕</div>
            <div>Recurso no encontrado.</div>
            <Link href={`/dashboard/mis-cursos/${slug}`} style={{ color: "#004aad", marginTop: 16, display: "block" }}>← Volver al curso</Link>
          </div>
        </main>
      </div>
    </>
  );

  const ytEmbed = (data.type === "VIDEO_YOUTUBE" && data.url) ? youtubeEmbed(data.url) : null;
  const vmEmbed = (data.type === "VIDEO_VIMEO" && data.url) ? vimeoEmbed(data.url) : null;

  return (
    <>
      <Navbar />
      <div className="dashboard-layout">
        <DashboardSidebar />
        <main className="dashboard-main">
          <div className="dashboard-content" style={{ maxWidth: 760 }}>

            {/* Header */}
            <div style={{ marginBottom: 20 }}>
              <Link href={`/dashboard/mis-cursos/${slug}`} style={{ fontSize: "0.83rem", color: "#64748b", textDecoration: "none" }}>← Volver al curso</Link>
              <h1 style={{ fontFamily: "var(--font-poppins)", fontWeight: 800, fontSize: "1.2rem", color: "#1e293b", margin: "8px 0 2px" }}>{data.title}</h1>
              <div style={{ fontSize: "0.75rem", color: "#94a3b8" }}>{data.lesson.title}</div>
            </div>

            {/* Inline content */}
            {ytEmbed && (
              <div style={{ marginBottom: 20, borderRadius: 12, overflow: "hidden", background: "#000" }}>
                <iframe src={ytEmbed} width="100%" height="360" frameBorder={0} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope" allowFullScreen />
              </div>
            )}
            {vmEmbed && (
              <div style={{ marginBottom: 20, borderRadius: 12, overflow: "hidden" }}>
                <iframe src={vmEmbed} width="100%" height="360" frameBorder={0} allowFullScreen />
              </div>
            )}
            {data.type === "LINK" && data.url && (
              <div style={{ marginBottom: 20 }}>
                <a href={data.url} target="_blank" rel="noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "10px 18px", background: "#f0f4ff", color: "#004aad", border: "1px solid #c7d7f0", borderRadius: 10, fontWeight: 700, textDecoration: "none" }}>
                  🔗 Abrir enlace
                </a>
              </div>
            )}
            {(data.type === "PDF" || data.type === "FILE") && (data.url || data.filePath) && (
              <div style={{ marginBottom: 20 }}>
                <a href={data.url ?? data.filePath!} target="_blank" rel="noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "10px 18px", background: "#f8fafc", color: "#475569", border: "1px solid #e2e8f0", borderRadius: 10, fontWeight: 700, textDecoration: "none" }}>
                  📄 Descargar archivo
                </a>
              </div>
            )}

            {/* Materiales adicionales */}
            {data.materials.length > 0 && (
              <section style={{ marginBottom: 24 }}>
                <div style={{ fontWeight: 700, fontSize: "0.9rem", color: "#1e293b", marginBottom: 10 }}>📁 Materiales de apoyo</div>
                {data.materials.map(m => (
                  <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: "#f8fafc", borderRadius: 9, border: "1px solid #e2e8f0", marginBottom: 6 }}>
                    <span>{MAT_ICONS[m.type] ?? "📎"}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: "0.85rem" }}>{m.title}</div>
                      {m.description && <div style={{ fontSize: "0.72rem", color: "#64748b" }}>{m.description}</div>}
                    </div>
                    {m.externalUrl && (
                      <a href={m.externalUrl} target="_blank" rel="noreferrer" style={{ padding: "5px 12px", background: "#004aad", color: "#fff", borderRadius: 7, textDecoration: "none", fontSize: "0.75rem", fontWeight: 700 }}>Abrir</a>
                    )}
                  </div>
                ))}
              </section>
            )}

            {/* Tareas */}
            {data.activities.length > 0 && (
              <section style={{ marginBottom: 24 }}>
                <div style={{ fontWeight: 700, fontSize: "0.9rem", color: "#1e293b", marginBottom: 10 }}>📋 Tareas</div>
                {data.activities.map(a => {
                  const sub = a.submissions[0];
                  const statusInfo = sub ? STATUS_LABELS[sub.status] : null;
                  const isOverdue = a.dueDate && new Date(a.dueDate) < new Date();
                  return (
                    <div key={a.id} style={{ background: "#fff", borderRadius: 10, border: "1px solid #e2e8f0", padding: "12px 16px", marginBottom: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: "0.88rem" }}>📋 {a.title}</div>
                        <div style={{ fontSize: "0.72rem", color: isOverdue ? "#dc2626" : "#94a3b8", marginTop: 2 }}>
                          {a.dueDate ? `${isOverdue ? "⚠ " : ""}Límite: ${new Date(a.dueDate).toLocaleDateString("es-CO")}` : "Sin fecha límite"}
                          {" · "}{a.maxScore} pts
                        </div>
                        {sub?.score != null && <div style={{ fontSize: "0.72rem", color: "#15803d", marginTop: 2 }}>Nota: {sub.score}/{a.maxScore}</div>}
                      </div>
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        {statusInfo && <span style={{ padding: "2px 10px", background: statusInfo.bg, color: statusInfo.color, borderRadius: 20, fontSize: "0.7rem", fontWeight: 700 }}>{statusInfo.label}</span>}
                        <Link href={`/dashboard/mis-cursos/${slug}/tarea/${a.id}`}
                          style={{ padding: "6px 14px", background: "#004aad", color: "#fff", borderRadius: 8, textDecoration: "none", fontSize: "0.78rem", fontWeight: 700 }}>
                          {sub ? "Ver entrega" : "Entregar"}
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </section>
            )}

            {/* Pruebas */}
            {data.quizzes.length > 0 && (
              <section style={{ marginBottom: 24 }}>
                <div style={{ fontWeight: 700, fontSize: "0.9rem", color: "#1e293b", marginBottom: 10 }}>🧪 Pruebas</div>
                {data.quizzes.map(q => {
                  const lastAttempt = q.attempts[0];
                  return (
                    <div key={q.id} style={{ background: "#fff", borderRadius: 10, border: "1px solid #e2e8f0", padding: "12px 16px", marginBottom: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: "0.88rem" }}>🧪 {q.title}</div>
                        <div style={{ fontSize: "0.72rem", color: "#94a3b8", marginTop: 2 }}>
                          {q.questions.length} preguntas · {q.timeLimit ? `${q.timeLimit} min` : "Sin límite"} · Pasa con {q.passingScore}%
                        </div>
                        {lastAttempt?.score != null && <div style={{ fontSize: "0.72rem", color: "#15803d", marginTop: 2 }}>Último: {lastAttempt.score.toFixed(0)}%</div>}
                      </div>
                      <Link href={`/dashboard/mis-cursos/${slug}/quiz/${q.id}`}
                        style={{ padding: "6px 14px", background: "#004aad", color: "#fff", borderRadius: 8, textDecoration: "none", fontSize: "0.78rem", fontWeight: 700 }}>
                        {lastAttempt ? "Volver a intentar" : "Iniciar"}
                      </Link>
                    </div>
                  );
                })}
              </section>
            )}

            {/* Foros */}
            {data.forums.length > 0 && (
              <section style={{ marginBottom: 24 }}>
                <div style={{ fontWeight: 700, fontSize: "0.9rem", color: "#1e293b", marginBottom: 10 }}>💬 Foros</div>
                {data.forums.map(f => (
                  <div key={f.id} style={{ background: "#fff", borderRadius: 10, border: "1px solid #e2e8f0", padding: "12px 16px", marginBottom: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: "0.88rem" }}>💬 {f.title}</div>
                      {f.description && <div style={{ fontSize: "0.72rem", color: "#64748b", marginTop: 2 }}>{f.description}</div>}
                      <div style={{ fontSize: "0.72rem", color: "#94a3b8", marginTop: 2 }}>{f.threads.length} hilo(s)</div>
                    </div>
                    <Link href={`/dashboard/mis-cursos/${slug}/foro/${f.id}`}
                      style={{ padding: "6px 14px", background: "#f0f4ff", color: "#004aad", border: "1px solid #c7d7f0", borderRadius: 8, textDecoration: "none", fontSize: "0.78rem", fontWeight: 700 }}>
                      Ir al foro →
                    </Link>
                  </div>
                ))}
              </section>
            )}

          </div>
        </main>
      </div>
    </>
  );
}
