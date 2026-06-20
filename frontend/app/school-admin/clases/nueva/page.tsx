"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import SchoolAdminSidebar from "@/components/school-admin/SchoolAdminSidebar";
import { api } from "@/lib/api";

const COLORS = ["#004aad","#d95e00","#059669","#7c3aed","#0891b2","#be123c","#b45309","#1d4ed8"];
const EMOJIS = ["🏫","📚","🧮","🔬","🌍","📝","🎨","🎵","💻","⚗️","📐","🧬","🏛️","🌱"];

export default function NuevaClasePage() {
  const { user } = useAuth();
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState(COLORS[0]);
  const [emoji, setEmoji] = useState(EMOJIS[0]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) { setError("El título es obligatorio"); return; }
    setSaving(true);
    setError("");
    try {
      const result = await api.post<{ id: string }>("/classrooms/admin", {
        title: title.trim(),
        description: description.trim() || undefined,
        color,
        emoji,
      });
      router.push(`/school-admin/clases/${result.id}`);
    } catch (e: any) {
      setError(e?.message ?? "Error al crear el aula. Intenta de nuevo.");
      setSaving(false);
    }
  }

  return (
    <div className="admin-layout">
      <SchoolAdminSidebar />
      <main className="admin-main">
        <div className="admin-content" style={{ maxWidth: 640 }}>

          <div style={{ marginBottom: 28 }}>
            <Link href="/school-admin/clases" style={{ color: "#64748b", textDecoration: "none", fontSize: "0.875rem" }}>
              ← Aulas virtuales
            </Link>
            <h1 style={{ fontFamily: "var(--font-poppins)", fontWeight: 800, fontSize: "1.5rem", color: "#1e293b", margin: "8px 0 4px" }}>
              Nueva aula virtual
            </h1>
            <p style={{ color: "#64748b", fontSize: "0.9rem" }}>
              Configura tu aula y luego agrega módulos, materiales y actividades.
            </p>
          </div>

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 20 }}>

            {/* Preview */}
            <div style={{
              padding: "20px 24px", borderRadius: 16, border: "2px solid #e2e8f0",
              background: "#fff", display: "flex", alignItems: "center", gap: 16,
            }}>
              <div style={{
                width: 56, height: 56, borderRadius: 14,
                background: `${color}18`, display: "flex", alignItems: "center",
                justifyContent: "center", fontSize: "1.8rem", border: `2px solid ${color}30`,
              }}>
                {emoji}
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: "1rem", color: "#1e293b" }}>
                  {title || "Nombre del aula"}
                </div>
                <div style={{ fontSize: "0.82rem", color: "#94a3b8", marginTop: 2 }}>
                  {description || "Descripción del aula…"}
                </div>
              </div>
              <div style={{ marginLeft: "auto", width: 40, height: 6, borderRadius: 3, background: color }} />
            </div>

            {/* Título */}
            <div>
              <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, color: "#374151", marginBottom: 6 }}>
                Título del aula *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ej: Matemáticas ICFES — Grupo A"
                maxLength={120}
                style={{
                  width: "100%", padding: "12px 14px", borderRadius: 10,
                  border: "1.5px solid #e2e8f0", fontSize: "0.95rem", color: "#1e293b",
                  outline: "none", boxSizing: "border-box",
                }}
              />
            </div>

            {/* Descripción */}
            <div>
              <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, color: "#374151", marginBottom: 6 }}>
                Descripción
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Breve descripción del aula…"
                rows={3}
                style={{
                  width: "100%", padding: "12px 14px", borderRadius: 10,
                  border: "1.5px solid #e2e8f0", fontSize: "0.9rem", color: "#1e293b",
                  outline: "none", resize: "vertical", boxSizing: "border-box",
                }}
              />
            </div>

            {/* Color */}
            <div>
              <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, color: "#374151", marginBottom: 8 }}>
                Color de acento
              </label>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                {COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    style={{
                      width: 32, height: 32, borderRadius: "50%", background: c,
                      border: color === c ? `3px solid ${c}` : "3px solid transparent",
                      outline: color === c ? "2px solid #1e293b" : "none",
                      cursor: "pointer",
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Emoji */}
            <div>
              <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, color: "#374151", marginBottom: 8 }}>
                Ícono
              </label>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {EMOJIS.map((em) => (
                  <button
                    key={em}
                    type="button"
                    onClick={() => setEmoji(em)}
                    style={{
                      width: 40, height: 40, borderRadius: 10, fontSize: "1.3rem",
                      background: emoji === em ? "#f0f4ff" : "#f8fafc",
                      border: emoji === em ? "2px solid #004aad" : "2px solid transparent",
                      cursor: "pointer",
                    }}
                  >
                    {em}
                  </button>
                ))}
              </div>
            </div>

            {error && (
              <div style={{ background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 10, padding: "10px 14px", color: "#991b1b", fontSize: "0.875rem" }}>
                {error}
              </div>
            )}

            <div style={{ display: "flex", gap: 12 }}>
              <button
                type="submit"
                disabled={saving}
                style={{
                  flex: 1, padding: "13px 0", background: saving ? "#94a3b8" : "#004aad",
                  color: "#fff", borderRadius: 10, border: "none", cursor: saving ? "not-allowed" : "pointer",
                  fontWeight: 800, fontSize: "0.95rem", fontFamily: "var(--font-poppins)",
                }}
              >
                {saving ? "Creando…" : "Crear aula"}
              </button>
              <Link href="/school-admin/clases" style={{
                padding: "13px 20px", background: "#f1f5f9", color: "#475569",
                borderRadius: 10, textDecoration: "none", fontWeight: 700, fontSize: "0.9rem",
                display: "flex", alignItems: "center",
              }}>
                Cancelar
              </Link>
            </div>

          </form>
        </div>
      </main>
    </div>
  );
}
