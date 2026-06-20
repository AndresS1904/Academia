"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/layout/Navbar";
import DashboardSidebar from "@/components/layout/DashboardSidebar";
import { api, mediaUrl } from "@/lib/api";

interface Enrollment {
  id: string;
  status: "ACTIVE" | "COMPLETED" | "CANCELLED";
  enrolledAt: string;
  course: {
    id: string;
    title: string;
    slug: string;
    thumbnail: string | null;
    description: string | null;
    _count: { lessons: number };
  };
}

const bgPalette = [
  "linear-gradient(135deg,#004aad,#1a6bff)",
  "linear-gradient(135deg,#d95e00,#fc740c)",
  "linear-gradient(135deg,#059669,#10b981)",
  "linear-gradient(135deg,#7c3aed,#a855f7)",
  "linear-gradient(135deg,#0891b2,#06b6d4)",
  "linear-gradient(135deg,#be185d,#ec4899)",
];

type FiltroEstado = "todos" | "activos" | "completados";

export default function MisCursosPage() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState("");
  const [filtro, setFiltro] = useState<FiltroEstado>("todos");

  useEffect(() => {
    if (!loading && !user) router.replace("/auth/login");
    if (!loading && user?.mustChangePassword) router.replace("/auth/change-password");
    if (!loading && user?.role === "ADMIN") router.replace("/admin");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, loading]);

  useEffect(() => {
    if (!user) return;
    api
      .get<Enrollment[]>("/enrollments/me")
      .then((data) => setEnrollments(data))
      .catch((e) => setError(e.message ?? "Error al cargar cursos"))
      .finally(() => setFetching(false));
  }, [user]);

  if (loading) {
    return (
      <div className="sim-loading-screen">
        <div className="sim-loading-spinner"></div>
        <div className="sim-loading-text">Cargando cursos…</div>
      </div>
    );
  }

  if (!user) return null;

  const initial = (user.firstName[0] + user.lastName[0]).toUpperCase();
  const active    = enrollments.filter((e) => e.status === "ACTIVE");
  const completed = enrollments.filter((e) => e.status === "COMPLETED");

  const filtrados =
    filtro === "activos"     ? active :
    filtro === "completados" ? completed :
    enrollments;

  const tabs: { key: FiltroEstado; label: string; count: number; icon: string }[] = [
    { key: "todos",       label: "Todos",        count: enrollments.length, icon: "📋" },
    { key: "activos",     label: "En progreso",  count: active.length,      icon: "▶" },
    { key: "completados", label: "Completados",  count: completed.length,   icon: "✅" },
  ];

  return (
    <>
      <Navbar />
      <div className="dashboard-layout">

        {/* ── Sidebar ── */}
        <DashboardSidebar />

        {/* ── Main ── */}
        <main className="dashboard-main sim-page-main">
          <div className="dashboard-inner">

          {/* Hero */}
          <div className="sim-page-hero mc-hero">
            <div className="sim-page-hero-text">
              <h1 className="sim-page-titulo">Mis Cursos</h1>
              <p className="sim-page-sub">
                {fetching
                  ? "Cargando tus cursos…"
                  : `${enrollments.length} curso${enrollments.length !== 1 ? "s" : ""} inscrito${enrollments.length !== 1 ? "s" : ""} · ${active.length} en progreso`}
              </p>
            </div>
            <div className="sim-page-hero-deco" aria-hidden>📚</div>
          </div>

          {/* Stats */}
          {!fetching && enrollments.length > 0 && (
            <div className="sim-stats-row">
              <div className="sim-stat-card sim-stat-blue">
                <div className="sim-stat-icon-wrap">📋</div>
                <div className="sim-stat-body">
                  <div className="sim-stat-num">{enrollments.length}</div>
                  <div className="sim-stat-label">Total</div>
                </div>
              </div>
              <div className="sim-stat-card sim-stat-orange">
                <div className="sim-stat-icon-wrap">▶</div>
                <div className="sim-stat-body">
                  <div className="sim-stat-num">{active.length}</div>
                  <div className="sim-stat-label">En progreso</div>
                </div>
              </div>
              <div className="sim-stat-card sim-stat-green">
                <div className="sim-stat-icon-wrap">✅</div>
                <div className="sim-stat-body">
                  <div className="sim-stat-num">{completed.length}</div>
                  <div className="sim-stat-label">Completados</div>
                </div>
              </div>
            </div>
          )}

          {/* Filter tabs */}
          {!fetching && enrollments.length > 0 && (
            <div className="sim-filter-row">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  className={`sim-filter-tab ${filtro === tab.key ? "sim-filter-active" : ""}`}
                  onClick={() => setFiltro(tab.key)}
                >
                  <span className="sim-filter-icon">{tab.icon}</span>
                  {tab.label}
                  <span className="sim-filter-badge">{tab.count}</span>
                </button>
              ))}
            </div>
          )}

          {/* Loading */}
          {fetching && (
            <div className="sim-list-empty">
              <div className="sim-list-empty-icon">⏳</div>
              <div className="sim-list-empty-title">Cargando tus cursos…</div>
            </div>
          )}

          {/* Error */}
          {!fetching && error && (
            <div className="mc-error-banner">⚠️ {error}</div>
          )}

          {/* Sin cursos */}
          {!fetching && !error && enrollments.length === 0 && (
            <div className="sim-list-empty">
              <div className="sim-list-empty-icon">📭</div>
              <div className="sim-list-empty-title">Aún no tienes cursos</div>
              <div className="sim-list-empty-sub">
                Aquí aparecerán tus cursos una vez estés inscrito.
              </div>
              <Link href="/#programas" className="mc-empty-btn">
                Ver programas disponibles →
              </Link>
            </div>
          )}

          {/* Sin resultados para filtro */}
          {!fetching && !error && enrollments.length > 0 && filtrados.length === 0 && (
            <div className="sim-list-empty">
              <div className="sim-list-empty-icon">🔍</div>
              <div className="sim-list-empty-title">Sin resultados</div>
              <div className="sim-list-empty-sub">No hay cursos en este estado.</div>
            </div>
          )}

          {/* Grid de cursos */}
          {!fetching && !error && filtrados.length > 0 && (
            <div className="mc-grid">
              {filtrados.map((e, i) => (
                <CourseCard
                  key={e.id}
                  enrollment={e}
                  bg={e.status === "COMPLETED"
                    ? "linear-gradient(135deg,#475569,#64748b)"
                    : bgPalette[i % bgPalette.length]}
                  index={i}
                />
              ))}
            </div>
          )}
          </div>{/* /dashboard-inner */}
        </main>
      </div>
    </>
  );
}

