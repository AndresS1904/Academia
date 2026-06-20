"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import SchoolAdminSidebar from "@/components/school-admin/SchoolAdminSidebar";

interface Stats {
  estudiantes: number;
  cursosPropios: number;
  simulacrosPropios: number;
  licenciasActivas: number;
}

interface LicenseRow {
  id: string;
  status: string;
  endsAt: string | null;
  product: { name: string; type: string };
}

const formatDate = (d: string | null) =>
  d ? new Date(d).toLocaleDateString("es-CO", { day: "numeric", month: "short", year: "numeric" }) : "Perpetua";

export default function SchoolAdminPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [licenses, setLicenses] = useState<LicenseRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      api.get<LicenseRow[]>("/licenses/my-school"),
      api.get<{ id: string }[]>("/users/my-school/students"),
      api.get<{ id: string; isGlobal: boolean }[]>("/courses/admin/all"),
      api.get<{ id: string; isGlobal: boolean }[]>("/simulacros/admin/all"),
    ]).then(([lics, students, courses, simulacros]) => {
      setLicenses(lics);
      setStats({
        estudiantes: students.length,
        cursosPropios: courses.filter(c => !c.isGlobal).length,
        simulacrosPropios: simulacros.filter(s => !s.isGlobal).length,
        licenciasActivas: lics.filter(l => l.status === "ACTIVE").length,
      });
    }).finally(() => setLoading(false));
  }, [user]);

  const activeLicenses = licenses.filter(l => l.status === "ACTIVE");

  return (
    <div style={{ minHeight: "100vh", background: "#f0f4ff" }}>
      <SchoolAdminSidebar />
      <main style={{ marginLeft: 260, padding: "32px 36px", minHeight: "100vh", boxSizing: "border-box" }}>

        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 800, color: "#1e293b", margin: 0 }}>
            Panel de administración
          </h1>
          <p style={{ color: "#64748b", fontSize: "0.875rem", margin: "4px 0 0" }}>
            Gestiona el contenido y los estudiantes de tu colegio.
          </p>
        </div>

        {loading ? (
          <div style={{ padding: "80px 0", textAlign: "center", color: "#64748b" }}>⏳ Cargando…</div>
        ) : (
          <>
            {/* Stats */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 28 }}>
              {[
                { label: "Estudiantes", value: stats?.estudiantes ?? 0, color: "#004aad", href: "/school-admin/estudiantes", icon: "👥" },
                { label: "Cursos propios", value: stats?.cursosPropios ?? 0, color: "#7c3aed", href: "/school-admin/cursos", icon: "📚" },
                { label: "Simulacros propios", value: stats?.simulacrosPropios ?? 0, color: "#0891b2", href: "/school-admin/simulacros", icon: "📋" },
                { label: "Licencias activas", value: stats?.licenciasActivas ?? 0, color: "#16a34a", href: "/school-admin/licencias", icon: "🔑" },
              ].map(stat => (
                <Link
                  key={stat.label}
                  href={stat.href}
                  style={{ textDecoration: "none" }}
                >
                  <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e2eaf7", boxShadow: "0 2px 8px rgba(0,74,173,0.06)", padding: "20px 24px", transition: "box-shadow 0.15s", cursor: "pointer" }}>
                    <div style={{ fontSize: "1.4rem", marginBottom: 8 }}>{stat.icon}</div>
                    <div style={{ fontSize: "0.78rem", fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>{stat.label}</div>
                    <div style={{ fontSize: "2rem", fontWeight: 800, color: stat.color }}>{stat.value}</div>
                  </div>
                </Link>
              ))}
            </div>

            {/* Quick actions */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 28 }}>
              <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e2eaf7", boxShadow: "0 2px 8px rgba(0,74,173,0.06)", padding: "24px 28px" }}>
                <h2 style={{ fontSize: "0.95rem", fontWeight: 700, color: "#1e293b", margin: "0 0 16px" }}>Acciones rápidas</h2>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {[
                    { href: "/school-admin/estudiantes/nuevo", label: "Agregar estudiante", icon: "➕", color: "#004aad" },
                    { href: "/school-admin/asignaciones", label: "Asignar contenido", icon: "📌", color: "#7c3aed" },
                    { href: "/school-admin/catalogo", label: "Ver catálogo de contenido", icon: "🗂️", color: "#0891b2" },
                    { href: "/school-admin/cursos/nuevo", label: "Crear nuevo curso", icon: "📚", color: "#16a34a" },
                  ].map(action => (
                    <Link
                      key={action.href}
                      href={action.href}
                      style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 10, background: "#f8faff", border: "1px solid #e2eaf7", textDecoration: "none", fontSize: "0.875rem", fontWeight: 600, color: action.color, transition: "background 0.15s" }}
                    >
                      <span>{action.icon}</span>
                      {action.label}
                    </Link>
                  ))}
                </div>
              </div>

              {/* Active licenses */}
              <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e2eaf7", boxShadow: "0 2px 8px rgba(0,74,173,0.06)", padding: "24px 28px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                  <h2 style={{ fontSize: "0.95rem", fontWeight: 700, color: "#1e293b", margin: 0 }}>Licencias activas</h2>
                  <Link href="/school-admin/licencias" style={{ fontSize: "0.8rem", color: "#004aad", textDecoration: "none", fontWeight: 600 }}>Ver todas →</Link>
                </div>
                {activeLicenses.length === 0 ? (
                  <p style={{ color: "#94a3b8", fontSize: "0.875rem", margin: 0 }}>No tienes licencias activas. Contacta a tu administrador de Aprova.</p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {activeLicenses.slice(0, 5).map(lic => (
                      <div key={lic.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", borderRadius: 10, background: "#f0fdf4", border: "1px solid #bbf7d0" }}>
                        <div>
                          <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "#1e293b" }}>{lic.product.name}</div>
                          <div style={{ fontSize: "0.75rem", color: "#64748b" }}>{lic.product.type}</div>
                        </div>
                        <div style={{ fontSize: "0.75rem", color: "#64748b" }}>
                          {formatDate(lic.endsAt)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
