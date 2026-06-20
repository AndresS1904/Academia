"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import SchoolAdminSidebar from "@/components/school-admin/SchoolAdminSidebar";
import Link from "next/link";

interface Course {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  thumbnail: string | null;
  isGlobal: boolean;
  schoolId: string | null;
  _count: { lessons: number; enrollments: number };
}

interface Simulacro {
  id: string;
  titulo: string;
  descripcion: string | null;
  isGlobal: boolean;
  schoolId: string | null;
  totalPreguntas: number;
  duracionMinutos: number;
  areasEvaluadas: string[];
  emoji: string;
  color: string;
}

type Tab = "courses" | "simulacros";
type Filter = "all" | "own" | "premium";

export default function CatalogoPage() {
  const { user } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [simulacros, setSimulacros] = useState<Simulacro[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("courses");
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!user) return;
    Promise.all([
      api.get<Course[]>("/access/catalog/courses"),
      api.get<Simulacro[]>("/access/catalog/simulacros"),
    ]).then(([c, s]) => {
      setCourses(c);
      setSimulacros(s);
    }).finally(() => setLoading(false));
  }, [user]);

  const filteredCourses = courses.filter(c => {
    const matchSearch = search === "" || c.title.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === "all" || (filter === "own" ? !c.isGlobal : c.isGlobal);
    return matchSearch && matchFilter;
  });

  const filteredSimulacros = simulacros.filter(s => {
    const matchSearch = search === "" || s.titulo.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === "all" || (filter === "own" ? !s.isGlobal : s.isGlobal);
    return matchSearch && matchFilter;
  });

  const tabStyle = (active: boolean): React.CSSProperties => ({
    padding: "8px 20px",
    borderRadius: 10,
    border: "none",
    fontWeight: 700,
    fontSize: "0.875rem",
    cursor: "pointer",
    background: active ? "#004aad" : "#f1f5f9",
    color: active ? "#fff" : "#475569",
    transition: "all 0.15s",
  });

  const filterBtn = (f: Filter, label: string) => (
    <button
      onClick={() => setFilter(f)}
      style={{ padding: "7px 14px", borderRadius: 8, border: "none", fontWeight: 600, fontSize: "0.8rem", cursor: "pointer", background: filter === f ? "#e0e7ff" : "#f1f5f9", color: filter === f ? "#3730a3" : "#64748b" }}
    >
      {label}
    </button>
  );

  return (
    <div style={{ minHeight: "100vh", background: "#f0f4ff" }}>
      <SchoolAdminSidebar />
      <main style={{ marginLeft: 260, padding: "32px 36px", minHeight: "100vh", boxSizing: "border-box" }}>

        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 800, color: "#1e293b", margin: 0 }}>Catálogo de contenido</h1>
          <p style={{ color: "#64748b", fontSize: "0.875rem", margin: "4px 0 0" }}>
            Contenido disponible para tu colegio: propio y con licencia activa.
          </p>
        </div>

        {/* Info banner */}
        <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 12, padding: "12px 18px", marginBottom: 22, display: "flex", gap: 10, alignItems: "center" }}>
          <span style={{ fontSize: "1.1rem" }}>ℹ️</span>
          <span style={{ fontSize: "0.85rem", color: "#1e40af" }}>
            El contenido <strong>Premium</strong> proviene de Aprova y requiere licencia activa. El contenido <strong>Propio</strong> fue creado por tu colegio.
          </span>
        </div>

        {/* Controls */}
        <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap", alignItems: "center" }}>
          <button onClick={() => setTab("courses")} style={tabStyle(tab === "courses")}>
            📚 Cursos ({courses.length})
          </button>
          <button onClick={() => setTab("simulacros")} style={tabStyle(tab === "simulacros")}>
            📋 Simulacros ({simulacros.length})
          </button>
          <div style={{ width: 1, height: 28, background: "#e2eaf7", margin: "0 4px" }} />
          {filterBtn("all", "Todo")}
          {filterBtn("own", "🏫 Propio")}
          {filterBtn("premium", "⭐ Premium")}
          <input
            type="text"
            placeholder="Buscar…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ marginLeft: "auto", padding: "8px 14px", borderRadius: 10, border: "1px solid #e2eaf7", fontSize: "0.875rem", outline: "none", background: "#fff", width: 220 }}
          />
        </div>

        {loading ? (
          <div style={{ padding: "80px 0", textAlign: "center", color: "#64748b" }}>⏳ Cargando catálogo…</div>
        ) : tab === "courses" ? (
          filteredCourses.length === 0 ? (
            <div style={{ padding: "60px 0", textAlign: "center", color: "#94a3b8" }}>No hay cursos disponibles con los filtros actuales.</div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 18 }}>
              {filteredCourses.map(c => (
                <div key={c.id} style={{ background: "#fff", borderRadius: 14, border: "1px solid #e2eaf7", boxShadow: "0 2px 8px rgba(0,74,173,0.06)", overflow: "hidden" }}>
                  {c.thumbnail && (
                    <img src={c.thumbnail} alt={c.title} style={{ width: "100%", height: 140, objectFit: "cover" }} />
                  )}
                  {!c.thumbnail && (
                    <div style={{ height: 80, background: "linear-gradient(135deg, #004aad 0%, #0066ff 100%)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <span style={{ fontSize: "2rem" }}>📚</span>
                    </div>
                  )}
                  <div style={{ padding: "16px 18px" }}>
                    <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
                      <span style={{ display: "inline-block", padding: "2px 8px", borderRadius: 20, fontSize: "0.7rem", fontWeight: 700, background: c.isGlobal ? "#fef3c7" : "#f0fdf4", color: c.isGlobal ? "#92400e" : "#16a34a" }}>
                        {c.isGlobal ? "⭐ Premium" : "🏫 Propio"}
                      </span>
                    </div>
                    <h3 style={{ fontSize: "0.95rem", fontWeight: 700, color: "#1e293b", margin: "0 0 6px", lineHeight: 1.3 }}>{c.title}</h3>
                    {c.description && (
                      <p style={{ fontSize: "0.8rem", color: "#64748b", margin: "0 0 12px", lineHeight: 1.5, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
                        {c.description}
                      </p>
                    )}
                    <div style={{ display: "flex", gap: 12, fontSize: "0.75rem", color: "#94a3b8", marginBottom: 12 }}>
                      <span>{c._count.lessons} lecciones</span>
                      <span>{c._count.enrollments} inscritos</span>
                    </div>
                    <Link
                      href={`/school-admin/asignaciones?courseId=${c.id}`}
                      style={{ display: "block", textAlign: "center", padding: "8px 0", background: "#004aad", color: "#fff", borderRadius: 8, textDecoration: "none", fontWeight: 700, fontSize: "0.82rem" }}
                    >
                      Asignar a estudiantes
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : (
          filteredSimulacros.length === 0 ? (
            <div style={{ padding: "60px 0", textAlign: "center", color: "#94a3b8" }}>No hay simulacros disponibles con los filtros actuales.</div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 18 }}>
              {filteredSimulacros.map(s => (
                <div key={s.id} style={{ background: "#fff", borderRadius: 14, border: "1px solid #e2eaf7", boxShadow: "0 2px 8px rgba(0,74,173,0.06)", overflow: "hidden" }}>
                  <div style={{ height: 90, background: `linear-gradient(135deg, ${s.color} 0%, ${s.color}cc 100%)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "2.5rem" }}>
                    {s.emoji}
                  </div>
                  <div style={{ padding: "16px 18px" }}>
                    <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
                      <span style={{ display: "inline-block", padding: "2px 8px", borderRadius: 20, fontSize: "0.7rem", fontWeight: 700, background: s.isGlobal ? "#fef3c7" : "#f0fdf4", color: s.isGlobal ? "#92400e" : "#16a34a" }}>
                        {s.isGlobal ? "⭐ Premium" : "🏫 Propio"}
                      </span>
                    </div>
                    <h3 style={{ fontSize: "0.95rem", fontWeight: 700, color: "#1e293b", margin: "0 0 6px" }}>{s.titulo}</h3>
                    <div style={{ display: "flex", gap: 12, fontSize: "0.75rem", color: "#94a3b8", marginBottom: 12 }}>
                      <span>{s.totalPreguntas} preguntas</span>
                      <span>{s.duracionMinutos} min</span>
                    </div>
                    {s.areasEvaluadas.length > 0 && (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 12 }}>
                        {s.areasEvaluadas.slice(0, 3).map(a => (
                          <span key={a} style={{ padding: "2px 8px", borderRadius: 20, fontSize: "0.7rem", background: "#f1f5f9", color: "#475569" }}>{a}</span>
                        ))}
                        {s.areasEvaluadas.length > 3 && (
                          <span style={{ padding: "2px 8px", borderRadius: 20, fontSize: "0.7rem", background: "#f1f5f9", color: "#94a3b8" }}>+{s.areasEvaluadas.length - 3}</span>
                        )}
                      </div>
                    )}
                    <Link
                      href={`/school-admin/asignaciones?simulacroId=${s.id}`}
                      style={{ display: "block", textAlign: "center", padding: "8px 0", background: "#7c3aed", color: "#fff", borderRadius: 8, textDecoration: "none", fontWeight: 700, fontSize: "0.82rem" }}
                    >
                      Asignar a estudiantes
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </main>
    </div>
  );
}
