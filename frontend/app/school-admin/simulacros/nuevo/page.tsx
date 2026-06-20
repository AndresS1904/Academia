"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import SchoolAdminSidebar from "@/components/school-admin/SchoolAdminSidebar";
import { SimulacroForm } from "@/components/shared/SimulacroForm";

export default function NuevoSimulacroSchoolAdminPage() {
  const router = useRouter();

  return (
    <div style={{ minHeight: "100vh", background: "#f0f4ff" }}>
      <SchoolAdminSidebar />
      <main style={{ marginLeft: 260, padding: "32px 36px", minHeight: "100vh", boxSizing: "border-box" }}>

        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 28 }}>
          <Link
            href="/school-admin/simulacros"
            style={{ padding: "8px 14px", background: "#fff", border: "1px solid #e2eaf7", borderRadius: 10, color: "#475569", textDecoration: "none", fontSize: "0.85rem", fontWeight: 600 }}
          >
            ← Volver
          </Link>
          <div>
            <h1 style={{ fontSize: "1.5rem", fontWeight: 800, color: "#1e293b", margin: 0 }}>Nuevo simulacro</h1>
            <p style={{ color: "#64748b", fontSize: "0.875rem", margin: "4px 0 0" }}>
              Crea un simulacro para los estudiantes de tu colegio.
            </p>
          </div>
        </div>

        <SimulacroForm onSuccess={() => router.push("/school-admin/simulacros")} />

      </main>
    </div>
  );
}
