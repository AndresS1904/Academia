"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { CourseForm, Section, ResourceType } from "@/components/admin/CourseForm";
import SchoolAdminSidebar from "@/components/school-admin/SchoolAdminSidebar";
import { Trash2 } from "lucide-react";

interface CourseDetail {
  id: string;
  title: string;
  instructorName?: string;
  duration?: string;
  thumbnail?: string;
  description?: string;
  isPublished: boolean;
  lessons: {
    id: string;
    title: string;
    order: number;
    resources: { id: string; title: string; type: string; url?: string; filePath?: string }[];
  }[];
}

export default function EditCursoSchoolAdminPage() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useParams();
  const courseId = params.id as string;

  const [course, setCourse] = useState<CourseDetail | null>(null);
  const [fetching, setFetching] = useState(true);
  const [fetchError, setFetchError] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!user) return;
    api.get<CourseDetail>(`/courses/admin/${courseId}`)
      .then(setCourse)
      .catch((e: any) => setFetchError(e.message ?? "Error al cargar el curso"))
      .finally(() => setFetching(false));
  }, [user, courseId]);

  async function handleDelete() {
    if (!course) return;
    if (!confirm(`¿Eliminar el curso "${course.title}"? Esta acción no se puede deshacer.`)) return;
    setDeleting(true);
    try {
      await api.delete(`/courses/${courseId}`);
      router.push("/school-admin/cursos");
    } catch (e: any) {
      alert(e.message ?? "Error al eliminar el curso");
      setDeleting(false);
    }
  }

  const initialSections: Section[] = (course?.lessons ?? []).map(l => ({
    id: l.id,
    title: l.title,
    subsections: l.resources.map((r: any) => ({
      id: r.id,
      title: r.title,
      type: r.type as ResourceType,
      url: r.url ?? r.filePath ?? "",
      _count: r._count,
    })),
  }));

  return (
    <div style={{ minHeight: "100vh", background: "#f0f4ff" }}>
      <SchoolAdminSidebar />
      <main style={{ marginLeft: 260, padding: "32px 36px", minHeight: "100vh", boxSizing: "border-box" }}>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, marginBottom: 28 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <Link
              href="/school-admin/cursos"
              style={{ padding: "8px 14px", background: "#fff", border: "1px solid #e2eaf7", borderRadius: 10, color: "#475569", textDecoration: "none", fontSize: "0.85rem", fontWeight: 600 }}
            >
              ← Volver
            </Link>
            <div>
              <h1 style={{ fontSize: "1.5rem", fontWeight: 800, color: "#1e293b", margin: 0 }}>
                {fetching ? "Cargando..." : course ? `Editar: ${course.title}` : "Curso"}
              </h1>
              <p style={{ color: "#64748b", fontSize: "0.875rem", margin: "4px 0 0" }}>Modifica el contenido del curso</p>
            </div>
          </div>
          {course && (
            <button
              onClick={handleDelete}
              disabled={deleting}
              style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 16px", background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca", borderRadius: 10, cursor: deleting ? "not-allowed" : "pointer", fontSize: "0.85rem", fontWeight: 600 }}
            >
              <Trash2 size={15} />
              {deleting ? "Eliminando..." : "Eliminar curso"}
            </button>
          )}
        </div>

        {fetching && (
          <div style={{ padding: "56px 24px", textAlign: "center", color: "#64748b" }}>⏳ Cargando curso…</div>
        )}

        {fetchError && (
          <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 12, padding: "16px 20px", color: "#dc2626" }}>
            ⚠ {fetchError}
          </div>
        )}

        {!fetching && course && (
          <CourseForm
            courseId={course.id}
            initialCourse={{
              title: course.title,
              instructorName: course.instructorName ?? "",
              duration: course.duration ?? "",
              thumbnail: course.thumbnail ?? "",
              description: course.description ?? "",
              isPublished: course.isPublished,
            }}
            initialSections={initialSections}
            onSuccess={() => router.push("/school-admin/cursos")}
          />
        )}

      </main>
    </div>
  );
}
