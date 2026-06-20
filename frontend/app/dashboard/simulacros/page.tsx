"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useExamTheme } from "@/contexts/ExamThemeContext";
import Navbar from "@/components/layout/Navbar";
import DashboardSidebar from "@/components/layout/DashboardSidebar";
import { api } from "@/lib/api";

interface SimulacroInfo {
  id: string;
  titulo: string;
  descripcion: string | null;
  duracionMinutos: number;
  totalPreguntas: number;
  areasEvaluadas: string[];
  color: string | null;
  emoji: string | null;
  simulacroType: "ICFES_OFFICIAL" | "LIBRE";
}

interface Assignment {
  id: string;
  simulacro: SimulacroInfo;
  instructions: string | null;
  dueDate: string | null;
  score: number | null;
  completedAt: string | null;
  assignedAt: string;
}

type StatusKey = "pendiente" | "en_progreso" | "completado";

const LS_ATTEMPT = (asigId: string) => `sim_attempt_${asigId}`;
const LS_AUTOSAVE = (attemptId: string) => `sim_autosave_${attemptId}`;

function getStatusFromLocal(asig: Assignment): StatusKey {
  if (asig.completedAt) return "completado";
  const attemptId = localStorage.getItem(LS_ATTEMPT(asig.id));
  if (attemptId) {
    try {
      const raw = localStorage.getItem(LS_AUTOSAVE(attemptId));
      if (raw) return "en_progreso";
    } catch {}
  }
  return "pendiente";
}

function getRespuestasCount(asig: Assignment): number {
  const attemptId = localStorage.getItem(LS_ATTEMPT(asig.id));
  if (!attemptId) return 0;
  try {
    const raw = localStorage.getItem(LS_AUTOSAVE(attemptId));
    if (!raw) return 0;
    const parsed = JSON.parse(raw);
    return Object.keys(parsed.answers ?? {}).length;
  } catch { return 0; }
}

function formatFecha(fechaStr: string) {
  const [y, m, d] = fechaStr.split("-");
  const meses = ["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"];
  return `${d} ${meses[parseInt(m, 10) - 1]} ${y}`;
}

type FiltroEstado = "todos" | "pendiente" | "en_progreso" | "completado";

