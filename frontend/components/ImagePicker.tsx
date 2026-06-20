"use client";

import { useState, useRef } from "react";
import { api } from "@/lib/api";

interface Props {
  value: string;
  onChange: (url: string) => void;
  compact?: boolean;
}

export default function ImagePicker({ value, onChange, compact = false }: Props) {
  const [mode, setMode] = useState<"url" | "upload">("url");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadError("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await api.upload<{ url: string }>("/uploads/question-image", fd);
      onChange(res.url);
    } catch (err: any) {
      setUploadError(err.message ?? "Error al subir la imagen");
    }
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
  }

  return (
    <div>
      {/* Mode toggle */}
      <div style={{ display: "flex", marginBottom: 8, border: "1px solid #e2eaf7", borderRadius: 8, overflow: "hidden", width: "fit-content" }}>
        {(["url", "upload"] as const).map(m => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            style={{
              padding: "5px 16px",
              background: mode === m ? "#004aad" : "#fff",
              color: mode === m ? "#fff" : "#64748b",
              border: "none",
              fontSize: "0.75rem",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {m === "url" ? "URL" : "Adjuntar"}
          </button>
        ))}
      </div>

      {/* URL input */}
      {mode === "url" && (
        <input
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder="https://…"
          style={inputStyle}
        />
      )}

      {/* File upload */}
      {mode === "upload" && (
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            onChange={handleFile}
            style={{ display: "none" }}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            style={{
              padding: "8px 16px",
              background: uploading ? "#f1f5f9" : "#eff6ff",
              color: uploading ? "#94a3b8" : "#004aad",
              border: "1px solid #bfdbfe",
              borderRadius: 8,
              fontSize: "0.82rem",
              fontWeight: 600,
              cursor: uploading ? "not-allowed" : "pointer",
            }}
          >
            {uploading ? "Subiendo…" : "Seleccionar imagen"}
          </button>
          {value && (
            <button
              type="button"
              onClick={() => onChange("")}
              style={{ background: "none", border: "none", color: "#dc2626", fontSize: "0.8rem", fontWeight: 600, cursor: "pointer" }}
            >
              ✕ Quitar
            </button>
          )}
        </div>
      )}

      {/* Error */}
      {uploadError && (
        <div style={{ fontSize: "0.75rem", color: "#dc2626", marginTop: 4 }}>{uploadError}</div>
      )}

      {/* Thumbnail preview */}
      {value && (
        <div style={{ marginTop: 8, position: "relative", display: "inline-block" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={value}
            alt="Vista previa"
            style={{
              maxHeight: compact ? 56 : 110,
              maxWidth: "100%",
              borderRadius: 6,
              border: "1px solid #e2eaf7",
              display: "block",
            }}
            onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
            onLoad={e => { (e.target as HTMLImageElement).style.display = "block"; }}
          />
          <button
            type="button"
            onClick={() => onChange("")}
            title="Quitar imagen"
            style={{
              position: "absolute", top: 3, right: 3,
              background: "rgba(0,0,0,0.55)", color: "#fff",
              border: "none", borderRadius: "50%",
              width: 18, height: 18, fontSize: "0.65rem",
              cursor: "pointer", lineHeight: "18px", textAlign: "center", padding: 0,
            }}
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "9px 12px",
  border: "1px solid #e2eaf7",
  borderRadius: 8,
  fontSize: "0.875rem",
  outline: "none",
  boxSizing: "border-box",
  background: "#fff",
};
