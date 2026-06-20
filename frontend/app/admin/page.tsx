"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";

interface AdminStats {
  totalStudents: number;
  totalCourses: number;
  inscritosHoy: number;
  mejorPuntaje: number | null;
}

interface RecentUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  isActive: boolean;
}

interface RecentCourse {
  id: string;
  title: string;
  isPublished: boolean;
  _count: { lessons: number };
}

export default function AdminPage() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();

  const [stats, setStats] = useState<AdminStats | null>(null);
  const [recentUsers, setRecentUsers] = useState<RecentUser[]>([]);
  const [recentCourses, setRecentCourses] = useState<RecentCourse[]>([]);

  useEffect(() => {
    if (!loading && !user) router.replace("/auth/login");
    if (!loading && user && user.role === "ADMIN") router.replace("/school-admin");
    if (!loading && user && user.role !== "SUPER_ADMIN" && user.role !== "ADMIN") router.replace("/dashboard");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, loading]);

  useEffect(() => {
    if (!user || (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN")) return;
    api.get<AdminStats>("/users/admin/stats").then(setStats).catch(() => {});
    api.get<RecentUser[]>("/users").then((data) => setRecentUsers(data.slice(0, 5))).catch(() => {});
    api.get<RecentCourse[]>("/courses/admin/all").then((data) => setRecentCourses(data.slice(0, 5))).catch(() => {});
  }, [user]);

  if (loading || !user) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f0f4ff",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "2.5rem", marginBottom: "12px" }}>⏳</div>
          <div style={{ fontFamily: "var(--font-poppins)", fontWeight: 700, color: "#004aad" }}>
            Cargando…
          </div>
        </div>
      </div>
    );
  }

  const statCards = [
    {
      icon: "👥",
      num: stats ? String(stats.totalStudents) : "—",
      label: "Estudiantes",
      color: "#004aad",
      bg: "#dbeafe",
    },
    {
      icon: "📚",
      num: stats ? String(stats.totalCourses) : "—",
      label: "Cursos",
      color: "#7c3aed",
      bg: "#ede9fe",
    },
    {
      icon: "🎓",
      num: stats ? String(stats.inscritosHoy) : "—",
      label: "Inscritos hoy",
      color: "#059669",
      bg: "#d1fae5",
    },
    {
      icon: "🏆",
      num: stats?.mejorPuntaje != null ? `${Math.round(stats.mejorPuntaje)}%` : "—",
      label: "Mejor puntaje",
      color: "#d97706",
      bg: "#fef3c7",
    },
  ];

  return (
    <div className="admin-layout">
      {/* Sidebar */}
      <aside className="admin-sidebar">
        <div className="admin-sidebar-logo">
          <div className="admin-sidebar-logo-text">
            Ap<span>rova</span>
          </div>
          <div className="admin-sidebar-badge">Panel Admin</div>
        </div>

        <nav className="sidebar-nav">
          {user.role === "SUPER_ADMIN" && <>
            <div className="sidebar-nav-label" style={{ color: "#f59e0b" }}>Super Admin</div>
            <Link href="/admin/schools" className="sidebar-link"><span className="sidebar-link-icon">🏫</span> Instituciones</Link>
            <Link href="/admin/products" className="sidebar-link"><span className="sidebar-link-icon">📦</span> Productos</Link>
            <Link href="/admin/licenses" className="sidebar-link"><span className="sidebar-link-icon">🔑</span> Licencias</Link>
          </>}
          <div className="sidebar-nav-label">Gestión</div>
          <Link href="/admin" className="sidebar-link active">
            <span className="sidebar-link-icon">📊</span> Dashboard
          </Link>
          <Link href="/admin/users" className="sidebar-link">
            <span className="sidebar-link-icon">👥</span> Usuarios
          </Link>
          <Link href="/admin/courses" className="sidebar-link">
            <span className="sidebar-link-icon">📚</span> Cursos
          </Link>
          <Link href="/admin/enrollments" className="sidebar-link">
            <span className="sidebar-link-icon">📝</span> Inscripciones
          </Link>
          <Link href="/admin/leads" className="sidebar-link">
            <span className="sidebar-link-icon">📞</span> Leads
          </Link>
          <Link href="/admin/questions" className="sidebar-link">
            <span className="sidebar-link-icon">🧠</span> Preguntas
          </Link>
          <Link href="/admin/simulacros" className="sidebar-link">
            <span className="sidebar-link-icon">📋</span> Simulacros
          </Link>

          <div className="sidebar-nav-label">Contenido</div>
          <Link href="/admin/site-content" className="sidebar-link">
            <span className="sidebar-link-icon">🖼</span> Contenido del sitio
          </Link>
          <Link href="/admin/gallery" className="sidebar-link">
            <span className="sidebar-link-icon">🖼</span> Galería
          </Link>

          <div className="sidebar-nav-label">Cuenta</div>
                    <button
            className="sidebar-link"
            style={{ width: "100%", background: "none", border: "none", cursor: "pointer", textAlign: "left" }}
            onClick={() => { logout(); router.push("/"); }}
          >
            <span className="sidebar-link-icon">🚪</span> Cerrar sesión
          </button>
        </nav>
      </aside>

      {/* Top bar */}
      <div className="admin-topbar">
        <div className="admin-topbar-inner">
          <div className="admin-topbar-title">Dashboard — Vista general</div>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: "linear-gradient(135deg,#004aad,#0059d1)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontFamily: "var(--font-poppins)", fontWeight: 900, fontSize: "0.85rem" }}>
              {(user.firstName[0] + user.lastName[0]).toUpperCase()}
            </div>
            <div>
              <div style={{ fontFamily: "var(--font-poppins)", fontSize: "0.85rem", fontWeight: 800, color: "#004aad" }}>{user.firstName} {user.lastName}</div>
              <div style={{ fontSize: "0.72rem", color: "#94a3b8", fontWeight: 700 }}>Administrador</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main */}
      <main className="admin-main">
        <div className="admin-content">

          {/* Stats */}
          <div className="admin-stat-grid">
            {statCards.map((s) => (
              <div
                className="admin-stat-card"
                key={s.label}
                style={{ "--stat-color": s.color, "--stat-bg": s.bg } as React.CSSProperties}
              >
                <div className="admin-stat-icon">{s.icon}</div>
                <div className="admin-stat-num" style={{ color: s.color }}>{s.num}</div>
                <div className="admin-stat-label">{s.label}</div>
              </div>
            ))}
          </div>

          {/* Recent users */}
          <div className="admin-table-wrap">
            <div className="admin-table-header">
              <div className="admin-table-title">Usuarios recientes</div>
              <Link href="/admin/users" className="btn-add">Ver todos →</Link>
            </div>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Correo</th>
                  <th>Rol</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {recentUsers.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ textAlign: "center", color: "#94a3b8", padding: "24px" }}>
                      Sin usuarios registrados
                    </td>
                  </tr>
                ) : (
                  recentUsers.map((u) => (
                    <tr key={u.id}>
                      <td style={{ fontWeight: 700 }}>{u.firstName} {u.lastName}</td>
                      <td>{u.email}</td>
                      <td>
                        <span
                          className="status-badge"
                          style={{
                            background: u.role === "ADMIN" ? "#ede9fe" : "#e0f2fe",
                            color: u.role === "ADMIN" ? "#7c3aed" : "#0284c7",
                          }}
                        >
                          {u.role}
                        </span>
                      </td>
                      <td>
                        <span className={`status-badge ${u.isActive ? "status-active" : "status-inactive"}`}>
                          {u.isActive ? "● Activo" : "● Inactivo"}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Recent courses */}
          <div className="admin-table-wrap">
            <div className="admin-table-header">
              <div className="admin-table-title">Cursos</div>
              <Link href="/admin/courses" className="btn-add">+ Nuevo curso</Link>
            </div>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Título</th>
                  <th>Lecciones</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {recentCourses.length === 0 ? (
                  <tr>
                    <td colSpan={3} style={{ textAlign: "center", color: "#94a3b8", padding: "24px" }}>
                      Sin cursos creados
                    </td>
                  </tr>
                ) : (
                  recentCourses.map((c) => (
                    <tr key={c.id}>
                      <td style={{ fontWeight: 700 }}>{c.title}</td>
                      <td>{c._count?.lessons ?? 0}</td>
                      <td>
                        <span className={`status-badge ${c.isPublished ? "status-published" : "status-draft"}`}>
                          {c.isPublished ? "Publicado" : "Borrador"}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Quick links */}
          <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
            {[
              { href: "/admin/courses", icon: "📚", label: "Gestionar cursos" },
              { href: "/admin/users", icon: "👥", label: "Gestionar usuarios" },
              { href: "/admin/questions", icon: "🧠", label: "Banco de preguntas" },
              { href: "/admin/simulacros", icon: "📋", label: "Simulacros" },
              { href: "/admin/site-content", icon: "✏️", label: "Editar contenido" },
              { href: "/admin/leads", icon: "📞", label: "Ver leads" },
            ].map((l) => (
              <Link
                key={l.href}
                href={l.href}
                style={{
                  flex: "1 1 180px", background: "#fff", borderRadius: "16px",
                  padding: "24px 20px", display: "flex", alignItems: "center", gap: "14px",
                  textDecoration: "none", boxShadow: "0 2px 8px rgba(0,74,173,0.07)",
                  border: "1px solid #e2eaf7", transition: "all 0.2s ease",
                  fontFamily: "var(--font-poppins)", fontWeight: 800, fontSize: "0.9rem", color: "#004aad",
                }}
              >
                <span style={{ fontSize: "1.6rem" }}>{l.icon}</span>
                {l.label}
              </Link>
            ))}
          </div>

        </div>
      </main>
    </div>
  );
}
