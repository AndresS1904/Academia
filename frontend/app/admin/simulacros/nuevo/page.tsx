"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { SimulacroForm } from "@/components/shared/SimulacroForm";

function AdminSidebar({ onLogout, isSuperAdmin }: { onLogout: () => void; isSuperAdmin?: boolean }) {
  return (
    <aside className="admin-sidebar">
      <div className="admin-sidebar-logo">
        <div className="admin-sidebar-logo-text">Ap<span>rova</span></div>
        <div className="admin-sidebar-badge">Panel Admin</div>
      </div>
      <nav className="sidebar-nav">
        {isSuperAdmin && <>
          <div className="sidebar-nav-label" style={{ color: "#f59e0b" }}>Super Admin</div>
          <Link href="/admin/schools" className="sidebar-link"><span className="sidebar-link-icon">🏫</span> Instituciones</Link>
          <Link href="/admin/products" className="sidebar-link"><span className="sidebar-link-icon">📦</span> Productos</Link>
          <Link href="/admin/licenses" className="sidebar-link"><span className="sidebar-link-icon">🔑</span> Licencias</Link>
        </>}
        <div className="sidebar-nav-label">Gestión</div>
        <Link href="/admin" className="sidebar-link"><span className="sidebar-link-icon">📊</span> Dashboard</Link>
        <Link href="/admin/users" className="sidebar-link"><span className="sidebar-link-icon">👥</span> Usuarios</Link>
        <Link href="/admin/courses" className="sidebar-link"><span className="sidebar-link-icon">📚</span> Cursos</Link>
        <Link href="/admin/leads" className="sidebar-link"><span className="sidebar-link-icon">📞</span> Leads</Link>
        <Link href="/admin/questions" className="sidebar-link"><span className="sidebar-link-icon">🧠</span> Preguntas</Link>
        <Link href="/admin/simulacros" className="sidebar-link active"><span className="sidebar-link-icon">📋</span> Simulacros</Link>
        <div className="sidebar-nav-label">Contenido</div>
        <Link href="/admin/site-content" className="sidebar-link"><span className="sidebar-link-icon">🖼</span> Contenido del sitio</Link>
        <div className="sidebar-nav-label">Cuenta</div>
        <button className="sidebar-link" style={{ width: "100%", background: "none", border: "none", cursor: "pointer", textAlign: "left" }} onClick={onLogout}>
          <span className="sidebar-link-icon">🚪</span> Cerrar sesión
        </button>
      </nav>
    </aside>
  );
}

export default function NuevoSimulacroPage() {
  const router = useRouter();
  const { user, logout } = useAuth();

  if (!user || (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN")) return null;

  return (
    <div style={{ minHeight: "100vh", background: "#f0f4ff" }}>
      <AdminSidebar onLogout={logout} isSuperAdmin={user?.role === "SUPER_ADMIN"} />

      <main style={{ marginLeft: 260, padding: 32 }}>
        <div style={{ marginBottom: 28 }}>
          <Link href="/admin/simulacros" style={{ fontSize: "0.875rem", color: "#004aad", textDecoration: "none", fontWeight: 600 }}>
            ← Volver a simulacros
          </Link>
          <h1 style={{ fontWeight: 800, fontSize: "1.75rem", color: "#1e293b", margin: "8px 0 0" }}>
            Nuevo simulacro
          </h1>
        </div>

        <SimulacroForm onSuccess={() => router.push("/admin/simulacros")} />
      </main>
    </div>
  );
}