export default function SimulacrosPage() {
  const { user, loading } = useAuth();
  const { theme, toggleTheme, listClass } = useExamTheme();
  const router = useRouter();

  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [statuses, setStatuses] = useState<Record<string, StatusKey>>({});
  const [fetching, setFetching] = useState(true);
  const [filtro, setFiltro] = useState<FiltroEstado>("todos");

  useEffect(() => {
    if (!loading && !user) router.replace("/auth/login");
    if (!loading && user?.mustChangePassword) router.replace("/auth/change-password");
    if (!loading && user?.role === "ADMIN") router.replace("/admin");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, loading]);

  useEffect(() => {
    if (!user) return;
    api.get<Assignment[]>("/simulacros/me")
      .then((data) => {
        setAssignments(data);
        const map: Record<string, StatusKey> = {};
        for (const asig of data) {
          map[asig.id] = getStatusFromLocal(asig);
        }
        setStatuses(map);
      })
      .catch(() => {})
      .finally(() => setFetching(false));
  }, [user]);

  if (loading) {
    return (
      <div className="sim-loading-screen">
        <div className="sim-loading-spinner"></div>
        <div className="sim-loading-text">Cargando simulacros…</div>
      </div>
    );
  }

  if (!user) return null;

  /* ── Stats ── */
  const totalAsignados = assignments.length;
  const completados = Object.values(statuses).filter((s) => s === "completado").length;
  const enProgreso = Object.values(statuses).filter((s) => s === "en_progreso").length;
  const pendientes = totalAsignados - completados - enProgreso;
  const puntajes = assignments
    .filter((a) => a.completedAt && a.score !== null)
    .map((a) => a.score!);
  const promedio =
    puntajes.length
      ? Math.round(puntajes.reduce((a, b) => a + b, 0) / puntajes.length)
      : null;

  /* ── Filtrado ── */
  const simulacrosFiltrados = assignments.filter((asig) => {
    if (filtro === "todos") return true;
    return statuses[asig.id] === filtro;
  });

  const tabs: { key: FiltroEstado; label: string; count: number }[] = [
    { key: "todos",       label: "Todos",       count: totalAsignados },
    { key: "pendiente",   label: "Pendientes",  count: pendientes     },
    { key: "en_progreso", label: "En progreso", count: enProgreso     },
    { key: "completado",  label: "Completados", count: completados    },
  ];

  return (
    <>
      <Navbar />
      <div className="dashboard-layout">
        <DashboardSidebar />

        <main className={`dashboard-main sim-page-main ${listClass}`}>
          <div className="dashboard-inner">

            {/* Page header */}
            <div className="sim-page-hero">
              <div className="sim-page-hero-text">
                <h1 className="sim-page-titulo">Mis Simulacros</h1>
                <p className="sim-page-sub">
                  Practica con exámenes reales estilo ICFES Saber 11 y mide tu avance.
                </p>
              </div>
              <div className="sim-page-hero-deco" aria-hidden>📝</div>
              <button
                className="sim-list-theme-btn"
                onClick={toggleTheme}
                title={theme === "dark" ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
              >
                {theme === "dark" ? "☀️" : "🌙"}
                {theme === "dark" ? "Modo claro" : "Modo oscuro"}
              </button>
            </div>

            {/* Stats row */}
            {totalAsignados > 0 && (
              <div className="sim-stats-row">
                <div className="sim-stat-card sim-stat-blue">
                  <div className="sim-stat-body">
                    <div className="sim-stat-num">{totalAsignados}</div>
                    <div className="sim-stat-label">Asignados</div>
                  </div>
                </div>
                <div className="sim-stat-card sim-stat-amber">
                  <div className="sim-stat-body">
                    <div className="sim-stat-num">{pendientes}</div>
                    <div className="sim-stat-label">Pendientes</div>
                  </div>
                </div>
                <div className="sim-stat-card sim-stat-orange">
                  <div className="sim-stat-body">
                    <div className="sim-stat-num">{enProgreso}</div>
                    <div className="sim-stat-label">En progreso</div>
                  </div>
                </div>
                <div className="sim-stat-card sim-stat-green">
                  <div className="sim-stat-body">
                    <div className="sim-stat-num">{completados}</div>
                    <div className="sim-stat-label">Completados</div>
                  </div>
                </div>
                {promedio !== null && (
                  <div className="sim-stat-card sim-stat-purple">
                    <div className="sim-stat-body">
                      <div className="sim-stat-num">{promedio}%</div>
                      <div className="sim-stat-label">Promedio</div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Filter tabs */}
            {totalAsignados > 0 && (
              <div className="sim-filter-row">
                {tabs.map((tab) => (
                  <button
                    key={tab.key}
                    className={`sim-filter-tab ${filtro === tab.key ? "sim-filter-active" : ""}`}
                    onClick={() => setFiltro(tab.key)}
                  >
                    {tab.label}
                    <span className="sim-filter-badge">{tab.count}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Cards */}
            {fetching ? (
              <div className="sim-list-empty">
                <div className="sim-list-empty-icon">⏳</div>
                <div className="sim-list-empty-title">Cargando simulacros…</div>
              </div>
            ) : assignments.length === 0 ? (
              <div className="sim-list-empty">
                <div className="sim-list-empty-icon">📋</div>
                <div className="sim-list-empty-title">Aún no tienes simulacros</div>
                <div className="sim-list-empty-sub">
                  Aquí aparecerán tus simulacros una vez estés inscrito.
                </div>
              </div>
            ) : simulacrosFiltrados.length === 0 ? (
              <div className="sim-list-empty">
                <div className="sim-list-empty-icon">🔍</div>
                <div className="sim-list-empty-title">Sin resultados</div>
                <div className="sim-list-empty-sub">
                  No hay simulacros en este estado. Prueba otro filtro.
                </div>
              </div>
            ) : (
              <div className="sim-list-grid">
                {simulacrosFiltrados.map((asig, idx) => {
                  const def = asig.simulacro;
                  const statusKey = statuses[asig.id] ?? "pendiente";
                  const puntaje = asig.score;
                  const respondidas = statusKey === "en_progreso" ? getRespuestasCount(asig) : 0;

                  const boton =
                    statusKey === "en_progreso" ? "Continuar" :
                    statusKey === "completado"  ? "Ver resultados" :
                    "Iniciar simulacro";

                  return (
                    <div
                      key={asig.id}
                      className="sim-list-card"
                      style={{ animationDelay: `${idx * 0.07}s` }}
                    >
                      {/* Header visual */}
                      <div
                        className="sim-list-card-header"
                        style={{ background: def.color ?? "#004aad" }}
                      >
                        <div className="sim-list-card-emoji-bg" aria-hidden>
                          {def.emoji ?? "📝"}
                        </div>
                        <span className={`sim-list-status-badge sim-status-${statusKey}`}>
                          {statusKey === "pendiente"   && "Pendiente"}
                          {statusKey === "en_progreso" && "En progreso"}
                          {statusKey === "completado"  && "✓ Completado"}
                        </span>
                        {def.simulacroType === "LIBRE" && (
                          <span style={{ position: "absolute", top: 10, left: 10, padding: "2px 9px", borderRadius: 20, fontSize: "0.68rem", fontWeight: 700, background: "rgba(255,255,255,0.9)", color: "#065f46" }}>
                            Libre
                          </span>
                        )}
                        <div className="sim-list-card-emoji">{def.emoji ?? "📝"}</div>
                        <div className="sim-list-card-header-title">{def.titulo}</div>
                      </div>

                      {/* Body */}
                      <div className="sim-list-card-body">
                        <p className="sim-list-card-desc">{def.descripcion}</p>

                        <div className="sim-list-info-pills">
                          <span className="sim-info-pill">
                            <span>⏱</span> {def.duracionMinutos} min
                          </span>
                          <span className="sim-info-pill">
                            <span>❓</span> {def.totalPreguntas} preguntas
                          </span>
                          {asig.dueDate && (
                            <span className="sim-info-pill sim-info-pill-deadline">
                              <span>📅</span> {formatFecha(asig.dueDate.split("T")[0])}
                            </span>
                          )}
                        </div>

                        <div className="sim-list-areas">
                          {def.areasEvaluadas.map((area) => (
                            <span key={area} className="sim-list-area-tag">{area}</span>
                          ))}
                        </div>

                        {/* Puntaje si está completado */}
                        {statusKey === "completado" && puntaje !== null && (
                          <div className="sim-list-score-block">
                            <div className="sim-list-score-header">
                              <span className="sim-list-score-label">Tu puntaje</span>
                              <span
                                className="sim-list-score-value"
                                style={{
                                  color:
                                    puntaje >= 70 ? "#059669" :
                                    puntaje >= 50 ? "#d97706" : "#dc2626",
                                }}
                              >
                                {Math.round(puntaje)}%
                              </span>
                            </div>
                            <div className="sim-list-score-bar-bg">
                              <div
                                className="sim-list-score-bar-fill"
                                style={{
                                  width: `${puntaje}%`,
                                  background:
                                    puntaje >= 70 ? "linear-gradient(90deg, #059669, #10b981)" :
                                    puntaje >= 50 ? "linear-gradient(90deg, #d97706, #f59e0b)" :
                                    "linear-gradient(90deg, #dc2626, #ef4444)",
                                }}
                              />
                            </div>
                            <div className="sim-list-score-descriptor">
                              {puntaje >= 80 ? "Excelente" : puntaje >= 70 ? "Muy bien" : puntaje >= 50 ? "Regular" : "Necesita mejorar"}
                            </div>
                          </div>
                        )}

                        {/* Progreso si está en curso */}
                        {statusKey === "en_progreso" && (
                          <div className="sim-list-inprogress-block">
                            <div className="sim-list-inprogress-header">
                              <span className="sim-inprogress-dot"></span>
                              <span>En curso — {respondidas}/{def.totalPreguntas} respondidas</span>
                            </div>
                            <div className="sim-list-score-bar-bg">
                              <div
                                className="sim-list-score-bar-fill"
                                style={{
                                  width: `${(respondidas / def.totalPreguntas) * 100}%`,
                                  background: "linear-gradient(90deg, #d97706, #f59e0b)",
                                }}
                              />
                            </div>
                          </div>
                        )}

                        {/* CTA */}
                        <Link
                          href={def.simulacroType === "LIBRE"
                            ? `/dashboard/simulacros/libre/${asig.id}`
                            : `/dashboard/simulacros/${asig.id}`}
                          className={`sim-list-btn sim-btn-${statusKey}`}
                        >
                          {statusKey === "pendiente"   && <span className="sim-btn-icon">🚀</span>}
                          {statusKey === "en_progreso" && <span className="sim-btn-icon">▶</span>}
                          {statusKey === "completado"  && <span className="sim-btn-icon">📊</span>}
                          {boton}
                          <span className="sim-btn-arrow">→</span>
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

          </div>
        </main>
      </div>
    </>
  );
}
