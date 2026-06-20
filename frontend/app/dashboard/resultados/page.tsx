
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/layout/Navbar";
import DashboardSidebar from "@/components/layout/DashboardSidebar";
import { getVisitadas } from "@/lib/courseProgress";
import { api, mediaUrl } from "@/lib/api";
import { generarCertificado } from "@/lib/certificate";

interface SimulacroInfo {
  id: string;
  titulo: string;
  color: string | null;
  emoji: string | null;
}

interface Assignment {
  id: string;
  simulacro: SimulacroInfo;
  score: number | null;
  completedAt: string | null;
  assignedAt: string;
}

interface Enrollment {
  id: string;
  status: string;
  enrolledAt: string;
  course: { id: string; title: string; slug: string; thumbnail: string | null; totalResources: number };
}

function scoreLabel(pct: number) {
  if (pct >= 80) return "Excelente";
  if (pct >= 70) return "Muy bien";
  if (pct >= 60) return "Bien";
  if (pct >= 50) return "Regular";
  return "Necesita mejorar";
}

export default function ResultadosPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [generandoCert, setGenerandoCert] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) router.replace("/auth/login");
    if (!loading && user?.mustChangePassword) router.replace("/auth/change-password");
    if (!loading && user?.role === "ADMIN") router.replace("/admin");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, loading]);

  useEffect(() => {
    if (!user) return;
    api.get<Assignment[]>("/simulacros/me")
      .then(setAssignments)
      .catch(() => {});
  }, [user]);

  useEffect(() => {
    if (!user) return;
    api.get<Enrollment[]>("/enrollments/me")
      .then(setEnrollments)
      .catch(() => {});
  }, [user]);

  if (loading) {
    return (
      <div className="sim-loading-screen">
        <div className="sim-loading-spinner" />
        <div className="sim-loading-text">Cargando resultados…</div>
      </div>
    );
  }

  if (!user) return null;

  /* ── Simulacros completados ── */
  const simsCompletados = assignments.filter((a) => a.completedAt && a.score !== null);
  const puntajes = simsCompletados.map((a) => a.score!);
  const promedioSims = puntajes.length
    ? Math.round(puntajes.reduce((a, b) => a + b, 0) / puntajes.length)
    : null;
  const promedioEscala = promedioSims !== null ? Math.round((promedioSims / 100) * 500) : null;

  /* ── Cursos ── */
  const cursosConResultado = enrollments.map((enroll) => {
    const totalRecursos = enroll.course.totalResources ?? 0;
    const completadoPorDB = enroll.status === "COMPLETED";
    const visitadas = totalRecursos > 0 ? getVisitadas(enroll.course.id).length : 0;
    const pct = completadoPorDB ? 100 : totalRecursos > 0 ? Math.min(100, Math.round((visitadas / totalRecursos) * 100)) : 0;
    return { enroll, totalRecursos, visitadas, pct };
  });

  const cursosCompletados = cursosConResultado.filter((c) => c.pct >= 100).length;

  return (
    <>
      <Navbar />
      <div className="dashboard-layout">
        <DashboardSidebar />

        <main className="dashboard-main sim-page-main">
          <div className="dashboard-inner">

          {/* Hero */}
          <div className="sim-page-hero res-hero">
            <div className="sim-page-hero-text">
              <h1 className="sim-page-titulo">Mis Resultados</h1>
              <p className="sim-page-sub">Resumen de tu desempeño en simulacros y cursos.</p>
            </div>
          </div>

          {/* Stats */}
          <div className="sim-stats-row">
            <div className="sim-stat-card sim-stat-blue">
              <div className="sim-stat-body">
                <div className="sim-stat-num">{simsCompletados.length}</div>
                <div className="sim-stat-label">Simulacros completados</div>
              </div>
            </div>
            <div className="sim-stat-card sim-stat-purple">
              <div className="sim-stat-body">
                <div className="sim-stat-num">{promedioSims !== null ? `${promedioSims}%` : "—"}</div>
                {promedioEscala !== null && (
                  <div className="res-stat-escala">{promedioEscala} / 500 pts</div>
                )}
                <div className="sim-stat-label">Promedio simulacros</div>
              </div>
            </div>
            <div className="sim-stat-card sim-stat-orange">
              <div className="sim-stat-body">
                <div className="sim-stat-num">{enrollments.length}</div>
                <div className="sim-stat-label">Cursos inscritos</div>
              </div>
            </div>
            <div className="sim-stat-card sim-stat-green">
              <div className="sim-stat-body">
                <div className="sim-stat-num">{cursosCompletados}</div>
                <div className="sim-stat-label">Cursos completados</div>
              </div>
            </div>
          </div>

          {/* ════ SIMULACROS ════ */}
          <div className="res-section-header">
            <div className="res-section-title">Resultados de Simulacros</div>
            <Link href="/dashboard/simulacros" className="res-section-link">Ver todos →</Link>
          </div>

          {simsCompletados.length === 0 ? (
            <div className="sim-list-empty">
              <div className="sim-list-empty-icon">📋</div>
              <div className="sim-list-empty-title">Aún no has completado ningún simulacro</div>
              <div className="sim-list-empty-sub">Cuando completes uno, verás tus resultados aquí.</div>
              <Link href="/dashboard/simulacros" className="mc-empty-btn">Ir a Simulacros →</Link>
            </div>
          ) : (
            <>
              <div className="res-chart-card">
                <div className="res-chart-top">
                  <div className="res-chart-title">Comparativa de puntajes</div>
                  {promedioSims !== null && (
                    <div className="res-chart-avg">
                      Promedio: <strong>{promedioSims}%</strong> · <strong>{promedioEscala} pts</strong>
                    </div>
                  )}
                </div>
                <div className="res-col-chart">
                  <div className="res-col-grid-lines">
                    {[100, 75, 50, 25, 0].map((v) => (
                      <div key={v} className="res-col-grid-line">
                        <span className="res-col-grid-label">{v}%</span>
                      </div>
                    ))}
                  </div>
                  <div className="res-col-bars">
                    {simsCompletados.map((asig, idx) => {
                      const pct = asig.score ?? 0;
                      const pts = Math.round((pct / 100) * 500);
                      const barColor = asig.simulacro.color ?? "#004aad";
                      return (
                        <div key={asig.id} className="res-col-bar-item">
                          <div className="res-col-bar-badge" style={{ background: `${barColor}30`, borderColor: `${barColor}70`, boxShadow: `0 0 10px ${barColor}40`, color: "#fff" }}>
                            {pct}%
                          </div>
                          <div className="res-col-bar-track">
                            <div className="res-col-bar-fill" style={{ height: `${pct}%`, background: `linear-gradient(180deg, ${barColor}, ${barColor}bb)`, boxShadow: `0 0 16px ${barColor}80` }} />
                            {promedioSims !== null && <div className="res-col-avg-line" style={{ bottom: `${promedioSims}%` }} />}
                          </div>
                          <div className="res-col-bar-bottom">
                            <div className="res-col-bar-name">S{idx + 1}</div>
                            <div className="res-col-bar-pts">{pts} pts</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div className="res-col-legend">
                  {simsCompletados.map((asig, idx) => {
                    const barColor = asig.simulacro.color ?? "#004aad";
                    const shortTitle = asig.simulacro.titulo.replace("Simulacro ICFES — ", "");
                    return (
                      <div key={asig.id} className="res-col-legend-item">
                        <span className="res-col-legend-dot" style={{ background: barColor, boxShadow: `0 0 6px ${barColor}` }} />
                        <span>S{idx + 1} — {shortTitle}</span>
                      </div>
                    );
                  })}
                  <div className="res-col-legend-item">
                    <span style={{ width: 20, height: 2, background: "#fbbf24", display: "inline-block", borderRadius: 2 }} />
                    <span>Promedio</span>
                  </div>
                </div>
              </div>

              <div className="res-sims-list">
                {simsCompletados.map((asig, idx) => {
                  const pct = asig.score ?? 0;
                  const pts = Math.round((pct / 100) * 500);
                  const barColor = asig.simulacro.color ?? "#004aad";
                  const shortTitle = asig.simulacro.titulo.replace("Simulacro ICFES — ", "");
                  const fecha = asig.completedAt
                    ? new Date(asig.completedAt).toLocaleDateString("es-CO", { day: "numeric", month: "short", year: "numeric" })
                    : null;
                  return (
                    <div key={asig.id} className="res-sim-row">
                      <div className="res-sim-row-accent" style={{ background: barColor }} />
                      <div className="res-sim-row-num" style={{ color: barColor }}>S{idx + 1}</div>
                      <div className="res-sim-row-info">
                        <div className="res-sim-row-name">{shortTitle}</div>
                        {fecha && <div className="res-sim-row-date">{fecha}</div>}
                      </div>
                      <div className="res-sim-row-bar-wrap">
                        <div className="res-sim-row-bar-track">
                          <div className="res-sim-row-bar-fill" style={{ width: `${pct}%`, background: barColor }} />
                        </div>
                      </div>
                      <div className="res-sim-row-score">
                        <span className="res-sim-row-pct" style={{ color: barColor }}>{pct}%</span>
                        <span className="res-sim-row-pts">{pts} pts</span>
                      </div>
                      <Link href={`/dashboard/simulacros/${asig.id}`} className="res-sim-row-btn">
                        Ver completo →
                      </Link>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* ════ CURSOS ════ */}
          <div className="res-section-header" style={{ marginTop: "36px" }}>
            <div className="res-section-title">Resultados de Cursos</div>
            <Link href="/dashboard/mis-cursos" className="res-section-link">Ver todos →</Link>
          </div>

          {enrollments.length === 0 ? (
            <div className="sim-list-empty">
              <div className="sim-list-empty-icon">📭</div>
              <div className="sim-list-empty-title">Aún no tienes cursos</div>
              <div className="sim-list-empty-sub">Aquí aparecerán los resultados de tus cursos.</div>
            </div>
          ) : (
            <div className="res-sims-list">
              {cursosConResultado.map(({ enroll, totalRecursos, visitadas, pct }) => {
                const color = pct >= 100 ? "#059669" : pct >= 40 ? "#d97706" : "#004aad";
                const titulo = enroll.course.title;
                const courseId = enroll.course.id;
                const thumb = mediaUrl(enroll.course.thumbnail);
                const estado = pct >= 100 ? "✓ Completado" : pct === 0 ? "Sin iniciar" : "En progreso";
                const isGenerando = generandoCert === courseId;
                return (
                  <div
                    key={enroll.id}
                    onClick={() => router.push(`/dashboard/mis-cursos/${courseId}`)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 20,
                      background: "#fff",
                      borderRadius: 16,
                      padding: "20px 28px",
                      boxShadow: "0 2px 12px rgba(0,0,0,0.07)",
                      border: "1px solid #f1f5f9",
                      borderLeft: `5px solid ${color}`,
                      cursor: "pointer",
                      transition: "box-shadow 0.2s, transform 0.2s",
                    }}
                  >
                    {thumb && (
                      <img
                        src={thumb}
                        alt=""
                        onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                        style={{ width: 70, height: 70, borderRadius: 12, objectFit: "cover", flexShrink: 0 }}
                      />
                    )}

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: "1rem", fontWeight: 700, color: "#1e293b", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {titulo}
                      </div>
                      <div style={{ fontSize: "0.8rem", color: "#94a3b8", marginTop: 5 }}>
                        {totalRecursos > 0 ? `${visitadas} de ${totalRecursos} recursos` : "Sin recursos"} · {estado}
                      </div>
                    </div>

                    <div style={{ width: 300, flexShrink: 0, display: "flex", alignItems: "center", gap: 14 }}>
                      <div style={{ flex: 1, height: 10, background: "#f1f5f9", borderRadius: 10, overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 10, minWidth: pct > 0 ? 6 : 0, transition: "width 0.8s ease" }} />
                      </div>
                      <span style={{ fontSize: "1rem", fontWeight: 900, color, minWidth: 44, textAlign: "right" }}>{pct}%</span>
                    </div>

                    <div style={{ width: 160, flexShrink: 0, display: "flex", justifyContent: "flex-end" }}>
                      {pct >= 100 && (
                        <button
                          onClick={async (e) => {
                            e.stopPropagation();
                            setGenerandoCert(courseId);
                            await generarCertificado({ studentName: `${user.firstName} ${user.lastName}`, courseName: titulo });
                            setGenerandoCert(null);
                          }}
                          disabled={isGenerando}
                          style={{
                            background: "linear-gradient(135deg, #b8860b, #ffd700, #b8860b)",
                            color: "#1a1a00",
                            border: "1px solid #ffd700",
                            borderRadius: 10,
                            padding: "10px 18px",
                            fontSize: "0.85rem",
                            fontWeight: 800,
                            cursor: isGenerando ? "wait" : "pointer",
                            whiteSpace: "nowrap",
                            boxShadow: "0 0 14px rgba(255,215,0,0.4)",
                            opacity: isGenerando ? 0.7 : 1,
                          }}
                        >
                          {isGenerando ? "Generando…" : "🏆 Certificado"}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          </div>{/* /dashboard-inner */}
        </main>
      </div>
    </>
  );
}
