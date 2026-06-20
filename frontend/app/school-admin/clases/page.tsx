"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import SchoolAdminSidebar from "@/components/school-admin/SchoolAdminSidebar";
import { api } from "@/lib/api";

interface Classroom {
  id: string;
  title: string;
  description: string | null;
  color: string | null;
  emoji: string | null;
  isPublished: boolean;
  createdAt: string;
  _count: { modules: number; enrollments: number };
}

export default function ClasesAdminPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (!loading && (!user || user.role !== "ADMIN")) router.replace("/auth/login");
  }, [user, loading]);

  useEffect(() => {
    if (!user) return;
    api.get<Classroom[]>("/classrooms/admin")
      .then(setClassrooms)
      .catch(() => {})
      .finally(() => setFetching(false));
  }, [user]);

  async function togglePublish(id: string, current: boolean) {
    await api.patch(`/classrooms/admin/${id}`, { isPublished: !current });
    setClassrooms((prev) => prev.map((c) => c.id === id ? { ...c, isPublished: !current } : c));
  }

  async function remove(id: string) {
    if (!confirm("¿Eliminar esta aula? Se borrarán todos los módulos y materiales.")) return;
    await api.delete(`/classrooms/admin/${id}`);
    setClassrooms((prev) => prev.filter((c) => c.id !== id));
  }

  if (loading) return null;

  return (
    <div className="admin-layout">
      <SchoolAdminSidebar />
      <main className="admin-main">
        <div className="admin-content">

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28 }}>
            <div>
              <h1 style={{ fontFamily: "var(--font-poppins)", fontWeight: 800, fontSize: "1.6rem", color: "#1e293b", margin: 0 }}>
                Aulas Virtuales
              </h1>
              <p style={{ color: "#64748b", fontSize: "0.9rem", marginTop: 4 }}>
                Gestiona clases, módulos, materiales y actividades de tu institución.
              </p>
            </div>
            <Link href="/school-admin/clases/nueva" style={{
              padding: "10px 22px", background: "#004aad", color: "#fff",
              borderRadius: 10, textDecoration: "none", fontWeight: 700, fontSize: "0.9rem",
              display: "flex", alignItems: "center", gap: 8,
            }}>
              + Nueva aula
            </Link>
          </div>

          {fetching ? (
            <div style={{ textAlign: "center", padding: 60, color: "#94a3b8" }}>Cargando aulas…</div>
          ) : classrooms.length === 0 ? (
            <div style={{
              textAlign: "center", padding: "60px 24px",
              background: "#f8fafc", borderRadius: 16, border: "2px dashed #e2e8f0",
            }}>
              <div style={{ fontSize: "3rem", marginBottom: 12 }}>🏫</div>
              <div style={{ fontWeight: 700, fontSize: "1.1rem", color: "#1e293b", marginBottom: 8 }}>
                Sin aulas virtuales
              </div>
              <p style={{ color: "#64748b", marginBottom: 24 }}>
                Crea tu primera aula para subir materiales y actividades para tus estudiantes.
              </p>
              <Link href="/school-admin/clases/nueva" style={{
                padding: "12px 28px", background: "#004aad", color: "#fff",
                borderRadius: 10, textDecoration: "none", fontWeight: 700,
              }}>
                Crear aula
              </Link>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 20 }}>
              {classrooms.map((c) => (
                <div key={c.id} style={{
                  background: "#fff", borderRadius: 16,
                  border: "1px solid #e2e8f0", overflow: "hidden",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.05)", transition: "box-shadow 0.2s",
                }}>
                  <div style={{
                    height: 6,
                    background: c.color ?? "#004aad",
                  }} />
                  <div style={{ padding: "20px 22px 16px" }}>
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 12 }}>
                      <div style={{
                        width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                        background: `${c.color ?? "#004aad"}18`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: "1.4rem",
                      }}>
                        {c.emoji ?? "🏫"}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontWeight: 700, fontSize: "1rem", color: "#1e293b",
                          marginBottom: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                        }}>
                          {c.title}
                        </div>
                        <div style={{ fontSize: "0.8rem", color: "#94a3b8" }}>
                          {c._count.modules} módulo{c._count.modules !== 1 ? "s" : ""} · {c._count.enrollments} estudiante{c._count.enrollments !== 1 ? "s" : ""}
                        </div>
                      </div>
                      <span style={{
                        padding: "3px 10px", borderRadius: 20, fontSize: "0.72rem", fontWeight: 700,
                        background: c.isPublished ? "#dcfce7" : "#f1f5f9",
                        color: c.isPublished ? "#15803d" : "#64748b",
                        flexShrink: 0,
                      }}>
                        {c.isPublished ? "Publicada" : "Borrador"}
                      </span>
                    </div>
                    {c.description && (
                      <p style={{
                        fontSize: "0.82rem", color: "#64748b", marginBottom: 14,
                        display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                      }}>
                        {c.description}
                      </p>
                    )}
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <Link href={`/school-admin/clases/${c.id}`} style={{
                        flex: 1, padding: "8px 0", background: "#f0f4ff", color: "#004aad",
                        borderRadius: 8, textDecoration: "none", fontWeight: 700,
                        fontSize: "0.82rem", textAlign: "center",
                      }}>
                        Gestionar
                      </Link>
                      <button
                        onClick={() => togglePublish(c.id, c.isPublished)}
                        style={{
                          padding: "8px 12px", border: "1px solid #e2e8f0",
                          borderRadius: 8, background: "#fff", cursor: "pointer",
                          fontSize: "0.78rem", color: "#64748b", fontWeight: 600,
                        }}
                      >
                        {c.isPublished ? "Despublicar" : "Publicar"}
                      </button>
                      <button
                        onClick={() => remove(c.id)}
                        style={{
                          padding: "8px 10px", border: "1px solid #fee2e2",
                          borderRadius: 8, background: "#fff", cursor: "pointer",
                          fontSize: "0.82rem", color: "#dc2626",
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
