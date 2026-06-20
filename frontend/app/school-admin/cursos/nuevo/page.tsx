"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { CourseForm } from "@/components/admin/CourseForm";
import SchoolAdminSidebar from "@/components/school-admin/SchoolAdminSidebar";

export default function NuevoCursoSchoolAdminPage() {
  const router = useRouter();

  return (
    <div style={{ minHeight: "100vh", background: "#f0f4ff" }}>
      <SchoolAdminSidebar />
      <main style={{ marginLeft: 260, padding: "32px 36px", minHeight: "100vh", boxSizing: "border-box" }}>

        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 28 }}>
          <Link
            href="/school-admin/cursos"
            style={{ padding: "8px 14px", background: "#fff", border: "1px solid #e2eaf7", borderRadius: 10, color: "#475569", textDecoration: "none", fontSize: "0.85rem", fontWeight: 600 }}
          >
            ← Volver
          </Link>
          <div>
            <h1 style={{ fontSize: "1.5rem", fontWeight: 800, color: "#1e293b", margin: 0 }}>Nuevo curso</h1>
            <p style={{ color: "#64748b", fontSize: "0.875rem", margin: "4px 0 0" }}>
              Crea un curso para los estudiantes de tu colegio.
            </p>
          </div>
        </div>

        <CourseForm
          basePath="/school-admin/cursos"
          onSuccess={(id) => router.push(id ? `/school-admin/cursos/${id}` : "/school-admin/cursos")}
        />

      </main>
    </div>
  );
}
