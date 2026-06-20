"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { api, mediaUrl } from "@/lib/api";
import { Trash2, Upload, Video, Plus, ImagePlus } from "lucide-react";

export type ResourceType = "VIDEO_YOUTUBE" | "VIDEO_VIMEO" | "VIDEO_FILE" | "LINK" | "PDF" | "FILE";

export interface SubSection {
  id?: string;
  title: string;
  type: ResourceType;
  url: string;
  _count?: { materials: number; activities: number; quizzes: number; forums: number };
}

export interface Section {
  id?: string;
  title: string;
  subsections: SubSection[];
}

interface CourseBasic {
  title: string;
  instructorName: string;
  duration: string;
  thumbnail: string;
  description: string;
  isPublished: boolean;
}

interface CourseFormProps {
  courseId?: string;
  initialCourse?: Partial<CourseBasic>;
  initialSections?: Section[];
  basePath?: string;
  onSuccess: (newCourseId?: string) => void;
}

const TYPE_LABELS: Record<ResourceType, string> = {
  VIDEO_YOUTUBE: "Video YouTube",
  VIDEO_VIMEO: "Video Vimeo",
  VIDEO_FILE: "Video (archivo)",
  LINK: "Enlace web",
  PDF: "PDF",
  FILE: "Archivo",
};

const ALL_TYPES = Object.keys(TYPE_LABELS) as ResourceType[];

function mkSub(): SubSection {
  return { title: "", type: "VIDEO_YOUTUBE", url: "" };
}
function mkSection(): Section {
  return { title: "", subsections: [mkSub()] };
}

const input: React.CSSProperties = {
  width: "100%",
  padding: "10px 14px",
  border: "1px solid #dde4f0",
  borderRadius: 10,
  fontSize: "0.875rem",
  color: "#1e293b",
  outline: "none",
  background: "#fff",
  boxSizing: "border-box",
};
const lbl: React.CSSProperties = {
  fontSize: "0.78rem",
  fontWeight: 600,
  color: "#475569",
  marginBottom: 4,
  display: "block",
};

/* ── SubSection row (has its own useRef) ── */
interface SubItemProps {
  subIdx: number;
  sub: SubSection;
  courseId?: string;
  basePath?: string;
  onRemove: () => void;
  onChange: (field: keyof SubSection, value: string) => void;
  onFileUpload: (file: File) => void;
  onVideoUpload: (file: File) => void;
}