function CourseCard({
  enrollment,
  bg,
  index,
}: {
  enrollment: Enrollment;
  bg: string;
  index: number;
}) {
  const { course, status, enrolledAt } = enrollment;
  const date = new Date(enrolledAt).toLocaleDateString("es-CO", {
    year: "numeric", month: "short", day: "numeric",
  });
  const lessonCount = course._count?.lessons ?? 0;
  const isCompleted = status === "COMPLETED";

  return (
    <div
      className="mc-card"
      style={{ animationDelay: `${index * 0.07}s` }}
    >
      {/* Header visual */}
      <div className="mc-thumb" style={{ background: bg }}>
        {course.thumbnail ? (
          <img
            src={mediaUrl(course.thumbnail)!}
            alt={course.title}
            className="mc-thumb-img"
          />
        ) : (
          <span className="mc-thumb-emoji-bg" aria-hidden>📘</span>
        )}

        {/* Overlay degradado */}
        <div className="mc-thumb-overlay" />

        {/* Badge */}
        <span className={`mc-badge ${isCompleted ? "mc-badge-done" : "mc-badge-active"}`}>
          {isCompleted ? "✓ Completado" : "▶ En progreso"}
        </span>

        {/* Título en el header */}
        <div className="mc-thumb-title">{course.title}</div>
      </div>

      {/* Body — mismas clases que simulacros */}
      <div className="sim-list-card-body">
        {course.description && (
          <p className="sim-list-card-desc">{course.description}</p>
        )}

        {/* Pills de info */}
        <div className="sim-list-info-pills">
          <span className="sim-info-pill">
            <span>📖</span> {lessonCount} lección{lessonCount !== 1 ? "es" : ""}
          </span>
          <span className="sim-info-pill">
            <span>📅</span> {date}
          </span>
        </div>

        {/* CTA */}
        <Link
          href={`/dashboard/mis-cursos/${course.id}`}
          className={`sim-list-btn ${isCompleted ? "mc-btn-done" : "mc-btn-active"}`}
        >
          <span className="sim-btn-icon">{isCompleted ? "📖" : "▶"}</span>
          {isCompleted ? "Repasar curso" : "Continuar curso"}
          <span className="sim-btn-arrow">→</span>
        </Link>
      </div>
    </div>
  );
}
