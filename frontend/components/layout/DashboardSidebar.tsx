"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { mediaUrl } from "@/lib/api";

export default function DashboardSidebar() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  if (!user) return null;

  const initial = (user.firstName[0] + user.lastName[0]).toUpperCase();

  function isActive(href: string, exact?: boolean) {
    if (exact) return pathname === href;
    return pathname.startsWith(href);
  }

  return (
    <aside className="dashboard-sidebar">
      <div className="sidebar-user">
        {user.avatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={mediaUrl(user.avatar) ?? user.avatar}
            alt="Avatar"
            className="sidebar-avatar"
            style={{ objectFit: "cover", padding: 0 }}
          />
        ) : (
          <div className="sidebar-avatar">{initial}</div>
        )}
        <div className="sidebar-name">{user.firstName} {user.lastName}</div>
        <div className="sidebar-role">Estudiante</div>
      </div>

      <nav className="sidebar-nav">
        {/* Inicio */}
        <Link
          href="/dashboard"
          className={`sidebar-link${isActive("/dashboard", true) ? " active" : ""}`}
        >
          <span className="sidebar-link-icon">🏠</span> Inicio
        </Link>

        {/* Aprender */}
        <div className="sidebar-nav-label">Aprender</div>
        <Link
          href="/dashboard/mis-cursos"
          className={`sidebar-link${isActive("/dashboard/mis-cursos") ? " active" : ""}`}
          style={{ paddingLeft: 28 }}
        >
          <span className="sidebar-link-icon">📖</span> Mis cursos
        </Link>
        <Link
          href="/dashboard/clases"
          className={`sidebar-link${isActive("/dashboard/clases") ? " active" : ""}`}
          style={{ paddingLeft: 28 }}
        >
          <span className="sidebar-link-icon">🏫</span> Mis aulas
        </Link>

        {/* Simulacros y Progreso */}
        <div className="sidebar-nav-label">Actividad</div>
        <Link
          href="/dashboard/simulacros"
          className={`sidebar-link${isActive("/dashboard/simulacros") ? " active" : ""}`}
        >
          <span className="sidebar-link-icon">📝</span> Simulacros
        </Link>
        <Link
          href="/dashboard/analitica"
          className={`sidebar-link${isActive("/dashboard/analitica") || isActive("/dashboard/resultados") ? " active" : ""}`}
        >
          <span className="sidebar-link-icon">📊</span> Mi progreso
        </Link>

        {/* Cuenta */}
        <div className="sidebar-nav-label">Cuenta</div>
        <Link
          href="/dashboard/perfil"
          className={`sidebar-link${isActive("/dashboard/perfil") ? " active" : ""}`}
        >
          <span className="sidebar-link-icon">👤</span> Perfil
        </Link>
        <button
          className="sidebar-link"
          style={{ width: "100%", background: "none", border: "none", cursor: "pointer", textAlign: "left" }}
          onClick={() => { logout(); router.push("/"); }}
        >
          <span className="sidebar-link-icon">🚪</span> Cerrar sesión
        </button>
      </nav>
    </aside>
  );
}
