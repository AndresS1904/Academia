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
    _count: { lessons: number };
  };
}

interface Classroom {
  id: string;
}

interface SimulacroAssignment {
  id: string;
  completedAt: string | null;
}

const bgPalette = [
  "linear-gradient(135deg,#004aad,#1a6bff)",
  "linear-gradient(135deg,#d95e00,#fc740c)",
  "linear-gradient(135deg,#059669,#10b981)",
  "linear-gradient(135deg,#7c3aed,#a855f7)",
  "linear-gradient(135deg,#0891b2,#06b6d4)",
];

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [fetching, setFetching] = useState(true);
  const [simulacrosCompletados, setSimulacrosCompletados] = useState(0);
  const [aulasCount, setAulasCount] = useState(0);

  useEffect(() => {
    if (!loading && !user) router.replace("/auth/login");
    if (!loading && user?.mustChangePassword) router.replace("/auth/change-password");
    if (!loading && user?.role === "SUPER_ADMIN") router.replace("/admin");
    if (!loading && user?.role === "ADMIN") router.replace("/school-admin");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, loading]);

  useEffect(() => {
    if (!user) return;
    api.get<Enrollment[]>("/enrollments/me")
      .then(setEnrollments)
      .catch(() => {})
      .finally(() => setFetching(false));
    api.get<SimulacroAssignment[]>("/simulacros/me")
      .then((data) => setSimulacrosCompletados(data.filter((a) => a.completedAt !== null).length))
      .catch(() => {});
    api.get<Classroom[]>("/classrooms/my")
      .then((data) => setAulasCount(data.length))
      .catch(() => {});
  }, [user]);

  if (loading) {
    return (
      <div className="sim-loading-screen">
        <div className="sim-loading-spinner" />
        <div className="sim-loading-text">Cargando…</div>
      </div>
    );
  }

  if (!user) return null;

  const activos    = enrollments.filter((e) => e.status === "ACTIVE");
  const completados = enrollments.filter((e) => e.status === "COMPLETED");

  return (
    <>
      <Navbar />
      <div className="dashboard-layout">
        <DashboardSidebar />

        <main className="dashboard-main">
          <div className="dashboard-inner">
          {/* Saludo */}
          <div className="dashboard-header">
            <div className="dashboard-greeting">Hola, {user.firstName}</div>
            <div className="dashboard-subgreeting">
              Bienvenido de nuevo — aquí tienes un resumen de tu progreso.
            </div>
          </div>

          {/* Stats */}
          <div className="dashboard-cards">
            <div className="dash-card">
              <div className="dash-card-num">{activos.length}</div>
              <div className="dash-card-label">Cursos activos</div>
            </div>
            <div className="dash-card">
              <div className="dash-card-num">{aulasCount}</div>
              <div className="dash-card-label">Aulas inscritas</div>
            </div>
            <div className="dash-card">
              <div className="dash-card-num">{simulacrosCompletados}</div>
              <div className="dash-card-label">Simulacros hechos</div>
            </div>
            <div className="dash-card">
              <div className="dash-card-num">{completados.length}</div>
              <div className="dash-card-label">Cursos completados</div>
            </div>
          </div>

          {/* Cursos activos */}
          <div className="dashboard-section-title">Mis cursos activos</div>

          {fetching && (
            <div className="sim-list-empty">
              <div className="sim-list-empty-icon">⏳</div>
              <div className="sim-list-empty-title">Cargando cursos…</div>
            </div>
          )}

          {!fetching && enrollments.length === 0 && (
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

          {!fetching && activos.length > 0 && (
            <div className="course-list-grid">
              {activos.map((e, i) => (
                <Link
                  key={e.id}
                  href={`/dashboard/mis-cursos/${e.course.id}`}
                  className="course-list-item"
                  style={{ textDecoration: "none" }}
                >
                  <div
                    className="course-list-thumb"
                    style={{ background: bgPalette[i % bgPalette.length], fontSize: "1.8rem" }}
                  >
                    {e.course.thumbnail ? (
                      <img src={mediaUrl(e.course.thumbnail)!} alt={e.course.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : "📘"}
                  </div>
                  <div className="course-list-info">
                    <div className="course-list-title">{e.course.title}</div>
                    <div className="course-list-meta">
                      {e.course._count?.lessons ?? 0} lecciones
                    </div>
                  </div>
                  <span className="course-list-badge badge-active">En progreso</span>
                </Link>
              ))}
            </div>
          )}

          {!fetching && activos.length === 0 && completados.length > 0 && (
            <div className="sim-list-empty">
              <div className="sim-list-empty-icon">🎉</div>
              <div className="sim-list-empty-title">¡Has completado todos tus cursos!</div>
              <Link href="/dashboard/mis-cursos" className="mc-empty-btn">Ver mis cursos →</Link>
            </div>
          )}

          {/* Banner simulacros */}
          <div
            style={{
              marginTop: "32px",
              background: "linear-gradient(135deg,#004aad,#0059d1)",
              borderRadius: "20px",
              padding: "32px 36px",
              display: "flex",
              alignItems: "center",
              gap: "28px",
              justifyContent: "space-between",
              flexWrap: "wrap",
            }}
          >
            <div>
              <div style={{ fontFamily: "var(--font-poppins)", fontSize: "1.1rem", fontWeight: 900, color: "#fff", marginBottom: "6px" }}>
                ¿Listo para tu próximo simulacro?
              </div>
              <div style={{ color: "rgba(255,255,255,0.75)", fontSize: "0.9rem" }}>
                Practica con exámenes reales y mejora tu puntaje.
              </div>
            </div>
            <Link href="/dashboard/simulacros" className="btn btn-naranja">
              Ver simulacros →
            </Link>
          </div>
          </div>{/* /dashboard-inner */}
        </main>
      </div>
    </>
  );
}
