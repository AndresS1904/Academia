"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";

interface Template {
  id: string;
  name: string;
  examType: string;
  sessions: {
    type: string;
    label: string;
    durationMinutes: number;
    sections: { area: string; rules: { count: number }[] }[];
  }[];
}

interface PreviewResult {
  preview: true;
  titulo: string;
  examType: string;
  totalPreguntas: number;
  duracionMinutos: number;
  areasEvaluadas: string[];
  sessions: {
    type: string;
    label: string;
    sections: {
      area: string;
      questions: { questionId: string }[];
    }[];
  }[];
}

interface School {
  id: string;
  name: string;
}

export default function GenerarSimulacroPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();

  const [template, setTemplate] = useState<Template | null>(null);
  const [schools, setSchools] = useState<School[]>([]);
  const [titulo, setTitulo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [isGlobal, setIsGlobal] = useState(false);
  const [schoolId, setSchoolId] = useState("");
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const isSuperAdmin = user?.role === "SUPER_ADMIN";

  useEffect(() => {
    if (!user) return;
    api.get<Template>(`/simulacro-templates/${id}`).then(t => {
      setTemplate(t);
      setTitulo(`${t.name} — ${new Date().getFullYear()}`);
    });
    if (isSuperAdmin) {
      api.get<{ schools: School[] }>("/schools").then(r => setSchools(r.schools ?? [])).catch(() => {});
    }
  }, [user, id]);

  const totalExpected = template?.sessions
    .flatMap(s => s.sections)
    .flatMap(sec => sec.rules)
    .reduce((acc, r) => acc + r.count, 0) ?? 0;

  async function handlePreview() {
    if (!titulo.trim()) return setError("El título es requerido");
    setLoading(true);
    setError(null);
    setPreview(null);
    try {
      const result = await api.post<PreviewResult>("/simulacro-templates/generate", {
        templateId: id,
        titulo: titulo.trim(),
        isGlobal,
        schoolId: schoolId || undefined,
        preview: true,
      });
      setPreview(result);
    } catch (e: any) {
      setError(e.message ?? "Error generando preview");
    } finally {
      setLoading(false);
    }
  }

  async function handleGenerate() {
    if (!titulo.trim()) return setError("El título es requerido");
    if (!confirm(`¿Crear el simulacro "${titulo}" con ${totalExpected} preguntas?`)) return;
    setGenerating(true);
    setError(null);
    try {
      const result = await api.post<{ id: string }>("/simulacro-templates/generate", {
        templateId: id,
        titulo: titulo.trim(),
        descripcion: descripcion.trim() || undefined,
        isGlobal,
        schoolId: schoolId || undefined,
        preview: false,
      });
      setSuccess(`Simulacro creado con ID: ${result.id}`);
      setTimeout(() => router.push(`/admin/simulacros/${result.id}`), 1500);
    } catch (e: any) {
      setError(e.message ?? "Error al generar el simulacro");
    } finally {
      setGenerating(false);
    }
  }

  const INPUT = { padding: "9px 12px", borderRadius: 8, border: "1px solid #334155", background: "#0f172a", color: "#f1f5f9", fontSize: "0.875rem", width: "100%", boxSizing: "border-box" as const, outline: "none" };
  const LABEL = { fontSize: "0.75rem", fontWeight: 700, color: "#94a3b8", display: "block", marginBottom: 4 } as const;

  if (!template) return (
    <div style={{ minHeight: "100vh", background: "#0f172a", display: "flex", alignItems: "center", justifyContent: "center", color: "#64748b" }}>
      Cargando plantilla…
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "#0f172a", color: "#f1f5f9" }}>
      <div style={{ maxWidth: 800, margin: "0 auto", padding: "40px 24px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 32 }}>
          <Link href="/admin/plantillas" style={{ padding: "8px 12px", background: "#1e293b", color: "#94a3b8", border: "1px solid #334155", borderRadius: 8, textDecoration: "none", fontSize: "0.875rem" }}>← Plantillas</Link>
          <div>
            <h1 style={{ fontSize: "1.4rem", fontWeight: 800, margin: 0 }}>⚡ Generar Simulacro</h1>
            <p style={{ color: "#64748b", fontSize: "0.85rem", margin: "4px 0 0" }}>Plantilla: <strong style={{ color: "#e2e8f0" }}>{template.name}</strong></p>
          </div>
        </div>

        {/* Template summary */}
        <div style={{ background: "#1e293b", borderRadius: 12, border: "1px solid #334155", padding: 20, marginBottom: 24 }}>
          <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "#64748b", marginBottom: 12, textTransform: "uppercase" }}>Resumen de la plantilla</div>
          <div style={{ display: "flex", gap: 20, flexWrap: "wrap", marginBottom: 12 }}>
            <div style={{ background: "#0f172a", borderRadius: 8, padding: "8px 14px" }}>
              <span style={{ fontSize: "1.2rem", fontWeight: 800, color: "#3b82f6" }}>{totalExpected}</span>
              <span style={{ fontSize: "0.8rem", color: "#64748b", marginLeft: 6 }}>preguntas</span>
            </div>
            <div style={{ background: "#0f172a", borderRadius: 8, padding: "8px 14px" }}>
              <span style={{ fontSize: "1.2rem", fontWeight: 800, color: "#10b981" }}>{template.sessions.length}</span>
              <span style={{ fontSize: "0.8rem", color: "#64748b", marginLeft: 6 }}>sesiones</span>
            </div>
            <div style={{ background: "#0f172a", borderRadius: 8, padding: "8px 14px" }}>
              <span style={{ fontSize: "1rem", fontWeight: 700, color: "#f59e0b" }}>{template.examType}</span>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {template.sessions.map((sess, i) => (
              <div key={i} style={{ background: "#0f172a", borderRadius: 8, padding: "8px 14px", fontSize: "0.8rem" }}>
                <span style={{ color: sess.type === "MANANA" ? "#fcd34d" : "#93c5fd", fontWeight: 700 }}>{sess.label}</span>
                <span style={{ color: "#475569", marginLeft: 8 }}>
                  {sess.sections.map(s => s.area).join(", ")}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Options form */}
        <div style={{ background: "#1e293b", borderRadius: 16, border: "1px solid #334155", padding: 24, marginBottom: 24 }}>
          <h2 style={{ fontSize: "1rem", fontWeight: 700, margin: "0 0 20px", color: "#e2e8f0" }}>Opciones del simulacro</h2>

          <div style={{ marginBottom: 16 }}>
            <label style={LABEL}>Título del simulacro *</label>
            <input style={INPUT} value={titulo} onChange={e => setTitulo(e.target.value)} placeholder="Ej: Simulacro ICFES #1 2025" />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={LABEL}>Descripción (opcional)</label>
            <textarea style={{ ...INPUT, minHeight: 60, resize: "vertical" }} value={descripcion} onChange={e => setDescripcion(e.target.value)} />
          </div>

          {isSuperAdmin && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
              <div>
                <label style={LABEL}>Asignar a colegio</label>
                <select style={INPUT} value={schoolId} onChange={e => setSchoolId(e.target.value)}>
                  <option value="">— Sin colegio (según tu rol) —</option>
                  {schools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, paddingTop: 20 }}>
                <input type="checkbox" id="isGlobal" checked={isGlobal} onChange={e => setIsGlobal(e.target.checked)} />
                <label htmlFor="isGlobal" style={{ fontSize: "0.875rem", color: "#94a3b8", cursor: "pointer" }}>
                  Simulacro global (visible para todos los colegios)
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Preview result */}
        {preview && (
          <div style={{ background: "#0d2137", borderRadius: 16, border: "1px solid #1d4ed8", padding: 24, marginBottom: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 style={{ fontSize: "1rem", fontWeight: 700, margin: 0, color: "#93c5fd" }}>Vista previa de la generación</h3>
              <span style={{ padding: "4px 10px", background: "#1e3a5f", color: "#60a5fa", borderRadius: 6, fontSize: "0.75rem", fontWeight: 700 }}>
                {preview.totalPreguntas} preguntas seleccionadas
              </span>
            </div>
            {preview.sessions.map((sess, i) => (
              <div key={i} style={{ marginBottom: 12 }}>
                <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "#60a5fa", marginBottom: 8 }}>
                  {sess.label}
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {sess.sections.map((sec, j) => (
                    <div key={j} style={{ background: "#1e293b", borderRadius: 8, padding: "8px 14px", fontSize: "0.8rem" }}>
                      <span style={{ color: "#e2e8f0", fontWeight: 600 }}>{sec.area}</span>
                      <span style={{ color: "#3b82f6", marginLeft: 8, fontWeight: 700 }}>{sec.questions.length} Qs</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            {preview.totalPreguntas < totalExpected && (
              <div style={{ padding: "10px 14px", background: "#451a03", color: "#fdba74", borderRadius: 8, fontSize: "0.8rem", marginTop: 12 }}>
                Advertencia: Solo se encontraron {preview.totalPreguntas} de {totalExpected} preguntas esperadas. Considera agregar más preguntas al banco o relajar los filtros de las reglas.
              </div>
            )}
          </div>
        )}

        {error && (
          <div style={{ padding: "12px 16px", background: "#450a0a", color: "#fca5a5", borderRadius: 10, marginBottom: 16, fontSize: "0.875rem" }}>
            {error}
          </div>
        )}

        {success && (
          <div style={{ padding: "12px 16px", background: "#052e16", color: "#86efac", borderRadius: 10, marginBottom: 16, fontSize: "0.875rem" }}>
            ✓ {success}
          </div>
        )}

        <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
          <button
            type="button"
            onClick={handlePreview}
            disabled={loading}
            style={{ padding: "12px 24px", background: "#1e293b", color: "#93c5fd", border: "1px solid #1d4ed8", borderRadius: 10, cursor: "pointer", fontWeight: 600, opacity: loading ? 0.6 : 1 }}
          >
            {loading ? "Calculando…" : "🔍 Ver preview"}
          </button>
          <button
            type="button"
            onClick={handleGenerate}
            disabled={generating}
            style={{ padding: "12px 28px", background: "#1d4ed8", color: "#fff", border: "none", borderRadius: 10, cursor: "pointer", fontWeight: 700, fontSize: "1rem", opacity: generating ? 0.6 : 1 }}
          >
            {generating ? "Generando…" : "⚡ Generar simulacro"}
          </button>
        </div>
      </div>
    </div>
  );
}
