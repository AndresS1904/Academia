"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { CourseForm } from "@/components/admin/CourseForm";

function AdminSidebar({ logout, router, isSuperAdmin }: { logout: () => void; router: ReturnType<typeof useRouter>; isSuperAdmin?: boolean }) {
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
        <Link href="/admin/courses" className="sidebar-link active"><span className="sidebar-link-icon">📚</span> Cursos</Link>
        <Link href="/admin/enrollments" className="sidebar-link"><span className="sidebar-link-icon">📝</span> Inscripciones</Link>
        <Link href="/admin/leads" className="sidebar-link"><span className="sidebar-link-icon">📞</span> Leads</Link>
        <div className="sidebar-nav-label">Contenido</div>
        <Link href="/admin/site-content" className="sidebar-link"><span className="sidebar-link-icon">🖼</span> Contenido del sitio</Link>
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
  );
}

export default function NuevoCursoPage() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.replace("/auth/login");
    if (!loading && user && user.role !== "ADMIN" && user.role !== "SUPER_ADMIN") router.replace("/dashboard");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, loading]);

  if (loading || !user) return null;

  return (
    <div style={{ minHeight: "100vh", background: "#f0f4ff" }}>
      <AdminSidebar logout={logout} router={router} isSuperAdmin={user.role === "SUPER_ADMIN"} />

      <main style={{ marginLeft: 260, padding: "32px 36px", minHeight: "100vh", boxSizing: "border-box" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 28 }}>
          <Link
            href="/admin/courses"
            style={{ padding: "8px 14px", background: "#fff", border: "1px solid #e2eaf7", borderRadius: 10, color: "#475569", textDecoration: "none", fontSize: "0.85rem", fontWeight: 600 }}
          >
            ← Volver
          </Link>
          <div>
            <h1 style={{ fontSize: "1.5rem", fontWeight: 800, color: "#1e293b", margin: 0 }}>Nuevo curso</h1>
            <p style={{ color: "#64748b", fontSize: "0.875rem", margin: "4px 0 0" }}>Completa la información para crear el curso</p>
          </div>
        </div>

        <CourseForm
          basePath="/admin/courses"
          onSuccess={(id) => router.push(id ? `/admin/courses/${id}` : "/admin/courses")}
        />
      </main>
    </div>
  );
}