function SubSectionItem({ subIdx, sub, courseId, basePath = "/school-admin/cursos", onRemove, onChange, onFileUpload, onVideoUpload }: SubItemProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const isFile = sub.type === "PDF" || sub.type === "FILE";
  const isVideo = sub.type === "VIDEO_FILE";
  const isUrl = sub.type === "VIDEO_YOUTUBE" || sub.type === "VIDEO_VIMEO" || sub.type === "LINK";

  async function handleVideoSelect(file: File) {
    setUploading(true);
    setProgress(0);
    const interval = setInterval(() => {
      setProgress(prev => (prev < 85 ? prev + 4 : prev));
    }, 500);
    try {
      await onVideoUpload(file);
      setProgress(100);
    } finally {
      clearInterval(interval);
      setTimeout(() => { setUploading(false); setProgress(0); }, 1200);
    }
  }

  const baseUrl = courseId && sub.id ? `${basePath}/${courseId}/recurso/${sub.id}` : null;

  return (
    <div style={{ background: "#f8faff", borderRadius: 12, border: "1px solid #e2eaf7", padding: "16px", marginBottom: 10 }}>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <span style={{ fontSize: "0.78rem", fontWeight: 600, color: "#64748b" }}>
          Subsección {subIdx + 1}
        </span>
        <button
          type="button"
          onClick={onRemove}
          title="Eliminar subsección"
          style={{ padding: "6px", background: "transparent", color: "#94a3b8", border: "none", cursor: "pointer", borderRadius: 6, display: "flex", alignItems: "center", transition: "color 0.15s" }}
          onMouseEnter={e => (e.currentTarget.style.color = "#ef4444")}
          onMouseLeave={e => (e.currentTarget.style.color = "#94a3b8")}
        >
          <Trash2 size={15} />
        </button>
      </div>

      {/* Campos básicos */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 175px", gap: 12, marginBottom: 12 }}>
        <div>
          <label style={lbl}>Título</label>
          <input
            style={input}
            value={sub.title}
            onChange={e => onChange("title", e.target.value)}
            placeholder="Ej: Introducción al álgebra"
          />
        </div>
        <div>
          <label style={lbl}>Tipo de contenido</label>
          <select
            style={{ ...input, cursor: "pointer" }}
            value={sub.type}
            onChange={e => onChange("type", e.target.value as ResourceType)}
          >
            {ALL_TYPES.map(t => (
              <option key={t} value={t}>{TYPE_LABELS[t]}</option>
            ))}
          </select>
        </div>
      </div>

      {/* URL: YouTube, Vimeo, Enlace */}
      {isUrl && (
        <div style={{ marginBottom: 12 }}>
          <label style={lbl}>URL</label>
          <input
            style={input}
            value={sub.url}
            onChange={e => onChange("url", e.target.value)}
            placeholder="https://..."
          />
        </div>
      )}

      {/* PDF / Archivo */}
      {isFile && (
        <div style={{ marginBottom: 12 }}>
          <label style={lbl}>URL del archivo</label>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              style={{ ...input, flex: 1 }}
              value={sub.url}
              onChange={e => onChange("url", e.target.value)}
              placeholder="https://... o sube el archivo"
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              style={{ padding: "0 14px", background: "#f1f5f9", border: "1px solid #dde4f0", borderRadius: 10, cursor: "pointer", fontSize: "0.8rem", whiteSpace: "nowrap", color: "#475569", display: "flex", alignItems: "center", gap: 5 }}
            >
              <Upload size={14} style={{ marginRight: 5 }} /> Subir
            </button>
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,.zip,.docx,.xlsx"
              style={{ display: "none" }}
              onChange={e => { if (e.target.files?.[0]) onFileUpload(e.target.files[0]); }}
            />
          </div>
        </div>
      )}

      {/* Video archivo */}
      {isVideo && (
        <div style={{ marginBottom: 12 }}>
          <label style={lbl}>Archivo de video</label>
          <div style={{ display: "flex", gap: 8, marginBottom: uploading ? 10 : 0 }}>
            <input
              style={{ ...input, flex: 1, color: sub.url ? "#1e293b" : "#94a3b8", background: "#f8faff" }}
              value={sub.url ? decodeURIComponent(sub.url.split("/").pop() ?? sub.url) : ""}
              readOnly
              placeholder="Selecciona un archivo de video..."
            />
            <button
              type="button"
              onClick={() => videoRef.current?.click()}
              disabled={uploading}
              style={{ padding: "0 16px", background: uploading ? "#e2eaf7" : "#004aad", color: uploading ? "#94a3b8" : "#fff", border: "none", borderRadius: 10, cursor: uploading ? "not-allowed" : "pointer", fontSize: "0.82rem", whiteSpace: "nowrap", fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}
            >
              {uploading ? "Subiendo..." : <><Video size={14} style={{ marginRight: 6 }} />Subir video</>}
            </button>
            <input
              ref={videoRef}
              type="file"
              accept="video/mp4,video/x-matroska,video/avi,video/quicktime,video/webm,video/x-ms-wmv,video/mpeg,.mp4,.mkv,.avi,.mov,.wmv,.webm,.mpeg,.mpg,.m4v,.ts,.ogv,.flv"
              style={{ display: "none" }}
              onChange={e => { if (e.target.files?.[0]) handleVideoSelect(e.target.files[0]); }}
            />
          </div>
          {uploading && (
            <div>
              <div style={{ background: "#e2eaf7", borderRadius: 999, height: 6, overflow: "hidden" }}>
                <div style={{ height: "100%", background: "#004aad", borderRadius: 999, width: `${progress}%`, transition: "width 0.5s ease" }} />
              </div>
              <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: 4 }}>{progress}% subido...</div>
            </div>
          )}
          {sub.url && !uploading && (
            <div style={{ marginTop: 8, fontSize: "0.78rem", color: "#16a34a", display: "flex", alignItems: "center", gap: 5 }}>
              <Video size={13} />
              <span>{decodeURIComponent(sub.url.split("/").pop() ?? "archivo subido")}</span>
            </div>
          )}
        </div>
      )}

      {/* ── Contenido académico (solo en modo edición) ── */}
      {courseId && (
        <div style={{ marginTop: 14, borderTop: "1px solid #e8eef8", paddingTop: 12 }}>
          <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "#475569", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Contenido académico
          </div>

          {baseUrl ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
              {[
                { href: `${baseUrl}?tab=materiales`, label: "📁 Materiales", count: sub._count?.materials,  color: "#eff6ff", border: "#bfdbfe", text: "#1d4ed8" },
                { href: `${baseUrl}?tab=pruebas`,    label: "🧪 Pruebas",    count: sub._count?.quizzes,    color: "#fdf4ff", border: "#e9d5ff", text: "#7c3aed" },
                { href: `${baseUrl}?tab=foros`,      label: "💬 Foros",      count: sub._count?.forums,     color: "#f0fdf4", border: "#bbf7d0", text: "#15803d" },
                { href: `${baseUrl}?tab=tareas`,     label: "📋 Tareas",     count: sub._count?.activities, color: "#fff7ed", border: "#fed7aa", text: "#c2410c" },
              ].map(item => (
                <Link
                  key={item.label}
                  href={item.href}
                  style={{ display: "block", padding: "10px 10px 8px", background: item.color, border: `1px solid ${item.border}`, borderRadius: 9, textDecoration: "none", transition: "opacity 0.15s" }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 2 }}>
                    <div style={{ fontSize: "0.82rem", fontWeight: 700, color: item.text }}>{item.label}</div>
                    {item.count != null && item.count > 0 && (
                      <span style={{ fontSize: "0.65rem", fontWeight: 800, background: item.text, color: "#fff", borderRadius: 999, padding: "1px 6px", lineHeight: 1.6 }}>{item.count}</span>
                    )}
                  </div>
                  <div style={{ fontSize: "0.65rem", color: item.text, opacity: 0.75 }}>{item.count ? `${item.count} elemento${item.count !== 1 ? "s" : ""}` : "Sin contenido"}</div>
                </Link>
              ))}
            </div>
          ) : (
            <div style={{ background: "#fefce8", border: "1px solid #fef08a", borderRadius: 8, padding: "9px 12px", fontSize: "0.78rem", color: "#854d0e", display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: "1rem" }}>💡</span>
              <span><strong>Guarda los cambios</strong> para habilitar el contenido académico en esta nueva subsección.</span>
            </div>
          )}
        </div>
      )}

    </div>
  );
}

