"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import SchoolAdminSidebar from "@/components/school-admin/SchoolAdminSidebar";
import { api } from "@/lib/api";

interface QuestionRow {
  id: string;
  enunciado: string;
  area: string;
  examType: string;
  difficulty: string;
  isActive: boolean;
  isGlobal: boolean;
  createdAt: string;
  _count: { simulacroQuestions: number };
}

interface QuestionsResponse {
  total: number;
  questions: QuestionRow[];
}

interface QuestionsStats {
  total: number;
  active: number;
  inactive: number;
  byArea: Record<string, number>;
  byDifficulty: Record<string, number>;
  byExamType: Record<string, number>;
}

const DIFFICULTY_LABELS: Record<string, string> = { FACIL: "Fácil", MEDIA: "Media", DIFICIL: "Difícil" };
const DIFFICULTY_COLORS: Record<string, { bg: string; color: string }> = {
  FACIL: { bg: "#dcfce7", color: "#16a34a" },
  MEDIA: { bg: "#fef9c3", color: "#a16207" },
  DIFICIL: { bg: "#fee2e2", color: "#dc2626" },
};

export default function SchoolAdminPreguntasPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [questions, setQuestions] = useState<QuestionRow[]>([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState<QuestionsStats | null>(null);
  const [fetching, setFetching] = useState(true);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [area, setArea] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [isActive, setIsActive] = useState("");
  const [allAreas, setAllAreas] = useState<string[]>([]);

  useEffect(() => {
    if (!loading && !user) router.replace("/auth/login");
    if (!loading && user && user.role !== "ADMIN") router.replace("/dashboard");
  }, [user, loading]);

  const fetchStats = useCallback(() => {
    api.get<QuestionsStats>("/questions/stats").then(setStats).catch(() => {});
  }, []);

  const fetchQuestions = useCallback(() => {
    if (!user) return;
    setFetching(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (area) params.set("area", area);
    if (difficulty) params.set("difficulty", difficulty);
    if (isActive !== "") params.set("isActive", isActive);
    const qs = params.toString();
    api.get<QuestionsResponse>(`/questions${qs ? "?" + qs : ""}`)
      .then(data => {
        setQuestions(data.questions);
        setTotal(data.total);
        const areas = Array.from(new Set(data.questions.map(q => q.area).filter(Boolean))).sort();
        setAllAreas(areas);
      })
      .catch(() => {})
      .finally(() => setFetching(false));
  }, [user, search, area, difficulty, isActive]);

  useEffect(() => {
    if (!user || user.role !== "ADMIN") return;
    fetchQuestions();
    fetchStats();
  }, [user, fetchQuestions, fetchStats]);

  async function handleToggleActive(q: QuestionRow) {
    if (q.isGlobal) return;
    setTogglingId(q.id);
    try {
      await api.patch(`/questions/${q.id}/toggle-active`, {});
      setQuestions(prev => prev.map(item => item.id === q.id ? { ...item, isActive: !item.isActive } : item));
      fetchStats();
    } catch (e: any) {
      alert("Error: " + (e.message ?? ""));
    }
    setTogglingId(null);
  }

  async function handleDelete(q: QuestionRow) {
    if (q.isGlobal) { alert("No puedes eliminar preguntas globales."); return; }
    if (!confirm(`¿Eliminar la pregunta?\n\n"${q.enunciado.slice(0, 80)}..."`)) return;
    setDeletingId(q.id);
    try {
      await api.delete(`/questions/${q.id}`);
      setQuestions(prev => prev.filter(item => item.id !== q.id));
      setTotal(prev => prev - 1);
      fetchStats();
    } catch (e: any) {
      alert("Error: " + (e.message ?? ""));
    }
    setDeletingId(null);
  }

  if (loading || !user) return null;

  const propias = questions.filter(q => !q.isGlobal).length;
  const globales = questions.filter(q => q.isGlobal).length;

  return (
    <div className="admin-layout">
      <SchoolAdminSidebar />
      <main className="admin-main">
        <div className="admin-content">

          {/* Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
            <div>
              <h1 style={{ fontSize: "1.5rem", fontWeight: 800, color: "#1e293b", margin: 0 }}>Banco de preguntas</h1>
              <p style={{ color: "#64748b", fontSize: "0.875rem", margin: "4px 0 0" }}>
                {propias} propias · {globales} globales (solo lectura)
              </p>
            </div>
            <Link
              href="/school-admin/preguntas/nueva"
              style={{ padding: "10px 20px", background: "#004aad", color: "#fff", borderRadius: 12, textDecoration: "none", fontWeight: 700, fontSize: "0.9rem" }}
            >
              + Nueva pregunta
            </Link>
          </div>

          {/* Stats */}
          {stats && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 14, marginBottom: 24 }}>
              {[
                { label: "Total visibles", value: stats.total, color: "#004aad", bg: "#eff6ff" },
                { label: "Activas", value: stats.active, color: "#16a34a", bg: "#f0fdf4" },
                { label: "Inactivas", value: stats.inactive, color: "#64748b", bg: "#f8fafc" },
                { label: "Propias", value: propias, color: "#7c3aed", bg: "#f5f3ff" },
                { label: "Globales", value: globales, color: "#0891b2", bg: "#ecfeff" },
              ].map(s => (
                <div key={s.label} style={{ background: s.bg, borderRadius: 12, padding: "14px 18px" }}>
                  <div style={{ fontSize: "1.6rem", fontWeight: 800, color: s.color }}>{s.value}</div>
                  <div style={{ fontSize: "0.78rem", color: "#64748b", fontWeight: 600, marginTop: 2 }}>{s.label}</div>
                </div>
              ))}
            </div>
          )}

          {/* Filters */}
          <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #e2eaf7", padding: "16px 20px", marginBottom: 20, display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
            <div style={{ flex: "1 1 200px" }}>
              <label style={labelStyle}>Buscar</label>
              <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Enunciado…"
                style={inputStyle}
              />
            </div>
            <div style={{ flex: "0 1 180px" }}>
              <label style={labelStyle}>Área</label>
              <select value={area} onChange={e => setArea(e.target.value)} style={inputStyle}>
                <option value="">Todas</option>
                {allAreas.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
            <div style={{ flex: "0 1 150px" }}>
              <label style={labelStyle}>Dificultad</label>
              <select value={difficulty} onChange={e => setDifficulty(e.target.value)} style={inputStyle}>
                <option value="">Todas</option>
                <option value="FACIL">Fácil</option>
                <option value="MEDIA">Media</option>
                <option value="DIFICIL">Difícil</option>
              </select>
            </div>
            <div style={{ flex: "0 1 140px" }}>
              <label style={labelStyle}>Estado</label>
              <select value={isActive} onChange={e => setIsActive(e.target.value)} style={inputStyle}>
                <option value="">Todos</option>
                <option value="true">Activa</option>
                <option value="false">Inactiva</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e2eaf7", overflow: "hidden" }}>
            {fetching ? (
              <div style={{ padding: "56px 24px", textAlign: "center", color: "#64748b" }}>⏳ Cargando preguntas…</div>
            ) : questions.length === 0 ? (
              <div style={{ padding: "56px 24px", textAlign: "center", color: "#94a3b8" }}>
                No hay preguntas.{" "}
                <Link href="/school-admin/preguntas/nueva" style={{ color: "#004aad", fontWeight: 600 }}>
                  Crea la primera
                </Link>
              </div>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "#f8faff", borderBottom: "1px solid #e2eaf7" }}>
                    {["Enunciado", "Área", "Dificultad", "Origen", "Estado", "Acciones"].map(h => (
                      <th key={h} style={{ padding: "13px 16px", textAlign: "left", fontSize: "0.78rem", fontWeight: 700, color: "#475569", whiteSpace: "nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {questions.map((q, idx) => {
                    const diffStyle = DIFFICULTY_COLORS[q.difficulty] ?? { bg: "#f1f5f9", color: "#64748b" };
                    return (
                      <tr key={q.id}
                        style={{ borderBottom: idx < questions.length - 1 ? "1px solid #f1f5f9" : "none" }}
                        onMouseEnter={e => (e.currentTarget.style.background = "#f8faff")}
                        onMouseLeave={e => (e.currentTarget.style.background = "")}
                      >
                        <td style={{ padding: "13px 16px", maxWidth: 300 }}>
                          <div style={{ fontWeight: 500, color: "#1e293b", fontSize: "0.875rem", lineHeight: 1.4 }}>
                            {q.enunciado.length > 80 ? q.enunciado.slice(0, 80) + "…" : q.enunciado}
                          </div>
                        </td>
                        <td style={{ padding: "13px 16px", fontSize: "0.82rem", color: "#475569", whiteSpace: "nowrap" }}>
                          {q.area || <span style={{ color: "#cbd5e1" }}>—</span>}
                        </td>
                        <td style={{ padding: "13px 16px" }}>
                          <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: "0.74rem", fontWeight: 600, background: diffStyle.bg, color: diffStyle.color }}>
                            {DIFFICULTY_LABELS[q.difficulty] ?? q.difficulty}
                          </span>
                        </td>
                        <td style={{ padding: "13px 16px" }}>
                          <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: "0.74rem", fontWeight: 600, background: q.isGlobal ? "#ecfeff" : "#f5f3ff", color: q.isGlobal ? "#0891b2" : "#7c3aed" }}>
                            {q.isGlobal ? "Global" : "Propia"}
                          </span>
                        </td>
                        <td style={{ padding: "13px 16px" }}>
                          <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: "0.74rem", fontWeight: 600, background: q.isActive ? "#dcfce7" : "#f1f5f9", color: q.isActive ? "#16a34a" : "#64748b" }}>
                            {q.isActive ? "● Activa" : "○ Inactiva"}
                          </span>
                        </td>
                        <td style={{ padding: "13px 16px" }}>
                          {q.isGlobal ? (
                            <span style={{ fontSize: "0.75rem", color: "#94a3b8", fontStyle: "italic" }}>Solo lectura</span>
                          ) : (
                            <div style={{ display: "flex", gap: 6 }}>
                              <Link href={`/school-admin/preguntas/${q.id}`}
                                style={{ padding: "5px 12px", background: "#eff6ff", color: "#004aad", border: "1px solid #bfdbfe", borderRadius: 8, fontSize: "0.78rem", fontWeight: 600, textDecoration: "none" }}>
                                Editar
                              </Link>
                              <button onClick={() => handleToggleActive(q)} disabled={togglingId === q.id}
                                style={{ padding: "5px 12px", background: q.isActive ? "#fff7ed" : "#f0fdf4", color: q.isActive ? "#c2410c" : "#16a34a", border: `1px solid ${q.isActive ? "#fed7aa" : "#bbf7d0"}`, borderRadius: 8, fontSize: "0.78rem", fontWeight: 600, cursor: "pointer" }}>
                                {togglingId === q.id ? "…" : q.isActive ? "Desactivar" : "Activar"}
                              </button>
                              <button onClick={() => handleDelete(q)} disabled={deletingId === q.id}
                                style={{ padding: "5px 12px", background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca", borderRadius: 8, fontSize: "0.78rem", fontWeight: 600, cursor: "pointer" }}>
                                {deletingId === q.id ? "…" : "Eliminar"}
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          <div style={{ marginTop: 16, padding: "12px 16px", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 10, fontSize: "0.82rem", color: "#92400e" }}>
            💡 Las preguntas <strong>propias</strong> las creas tú y puedes editarlas. Las <strong>globales</strong> son del sistema y están disponibles para todos los colegios (solo lectura).
          </div>

        </div>
      </main>
    </div>
  );
}

const labelStyle: React.CSSProperties = { display: "block", fontSize: "0.75rem", fontWeight: 600, color: "#475569", marginBottom: 4 };
const inputStyle: React.CSSProperties = { width: "100%", padding: "8px 12px", border: "1px solid #e2eaf7", borderRadius: 8, fontSize: "0.875rem", background: "#fff", outline: "none", boxSizing: "border-box" };
