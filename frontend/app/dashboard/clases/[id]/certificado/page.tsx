"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import DashboardSidebar from "@/components/layout/DashboardSidebar";
import Navbar from "@/components/layout/Navbar";
import { api } from "@/lib/api";

interface Certificate {
  id: string; verificationCode: string; status: string; issuedAt?: string; finalScore?: number;
  classroom: { title: string };
  student: { firstName: string; lastName: string; documento?: string };
}
interface CourseGrade { finalScore?: number; isPassing: boolean }

export default function StudentCertificatePage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const classroomId = params.id as string;

  const [cert, setCert] = useState<Certificate | null>(null);
  const [grade, setGrade] = useState<CourseGrade | null>(null);
  const [fetching, setFetching] = useState(true);

  useEffect(() => { if (!loading && !user) router.replace("/auth/login"); }, [user, loading]);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      api.get<Certificate>(`/classrooms/classrooms/${classroomId}/my-certificate`).catch(() => null),
      api.get<CourseGrade>(`/classrooms/classrooms/${classroomId}/my-grade`).catch(() => null),
    ]).then(([c, g]) => { setCert(c); setGrade(g); }).finally(() => setFetching(false));
  }, [user, classroomId]);

  if (loading || fetching) return null;

  return (
    <>
      <Navbar />
      <div className="dashboard-layout">
        <DashboardSidebar />
        <main className="dashboard-main">
          <div className="dashboard-content" style={{ maxWidth: 600 }}>
            <div style={{ marginBottom: 20 }}>
              <Link href={`/dashboard/clases/${classroomId}`} style={{ fontSize: "0.875rem", color: "#64748b", textDecoration: "none" }}>← Volver al aula</Link>
            </div>

            {/* Grade summary */}
            {grade && (
              <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #e2e8f0", padding: "20px 24px", marginBottom: 20 }}>
                <h2 style={{ margin: "0 0 12px", fontSize: "1rem", fontWeight: 800, color: "#1e293b" }}>Mi nota final</h2>
                <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                  <div style={{ fontSize: "2.5rem", fontWeight: 900, color: grade.isPassing ? "#16a34a" : "#dc2626" }}>
                    {grade.finalScore != null ? `${grade.finalScore.toFixed(1)}%` : "—"}
                  </div>
                  <div>
                    <span style={{ padding: "4px 12px", background: grade.isPassing ? "#dcfce7" : "#fee2e2", color: grade.isPassing ? "#166534" : "#dc2626", borderRadius: 20, fontWeight: 700, fontSize: "0.82rem" }}>
                      {grade.isPassing ? "✅ Aprobado" : "❌ No aprobado"}
                    </span>
                    {!grade.isPassing && <p style={{ margin: "8px 0 0", fontSize: "0.78rem", color: "#94a3b8" }}>Completa las actividades y quizzes para mejorar tu nota.</p>}
                  </div>
                </div>
              </div>
            )}

            {/* Certificate */}
            {!cert || cert.status !== "ISSUED" ? (
              <div style={{ textAlign: "center", padding: "48px 32px", background: "#f8fafc", borderRadius: 16, border: "2px dashed #e2e8f0" }}>
                <div style={{ fontSize: "3rem", marginBottom: 12 }}>🎓</div>
                <h3 style={{ margin: "0 0 8px", color: "#1e293b" }}>Certificado no disponible</h3>
                <p style={{ color: "#64748b", fontSize: "0.875rem", margin: 0 }}>
                  {!grade?.isPassing
                    ? "Necesitas aprobar el curso para obtener tu certificado."
                    : "Tu certificado aún no ha sido emitido por el administrador."}
                </p>
              </div>
            ) : (
              <div style={{ background: "linear-gradient(135deg, #004aad 0%, #0066dd 100%)", borderRadius: 20, padding: "40px 36px", color: "#fff", textAlign: "center", boxShadow: "0 8px 32px rgba(0,74,173,0.3)" }}>
                <div style={{ fontSize: "2.5rem", marginBottom: 8 }}>🎓</div>
                <div style={{ fontSize: "0.82rem", fontWeight: 700, letterSpacing: "0.15em", opacity: 0.8, marginBottom: 16 }}>CERTIFICADO DE FINALIZACIÓN</div>
                <div style={{ fontSize: "0.9rem", opacity: 0.8, marginBottom: 6 }}>Este certificado se otorga a</div>
                <div style={{ fontSize: "1.8rem", fontWeight: 900, marginBottom: 4, fontFamily: "var(--font-poppins)" }}>
                  {cert.student.firstName} {cert.student.lastName}
                </div>
                {cert.student.documento && <div style={{ fontSize: "0.78rem", opacity: 0.7, marginBottom: 20 }}>CC: {cert.student.documento}</div>}
                <div style={{ fontSize: "0.9rem", opacity: 0.8, marginBottom: 4 }}>por completar satisfactoriamente el curso</div>
                <div style={{ fontSize: "1.2rem", fontWeight: 800, marginBottom: 24 }}>{cert.classroom.title}</div>
                {cert.finalScore != null && (
                  <div style={{ marginBottom: 20, fontSize: "1rem", fontWeight: 700 }}>Nota final: {cert.finalScore.toFixed(1)}%</div>
                )}
                <div style={{ borderTop: "1px solid rgba(255,255,255,0.3)", paddingTop: 20, marginTop: 8 }}>
                  <div style={{ fontSize: "0.7rem", opacity: 0.6, marginBottom: 4 }}>Código de verificación</div>
                  <div style={{ fontFamily: "monospace", fontSize: "1.1rem", fontWeight: 700, letterSpacing: "0.15em", background: "rgba(255,255,255,0.15)", padding: "8px 16px", borderRadius: 10, display: "inline-block" }}>
                    {cert.verificationCode}
                  </div>
                  {cert.issuedAt && <div style={{ fontSize: "0.72rem", opacity: 0.6, marginTop: 8 }}>Emitido el {new Date(cert.issuedAt).toLocaleDateString("es-CO", { day: "2-digit", month: "long", year: "numeric" })}</div>}
                </div>
                <div style={{ marginTop: 20, fontSize: "0.72rem", opacity: 0.6 }}>
                  Verificar en: <span style={{ fontFamily: "monospace" }}>/verificar/{cert.verificationCode}</span>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </>
  );
}