/* ── Main Form ── */
export function CourseForm({ courseId, initialCourse, initialSections, basePath = "/school-admin/cursos", onSuccess }: CourseFormProps) {
  const [course, setCourse] = useState<CourseBasic>({
    title: initialCourse?.title ?? "",
    instructorName: initialCourse?.instructorName ?? "",
    duration: initialCourse?.duration ?? "",
    thumbnail: initialCourse?.thumbnail ?? "",
    description: initialCourse?.description ?? "",
    isPublished: initialCourse?.isPublished ?? false,
  });
  const [sections, setSections] = useState<Section[]>(
    initialSections && initialSections.length > 0 ? initialSections : [mkSection()]
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [thumbUploading, setThumbUploading] = useState(false);
  const thumbRef = useRef<HTMLInputElement>(null);

  const isEdit = !!courseId;

  function setField(field: keyof CourseBasic, value: string) {
    setCourse(prev => ({ ...prev, [field]: value }));
  }

  async function uploadThumb(file: File) {
    setThumbUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await api.upload<{ url: string }>("/uploads/course-thumbnail", fd);
      setField("thumbnail", res.url);
    } catch (e: any) {
      setError("Error al subir imagen: " + (e.message ?? ""));
    } finally {
      setThumbUploading(false);
    }
  }

  async function uploadResourceFile(sIdx: number, subIdx: number, file: File) {
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await api.upload<{ url: string }>("/uploads/file", fd);
      setSections(prev => prev.map((s, i) =>
        i === sIdx ? { ...s, subsections: s.subsections.map((sub, j) => j === subIdx ? { ...sub, url: res.url } : sub) } : s
      ));
    } catch (e: any) {
      setError("Error al subir archivo: " + (e.message ?? ""));
    }
  }

  async function uploadResourceVideo(sIdx: number, subIdx: number, file: File) {
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await api.upload<{ url: string }>("/uploads/video", fd);
      setSections(prev => prev.map((s, i) =>
        i === sIdx ? { ...s, subsections: s.subsections.map((sub, j) => j === subIdx ? { ...sub, url: res.url } : sub) } : s
      ));
    } catch (e: any) {
      setError("Error al subir video: " + (e.message ?? ""));
      throw e;
    }
  }

  function addSection() {
    setSections(prev => [...prev, mkSection()]);
  }

  function removeSection(sIdx: number) {
    setSections(prev => prev.filter((_, i) => i !== sIdx));
  }

  function setSectionTitle(sIdx: number, title: string) {
    setSections(prev => prev.map((s, i) => i === sIdx ? { ...s, title } : s));
  }

  function addSub(sIdx: number) {
    setSections(prev =>
      prev.map((s, i) => i === sIdx ? { ...s, subsections: [...s.subsections, mkSub()] } : s)
    );
  }

  function removeSub(sIdx: number, subIdx: number) {
    setSections(prev =>
      prev.map((s, i) =>
        i === sIdx ? { ...s, subsections: s.subsections.filter((_, j) => j !== subIdx) } : s
      )
    );
  }

  function setSubField(sIdx: number, subIdx: number, field: keyof SubSection, value: string) {
    setSections(prev =>
      prev.map((s, i) =>
        i === sIdx
          ? { ...s, subsections: s.subsections.map((sub, j) => j === subIdx ? { ...sub, [field]: value } : sub) }
          : s
      )
    );
  }

  async function handleSubmit(publish: boolean) {
    if (!course.title.trim()) { setError("El título del curso es requerido"); return; }
    setSaving(true);
    setError("");
    try {
      const payload = { ...course, isPublished: publish };

      if (!isEdit) {
        /* ── CREATE ── */
        const created = await api.post<{ id: string }>("/courses", payload);
        const cId = created.id;
        for (let i = 0; i < sections.length; i++) {
          const sec = sections[i];
          if (!sec.title.trim()) continue;
          const lesson = await api.post<{ id: string }>(`/courses/${cId}/lessons`, { title: sec.title, order: i });
          for (const sub of sec.subsections) {
            if (!sub.title.trim()) continue;
            await api.post(`/lessons/${lesson.id}/resources`, { title: sub.title, type: sub.type, url: sub.url });
          }
        }
        onSuccess(cId);
        return;
      } else {
        /* ── UPDATE ── */
        await api.patch(`/courses/${courseId}`, payload);

        const origSections = initialSections ?? [];
        const origIds = new Set(origSections.map(s => s.id).filter(Boolean));
        const currentIds = new Set(sections.filter(s => s.id).map(s => s.id));

        // Delete removed sections (cascade deletes their resources)
        for (const oid of origIds) {
          if (!currentIds.has(oid)) await api.delete(`/lessons/${oid}`);
        }

        for (let i = 0; i < sections.length; i++) {
          const sec = sections[i];
          if (!sec.title.trim()) continue;
          let lessonId: string;

          if (sec.id) {
            await api.patch(`/lessons/${sec.id}`, { title: sec.title, order: i });
            lessonId = sec.id;
          } else {
            const lesson = await api.post<{ id: string }>(`/courses/${courseId}/lessons`, { title: sec.title, order: i });
            lessonId = lesson.id;
          }

          const origSec = origSections.find(s => s.id === sec.id);
          const origSubIds = new Set((origSec?.subsections ?? []).map(s => s.id).filter(Boolean));
          const currentSubIds = new Set(sec.subsections.filter(s => s.id).map(s => s.id));

          // Delete removed resources
          for (const osid of origSubIds) {
            if (!currentSubIds.has(osid)) await api.delete(`/resources/${osid}`);
          }

          // Create / update resources
          for (const sub of sec.subsections) {
            if (!sub.title.trim()) continue;
            if (!sub.id) {
              await api.post(`/lessons/${lessonId}/resources`, { title: sub.title, type: sub.type, url: sub.url });
            } else {
              await api.patch(`/resources/${sub.id}`, { title: sub.title, type: sub.type, url: sub.url });
            }
          }
        }
      }

      onSuccess();
    } catch (e: any) {
      setError(e.message ?? "Error al guardar el curso");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      {error && (
        <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, padding: "12px 16px", color: "#dc2626", marginBottom: 20, fontSize: "0.875rem" }}>
          ⚠ {error}
        </div>
      )}

      {/* Información básica */}
      <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e2eaf7", padding: "24px", marginBottom: 20 }}>
        <div style={{ fontWeight: 700, fontSize: "1rem", color: "#1e293b", marginBottom: 20 }}>Información del curso</div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
          <div>
            <label style={lbl}>Título del curso *</label>
            <input style={input} value={course.title} onChange={e => setField("title", e.target.value)} placeholder="Ej: Pre-ICFES Matemáticas" />
          </div>
          <div>
            <label style={lbl}>Autor / Instructor</label>
            <input style={input} value={course.instructorName} onChange={e => setField("instructorName", e.target.value)} placeholder="Nombre del instructor" />
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
          <div>
            <label style={lbl}>Duración</label>
            <input style={input} value={course.duration} onChange={e => setField("duration", e.target.value)} placeholder="Ej: 40 horas, 8 semanas" />
          </div>
          <div>
            <label style={lbl}>Imagen del curso (URL)</label>
            <div style={{ display: "flex", gap: 8 }}>
              <input style={{ ...input, flex: 1 }} value={course.thumbnail} onChange={e => setField("thumbnail", e.target.value)} placeholder="https://..." />
              <button
                type="button"
                onClick={() => thumbRef.current?.click()}
                disabled={thumbUploading}
                style={{ padding: "0 14px", background: "#f1f5f9", border: "1px solid #dde4f0", borderRadius: 10, cursor: thumbUploading ? "not-allowed" : "pointer", fontSize: "0.8rem", whiteSpace: "nowrap", color: "#475569", display: "flex", alignItems: "center", gap: 5 }}
              >
                {thumbUploading ? "..." : <><ImagePlus size={14} style={{ marginRight: 5 }} />Subir</>}
              </button>
              <input ref={thumbRef} type="file" accept="image/*" style={{ display: "none" }} onChange={e => { if (e.target.files?.[0]) uploadThumb(e.target.files[0]); }} />
            </div>
            {course.thumbnail && (
              <img src={mediaUrl(course.thumbnail)!} alt="" style={{ marginTop: 8, height: 60, borderRadius: 8, objectFit: "cover" }} />
            )}
          </div>
        </div>

        <div>
          <label style={lbl}>Descripción del curso</label>
          <textarea
            style={{ ...input, minHeight: 100, resize: "vertical" }}
            value={course.description}
            onChange={e => setField("description", e.target.value)}
            placeholder="Describe el contenido y objetivos del curso..."
          />
        </div>
      </div>

      {/* Secciones */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div style={{ fontWeight: 700, fontSize: "1rem", color: "#1e293b" }}>Secciones del curso</div>
          <button
            type="button"
            onClick={addSection}
            style={{ padding: "8px 16px", background: "#004aad", color: "#fff", border: "none", borderRadius: 10, cursor: "pointer", fontSize: "0.85rem", fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}
          >
            <Plus size={16} /> Agregar sección
          </button>
        </div>

        {sections.length === 0 && (
          <div style={{ background: "#fff", borderRadius: 16, border: "1px dashed #dde4f0", padding: "32px", textAlign: "center", color: "#94a3b8", fontSize: "0.9rem" }}>
            No hay secciones. Haz clic en &quot;Agregar sección&quot; para comenzar.
          </div>
        )}

        {sections.map((sec, sIdx) => (
          <div key={sIdx} style={{ background: "#fff", borderRadius: 16, border: "1px solid #e2eaf7", padding: "20px", marginBottom: 12 }}>
            <div style={{ display: "flex", gap: 12, alignItems: "flex-end", marginBottom: 16 }}>
              <div style={{ flex: 1 }}>
                <label style={lbl}>Sección {sIdx + 1}</label>
                <input
                  style={input}
                  value={sec.title}
                  onChange={e => setSectionTitle(sIdx, e.target.value)}
                  placeholder="Nombre de la sección"
                />
              </div>
              <button
                type="button"
                onClick={() => removeSection(sIdx)}
                style={{ padding: "10px 14px", background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca", borderRadius: 10, cursor: "pointer", display: "flex", alignItems: "center" }}
              >
                <Trash2 size={16} />
              </button>
            </div>

            {/* Subsecciones */}
            <div style={{ paddingLeft: 16, borderLeft: "3px solid #e8eef8" }}>
              {sec.subsections.map((sub, subIdx) => (
                <SubSectionItem
                  key={subIdx}
                  subIdx={subIdx}
                  sub={sub}
                  courseId={courseId}
                  basePath={basePath}
                  onRemove={() => removeSub(sIdx, subIdx)}
                  onChange={(field, value) => setSubField(sIdx, subIdx, field, value)}
                  onFileUpload={(file) => uploadResourceFile(sIdx, subIdx, file)}
                  onVideoUpload={(file) => uploadResourceVideo(sIdx, subIdx, file)}
                />
              ))}
              <button
                type="button"
                onClick={() => addSub(sIdx)}
                style={{ padding: "8px 14px", background: "transparent", color: "#004aad", border: "1px dashed #004aad", borderRadius: 10, cursor: "pointer", fontSize: "0.82rem", fontWeight: 600, display: "flex", alignItems: "center", gap: 5 }}
              >
                <Plus size={14} /> Agregar subsección
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Aviso crear vs editar */}
      {!isEdit && (
        <div style={{ background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: 10, padding: "12px 16px", marginBottom: 20, fontSize: "0.82rem", color: "#0369a1", display: "flex", alignItems: "flex-start", gap: 10 }}>
          <span style={{ fontSize: "1.1rem", flexShrink: 0 }}>ℹ️</span>
          <span>Después de guardar el curso serás redirigido a la página de edición, donde podrás añadir <strong>materiales, pruebas, foros y tareas</strong> a cada subsección.</span>
        </div>
      )}

      {/* Botones */}
      <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
        <button
          type="button"
          disabled={saving}
          onClick={() => handleSubmit(false)}
          style={{ padding: "12px 24px", background: "#f1f5f9", color: "#475569", border: "1px solid #dde4f0", borderRadius: 12, cursor: saving ? "not-allowed" : "pointer", fontWeight: 600, fontSize: "0.9rem" }}
        >
          {saving ? "Guardando..." : "Guardar borrador"}
        </button>
        <button
          type="button"
          disabled={saving}
          onClick={() => handleSubmit(true)}
          style={{ padding: "12px 24px", background: "#004aad", color: "#fff", border: "none", borderRadius: 12, cursor: saving ? "not-allowed" : "pointer", fontWeight: 600, fontSize: "0.9rem" }}
        >
          {saving ? "Guardando..." : isEdit ? "Guardar cambios" : "Publicar curso"}
        </button>
      </div>
    </div>
  );
}
