"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import DashboardSidebar from "@/components/layout/DashboardSidebar";
import { api } from "@/lib/api";

interface Classroom {
  id: string;
  title: string;
  description: string | null;
  color: string | null;
  emoji: string | null;
  _count: { modules: number; classroomCourses: number; classroomSimulacros: number };
  school: { name: string } | null;
}

type Filtro = "todas" | "activas";

export default function MisAulasPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [fetching, setFetching] = useState(true);
  const [filtro, setFiltro] = useState<Filtro>("todas");

  useEffect(() => {
    if (!loading && !user) router.replace("/auth/login");
    if (!loading && user?.mustChangePassword) router.replace("/auth/change-password");
  }, [user, loading]);

  useEffect(() => {
    if (!user) return;
    api.get<Classroom[]>("/classrooms/my")
      .then(setClassrooms)
      .catch(() => {})
      .finally(() => setFetching(false));
  }, [user]);

  if (loading) {
    return (
      <div className="sim-loading-screen">
        <div className="sim-loading-spinner" />
        <div className="sim-loading-text">Cargando aulas…</div>
      </div>
    );
  }

  if (!user) return null;

  const total = classrooms.length;
  const filtered = filtro === "todas" ? classrooms : classrooms;

  const tabs: { key: Filtro; label: string; count: number }[] = [
    { key: "todas",   label: "Todas",   count: total },
    { key: "activas", label: "Activas", count: total },
  ];

  return (
    <div className="dashboard-layout">
      <DashboardSidebar />

      <main className="dashboard-main">
        <div className="dashboard-inner">

          {/* Hero */}
          <div className="aula-hero">
            <div className="aula-hero-text">
              <h1 className="aula-hero-titulo">Mis Aulas Virtuales</h1>
              <p className="aula-hero-sub">
                Accede a tus clases, cursos y simulacros asignados por tu institución.
              </p>
            </div>
            <div className="aula-hero-deco" aria-hidden>🏫</div>
          </div>

          {/* Stats row */}
          {total > 0 && (
            <div className="sim-stats-row">
              <div className="sim-stat-card sim-stat-green">
                <div className="sim-stat-body">
                  <div className="sim-stat-num">{total}</div>
                  <div className="sim-stat-label">Aulas inscritas</div>
                </div>
              </div>
              <div className="sim-stat-card sim-stat-blue">
                <div className="sim-stat-body">
                  <div className="sim-stat-num">
                    {classrooms.reduce((s, c) => s + c._count.classroomCourses, 0)}
                  </div>
                  <div className="sim-stat-label">Cursos asignados</div>
                </div>
              </div>
              <div className="sim-stat-card sim-stat-orange">
                <div className="sim-stat-body">
                  <div className="sim-stat-num">
                    {classrooms.reduce((s, c) => s + c._count.classroomSimulacros, 0)}
                  </div>
                  <div className="sim-stat-label">Simulacros asignados</div>
                </div>
              </div>
              <div className="sim-stat-card sim-stat-purple">
                <div className="sim-stat-body">
                  <div className="sim-stat-num">
                    {classrooms.reduce((s, c) => s + c._count.modules, 0)}
                  </div>
                  <div className="sim-stat-label">Módulos totales</div>
                </div>
              </div>
            </div>
          )}

          {/* Filter tabs */}
          {total > 0 && (
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
              <div className="sim-list-empty-title">Cargando aulas…</div>
            </div>
          ) : classrooms.length === 0 ? (
            <div className="sim-list-empty">
              <div className="sim-list-empty-icon">🏫</div>
              <div className="sim-list-empty-title">Sin aulas asignadas</div>
              <div className="sim-list-empty-sub">
                Tu institución aún no te ha inscrito en ninguna aula virtual.
              </div>
            </div>
          ) : (
            <div className="aula-list-grid">
              {filtered.map((c, idx) => {
                const accentColor = c.color ?? "#059669";
                const coursesCount = c._count.classroomCourses;
                const simsCount = c._count.classroomSimulacros;
                const modulesCount = c._count.modules;

                return (
                  <div
                    key={c.id}
                    className="aula-card"
                    style={{ animationDelay: `${idx * 0.06}s` }}
                  >
                    {/* Card header */}
                    <div
                      className="aula-card-header"
                      style={{ background: `linear-gradient(135deg, ${accentColor}dd, ${accentColor})` }}
                    >
                      <div className="aula-card-emoji-bg" aria-hidden>
                        {c.emoji ?? "🏫"}
                      </div>
                      <div className="aula-card-emoji">{c.emoji ?? "🏫"}</div>
                      <div className="aula-card-header-title">{c.title}</div>
                      {c.school && (
                        <div className="aula-card-school">{c.school.name}</div>
                      )}
                    </div>

                    {/* Card body */}
                    <div className="aula-card-body">
                      {c.description && (
                        <p className="aula-card-desc">{c.description}</p>
                      )}

                      <div className="aula-info-pills">
                        <span className="aula-info-pill">
                          <span>📚</span>
                          {coursesCount} curso{coursesCount !== 1 ? "s" : ""}
                        </span>
                        <span className="aula-info-pill">
                          <span>🎯</span>
                          {simsCount} simulacro{simsCount !== 1 ? "s" : ""}
                        </span>
                        <span className="aula-info-pill">
                          <span>📋</span>
                          {modulesCount} módulo{modulesCount !== 1 ? "s" : ""}
                        </span>
                      </div>

                      <span className="aula-status-badge">🟢 Activa</span>

                      <Link href={`/dashboard/clases/${c.id}`} className="aula-cta-btn">
                        Entrar al aula
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
  );
}
