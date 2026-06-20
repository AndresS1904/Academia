"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { mediaUrl } from "@/lib/api";

interface NavItem {
  href: string;
  icon: string;
  label: string;
  exact?: boolean;
}

const GROUPS: { label: string | null; items: NavItem[] }[] = [
  {
    label: null,
    items: [
      { href: "/school-admin", icon: "📊", label: "Dashboard", exact: true },
    ],
  },
  {
    label: "Contenido",
    items: [
      { href: "/school-admin/cursos",      icon: "📚", label: "Mis cursos" },
      { href: "/school-admin/simulacros",  icon: "🎯", label: "Simulacros" },
      { href: "/school-admin/preguntas",   icon: "🧠", label: "Banco de preguntas" },
    ],
  },
  {
    label: "Académico",
    items: [
      { href: "/school-admin/clases",      icon: "🏫", label: "Aulas virtuales" },
      { href: "/school-admin/grupos",      icon: "👥", label: "Grupos" },
      { href: "/school-admin/estudiantes", icon: "🎓", label: "Estudiantes" },
    ],
  },
  {
    label: "Resultados",
    items: [
      { href: "/school-admin/analitica",   icon: "📈", label: "Analítica" },
    ],
  },
  {
    label: "Administración",
    items: [
      { href: "/school-admin/licencias",   icon: "🔑", label: "Licencias" },
      { href: "/school-admin/anti-fraude", icon: "🛡️", label: "Anti-fraude" },
    ],
  },
];

export default function SchoolAdminSidebar() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const school = user?.school;
  const sitioUrl = school?.slug ? `/${school.slug}/inicio` : "#";
  const logoSrc = mediaUrl(school?.logoUrl);

  function isActive(href: string, exact?: boolean) {
    if (exact) return pathname === href;
    return pathname.startsWith(href);
  }

  return (
    <aside className="admin-sidebar">
      {/* Encabezado con nombre y logo del colegio */}
      <div className="admin-sidebar-logo" style={{ padding: "20px 16px 16px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 10, overflow: "hidden", flexShrink: 0,
            background: "rgba(255,255,255,0.12)", display: "flex", alignItems: "center",
            justifyContent: "center", border: "1px solid rgba(255,255,255,0.18)",
          }}>
            {logoSrc ? (
              <img
                src={logoSrc}
                alt={school?.name ?? "Logo"}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            ) : (
              <span style={{ fontSize: "1.2rem", color: "rgba(255,255,255,0.7)" }}>
                {school?.name?.charAt(0)?.toUpperCase() ?? "?"}
              </span>
            )}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{
              fontWeight: 800, fontSize: "0.85rem", color: "#fff",
              whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
              maxWidth: 160,
            }}>
              {school?.name ?? "Cargando..."}
            </div>
            <div style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.5)", fontWeight: 500, marginTop: 1 }}>
              Panel Institución
            </div>
          </div>
        </div>
      </div>

      <nav className="sidebar-nav">
        {GROUPS.map((group, gi) => (
          <div key={gi}>
            {group.label && (
              <div className="sidebar-nav-label">{group.label}</div>
            )}
            {group.items.map(({ href, icon, label, exact }) => (
              <Link
                key={href}
                href={href}
                className={`sidebar-link${isActive(href, exact) ? " active" : ""}`}
              >
                <span className="sidebar-link-icon">{icon}</span> {label}
              </Link>
            ))}
          </div>
        ))}

        <div className="sidebar-nav-label">Cuenta</div>
        <Link href="/dashboard" className="sidebar-link">
          <span className="sidebar-link-icon">🎓</span> Portal estudiante
        </Link>
        <a href={sitioUrl} target="_blank" rel="noopener noreferrer" className="sidebar-link">
          <span className="sidebar-link-icon">🌐</span> Ver sitio web
        </a>
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
