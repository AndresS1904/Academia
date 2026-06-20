"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";

interface Template {
  id: string;
  name: string;
  description?: string;
  examType: string;
  isActive: boolean;
  createdAt: string;
  schoolId: string | null;
  createdBy: { firstName: string; lastName: string };
  _count: { sessions: number };
  sessions: {
    id: string;
    type: string;
    label: string;
    sections: {
      area: string;
      rules: { count: number }[];
    }[];
  }[];
}

const formatDate = (d: string) =>
  new Date(d).toLocaleDateString("es-CO", { day: "numeric", month: "short", year: "numeric" });

function countQuestions(template: Template) {
  return template.sessions
    .flatMap(s => s.sections)
    .flatMap(sec => sec.rules)
    .reduce((acc, r) => acc + r.count, 0);
}

export default function PlantillasPage() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [fetching, setFetching] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    api.get<Template[]>("/simulacro-templates")
      .then(setTemplates)
      .finally(() => setFetching(false));
  }, [user]);

  async function handleDelete(id: string) {
    if (!confirm("¿Desactivar esta plantilla?")) return;
    setDeletingId(id);
    try {
      await api.delete(`/simulacro-templates/${id}`);
      setTemplates(prev => prev.filter(t => t.id !== id));
    } catch (e: any) {
      alert(e.message ?? "Error al eliminar");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: "#0f172a", display: "flex" }}>
      {/* Sidebar */}
      <aside style={{ width: 240, minHeight: "100vh", background: "#1e293b", borderRight: "1px solid #334155", padding: "24px 0", display: "flex", flexDirection: "column", position: "fixed", left: 0, top: 0, bottom: 0 }}>
        <div style={{ padding: "0 24px 24px", borderBottom: "1px solid #334155" }}>
          <div style={{ fontSize: "1.3rem", fontWeight: 900, color: "#fff" }}>Ap<span style={{ color: "#3b82f6" }}>rova</span></div>
          <div style={{ fontSize: "0.7rem", color: "#94a3b8", marginTop: 2 }}>Panel Admin</div>
        </div>
        <nav style={{ padding: "16px 12px", flex: 1 }}>
          <div style={{ fontSize: "0.65rem", fontWeight: 700, color: "#64748b", padding: "8px 12px", textTransform: "uppercase", letterSpacing: 1 }}>Gestión</div>
          {[
            ["/admin", "📊", "Dashboard"],
            ["/admin/users", "👥", "Usuarios"],
            ["/admin/questions", "🧠", "Preguntas"],
            ["/admin/simulacros", "📋", "Simulacros"],
            ["/admin/plantillas", "🔧", "Plantillas"],
            ["/admin/courses", "📚", "Cursos"],
          ].map(([href, icon, label]) => (
            <Link key={href} href={href as string} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", borderRadius: 8, color: href === "/admin/plantillas" ? "#3b82f6" : "#94a3b8", background: href === "/admin/plantillas" ? "rgba(59,130,246,0.1)" : "transparent", textDecoration: "none", fontSize: "0.875rem", marginBottom: 2, fontWeight: href === "/admin/plantillas" ? 700 : 400 }}>
              <span>{icon}</span>{label}
            </Link>
          ))}
        </nav>
      </aside>

      <main style={{ marginLeft: 240, flex: 1, padding: "32px 36px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
          <div>
            <h1 style={{ fontSize: "1.5rem", fontWeight: 800, color: "#f1f5f9", margin: 0 }}>Plantillas de Simulacro</h1>
            <p style={{ color: "#64748b", fontSize: "0.875rem", margin: "4px 0 0" }}>
              {templates.length} plantilla{templates.length !== 1 ? "s" : ""} disponibles
            </p>
          </div>
          <Link
            href="/admin/plantillas/nueva"
            style={{ padding: "10px 20px", background: "#3b82f6", color: "#fff", borderRadius: 12, textDecoration: "none", fontWeight: 700, fontSize: "0.9rem" }}
          >
            + Nueva plantilla
          </Link>
        </div>

        {fetching ? (
          <div style={{ color: "#64748b", textAlign: "center", padding: 48 }}>Cargando…</div>
        ) : templates.length === 0 ? (
          <div style={{ background: "#1e293b", borderRadius: 16, border: "1px solid #334155", padding: "56px 24px", textAlign: "center" }}>
            <div style={{ fontSize: "2.5rem", marginBottom: 12 }}>🔧</div>
            <p style={{ color: "#94a3b8", marginBottom: 16 }}>No hay plantillas. Crea una para generar simulacros automáticamente.</p>
            <Link href="/admin/plantillas/nueva" style={{ padding: "10px 20px", background: "#3b82f6", color: "#fff", borderRadius: 10, textDecoration: "none", fontWeight: 700 }}>
              Crear primera plantilla
            </Link>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(380px, 1fr))", gap: 20 }}>
            {templates.map(t => {
              const totalQ = countQuestions(t);
              const areas = [...new Set(t.sessions.flatMap(s => s.sections.map(sec => sec.area)))];
              return (
                <div key={t.id} style={{ background: "#1e293b", borderRadius: 16, border: "1px solid #334155", padding: "24px", display: "flex", flexDirection: "column", gap: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <h3 style={{ fontSize: "1rem", fontWeight: 700, color: "#f1f5f9", margin: "0 0 4px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.name}</h3>
                      {t.description && (
                        <p style={{ color: "#64748b", fontSize: "0.8rem", margin: 0, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
                          {t.description}
                        </p>
                      )}
                    </div>
                    <span style={{ flexShrink: 0, marginLeft: 12, padding: "3px 8px", background: t.schoolId ? "#1e3a5f" : "#1a2e4a", color: t.schoolId ? "#60a5fa" : "#93c5fd", borderRadius: 6, fontSize: "0.7rem", fontWeight: 700 }}>
                      {t.schoolId ? "Colegio" : "Global"}
                    </span>
                  </div>

                  <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                    <div style={{ background: "#0f172a", borderRadius: 8, padding: "6px 12px", fontSize: "0.8rem", color: "#94a3b8" }}>
                      <span style={{ color: "#f1f5f9", fontWeight: 700 }}>{totalQ}</span> preguntas
                    </div>
                    <div style={{ background: "#0f172a", borderRadius: 8, padding: "6px 12px", fontSize: "0.8rem", color: "#94a3b8" }}>
                      <span style={{ color: "#f1f5f9", fontWeight: 700 }}>{t.sessions.length}</span> sesiones
                    </div>
                    <div style={{ background: "#0f172a", borderRadius: 8, padding: "6px 12px", fontSize: "0.8rem", color: "#94a3b8" }}>
                      {t.examType}
                    </div>
                  </div>

                  {areas.length > 0 && (
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {areas.slice(0, 5).map(a => (
                        <span key={a} style={{ padding: "2px 8px", background: "#0f172a", color: "#818cf8", border: "1px solid #312e81", borderRadius: 20, fontSize: "0.7rem" }}>{a}</span>
                      ))}
                      {areas.length > 5 && <span style={{ padding: "2px 8px", color: "#64748b", fontSize: "0.7rem" }}>+{areas.length - 5}</span>}
                    </div>
                  )}

                  <div style={{ fontSize: "0.75rem", color: "#475569" }}>
                    Por {t.createdBy.firstName} {t.createdBy.lastName} · {formatDate(t.createdAt)}
                  </div>

                  <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                    <Link
                      href={`/admin/plantillas/${t.id}`}
                      style={{ flex: 1, padding: "8px 0", textAlign: "center", background: "#0f172a", color: "#94a3b8", border: "1px solid #334155", borderRadius: 8, fontSize: "0.8rem", fontWeight: 600, textDecoration: "none" }}
                    >
                      Editar
                    </Link>
                    <Link
                      href={`/admin/plantillas/${t.id}/generar`}
                      style={{ flex: 1, padding: "8px 0", textAlign: "center", background: "#1d4ed8", color: "#fff", border: "none", borderRadius: 8, fontSize: "0.8rem", fontWeight: 700, textDecoration: "none" }}
                    >
                      ⚡ Generar
                    </Link>
                    <button
                      onClick={() => handleDelete(t.id)}
                      disabled={deletingId === t.id}
                      style={{ padding: "8px 12px", background: "#450a0a", color: "#f87171", border: "1px solid #7f1d1d", borderRadius: 8, fontSize: "0.8rem", fontWeight: 600, cursor: "pointer" }}
                    >
                      {deletingId === t.id ? "…" : "×"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
