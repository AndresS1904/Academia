"use client";

import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { api, mediaUrl } from "@/lib/api";
import { getVisitadas, marcarLeccionCompletada } from "@/lib/courseProgress";
import ResourceAcademicContent from "@/components/dashboard/ResourceAcademicContent";

/* ── API types ── */
interface ApiResource {
  id: string;
  title: string;
  type: "VIDEO_YOUTUBE" | "VIDEO_VIMEO" | "VIDEO_FILE" | "PDF" | "FILE" | "LINK";
  url?: string;
  filePath?: string;
}
interface ApiLesson {
  id: string;
  title: string;
  order: number;
  resources: ApiResource[];
}
interface ApiCourse {
  id: string;
  title: string;
  slug: string;
  description?: string;
  thumbnail?: string;
  duration?: string;
  instructorName?: string;
  lessons: ApiLesson[];
}

/* ── Flat content item for navigation ── */
interface ContentItem {
  id: string;
  title: string;
  type: ApiResource["type"];
  url: string;
  lessonId: string;
  lessonTitle: string;
  lessonIdx: number;
}

/* ── URL helpers ── */
function youtubeEmbed(url: string): string {
  const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&?/]+)/);
  return m ? `https://www.youtube.com/embed/${m[1]}` : url;
}
function vimeoEmbed(url: string): string {
  const m = url.match(/vimeo\.com\/(\d+)/);
  return m ? `https://player.vimeo.com/video/${m[1]}` : url;
}

/* ── Resource type icon ── */
function ResourceIcon({ type, size = 16 }: { type: ApiResource["type"]; size?: number }) {
  const color = "currentColor";
  if (type === "VIDEO_YOUTUBE" || type === "VIDEO_VIMEO" || type === "VIDEO_FILE")
    return <svg viewBox="0 0 24 24" fill={color} width={size} height={size}><path d="M8 5v14l11-7z"/></svg>;
  if (type === "PDF")
    return <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" width={size} height={size}><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>;
  return <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" width={size} height={size}><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg>;
}

/* ── Content Player ── */
function ContentPlayer({
  item,
  color,
  yaCompletado,
  onComplete,
  onNext,
}: {
  item: ContentItem;
  color: string;
  yaCompletado: boolean;
  onComplete: () => void;
  onNext?: () => void;
}) {
  const [completed, setCompleted] = useState(yaCompletado);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    setCompleted(yaCompletado);
  }, [item.id, yaCompletado]);

  function markDone() {
    setCompleted(true);
    onComplete();
  }

  if (completed) {
    return (
      <div className="lp-completed">
        <div className="lp-cmp-bg" />
        <span className="lp-particle lp-particle-1">★</span>
        <span className="lp-particle lp-particle-2">✦</span>
        <span className="lp-particle lp-particle-3">◆</span>
        <span className="lp-particle lp-particle-4">★</span>
        <span className="lp-particle lp-particle-5">✦</span>
        <span className="lp-particle lp-particle-6">◆</span>
        <div className="lp-completed-inner">
          <div className="lp-cmp-icon-wrap">
            <div className="lp-cmp-ring lp-cmp-ring-1" />
            <div className="lp-cmp-ring lp-cmp-ring-2" />
            <div className="lp-cmp-icon">
              <svg className="lp-cmp-svg" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="34" height="34">
                <path pathLength="1" d="M20 6L9 17l-5-5" />
              </svg>
            </div>
          </div>
          <div className="lp-cmp-text">
            <p className="lp-cmp-label">¡Excelente trabajo!</p>
            <h2 className="lp-cmp-title">Lección completada</h2>
            <p className="lp-cmp-sub">{item.title}</p>
          </div>
          <div className="lp-cmp-actions">
            {onNext && (
              <button className="lp-cmp-next" style={{ background: color }} onClick={onNext}>
                Siguiente lección →
              </button>
            )}
            <button className="lp-replay" onClick={() => setCompleted(false)}>↺ Ver de nuevo</button>
          </div>
        </div>
        <div className="lp-prog-bar-wrap">
          <div className="lp-prog-bar-fill" style={{ width: "100%", background: "#22c55e" }} />
        </div>
      </div>
    );
  }

  /* ── YouTube / Vimeo ── */
  if (item.type === "VIDEO_YOUTUBE" || item.type === "VIDEO_VIMEO") {
    const src = item.type === "VIDEO_YOUTUBE" ? youtubeEmbed(item.url) : vimeoEmbed(item.url);
    return (
      <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
        <div style={{ position: "relative", paddingTop: "56.25%", background: "#000", flex: 1 }}>
          <iframe
            src={src}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", border: "none" }}
          />
        </div>
        <div style={{ padding: "14px 20px", background: "#fff", borderTop: "1px solid #e2eaf7", display: "flex", justifyContent: "flex-end" }}>
          <button
            onClick={markDone}
            style={{ padding: "10px 20px", background: color, color: "#fff", border: "none", borderRadius: 10, cursor: "pointer", fontWeight: 700, fontSize: "0.9rem" }}
          >
            ✓ Marcar como completado
          </button>
        </div>
      </div>
    );
  }

  /* ── Video archivo ── */
  if (item.type === "VIDEO_FILE") {
    const src = mediaUrl(item.url) ?? item.url;
    return (
      <div style={{ display: "flex", flexDirection: "column", background: "#000", height: "100%" }}>
        <video
          ref={videoRef}
          src={src}
          controls
          style={{ width: "100%", flex: 1, maxHeight: "calc(100% - 56px)" }}
          onEnded={markDone}
        />
        <div style={{ padding: "12px 20px", background: "#fff", borderTop: "1px solid #e2eaf7", display: "flex", justifyContent: "flex-end" }}>
          <button
            onClick={markDone}
            style={{ padding: "8px 18px", background: color, color: "#fff", border: "none", borderRadius: 10, cursor: "pointer", fontWeight: 700, fontSize: "0.85rem" }}
          >
            ✓ Marcar como completado
          </button>
        </div>
      </div>
    );
  }

  /* ── PDF ── */
  if (item.type === "PDF") {
    const src = mediaUrl(item.url) ?? item.url;
    return (
      <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
        <iframe src={src} style={{ flex: 1, border: "none", width: "100%", minHeight: 400 }} />
        <div style={{ padding: "12px 20px", background: "#fff", borderTop: "1px solid #e2eaf7", display: "flex", gap: 12, justifyContent: "flex-end", alignItems: "center" }}>
          <a href={src} target="_blank" rel="noreferrer" style={{ color: "#64748b", fontSize: "0.85rem" }}>⬇ Descargar</a>
          <button
            onClick={markDone}
            style={{ padding: "8px 18px", background: color, color: "#fff", border: "none", borderRadius: 10, cursor: "pointer", fontWeight: 700, fontSize: "0.85rem" }}
          >
            ✓ Marcar como completado
          </button>
        </div>
      </div>
    );
  }

  /* ── Enlace / Archivo ── */
  const src = mediaUrl(item.url) ?? item.url;
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 260, background: "#f8faff", borderRadius: 12, border: "1px solid #e2eaf7", gap: 20, padding: 40, margin: 20 }}>
      <ResourceIcon type={item.type} size={48} />
      <p style={{ color: "#1e293b", fontWeight: 600, fontSize: "1.1rem", textAlign: "center" }}>{item.title}</p>
      <a
        href={src}
        target="_blank"
        rel="noreferrer"
        style={{ padding: "12px 28px", background: color, color: "#fff", borderRadius: 12, textDecoration: "none", fontWeight: 700, fontSize: "0.95rem" }}
      >
        Abrir recurso →
      </a>
      <button
        onClick={markDone}
        style={{ padding: "10px 20px", background: "transparent", color: "#64748b", border: "1px solid #e2eaf7", borderRadius: 10, cursor: "pointer", fontSize: "0.85rem" }}
      >
        ✓ Marcar como completado
      </button>
    </div>
  );
}

/* ── Página principal ── */
export default function CursoDetallePage() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const params = useParams();
  const courseId = params?.slug as string;

  const [curso, setCurso] = useState<ApiCourse | null>(null);
  const [fetching, setFetching] = useState(true);
  const [fetchError, setFetchError] = useState("");

  useEffect(() => {
    if (!loading && !user) router.replace("/auth/login");
    if (!loading && user?.mustChangePassword) router.replace("/auth/change-password");
    if (!loading && user?.role === "ADMIN") router.replace("/admin");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, loading]);

  useEffect(() => {
    if (!courseId) return;
    api.get<ApiCourse>(`/courses/${courseId}`)
      .then(setCurso)
      .catch((e: any) => setFetchError(e.message ?? "Error al cargar el curso"))
      .finally(() => setFetching(false));
  }, [courseId]);

  const allItemsRef = useRef<ContentItem[]>([]);

  /* Flat list of all content items */
  const allItems = useMemo<ContentItem[]>(() => {
    if (!curso) return [];
    return curso.lessons.flatMap((lesson, lIdx) =>
      lesson.resources.map(r => ({
        id: r.id,
        title: r.title,
        type: r.type,
        url: r.url ?? r.filePath ?? "",
        lessonId: lesson.id,
        lessonTitle: lesson.title,
        lessonIdx: lIdx,
      }))
    );
  }, [curso]);

  useEffect(() => { allItemsRef.current = allItems; }, [allItems]);

  const [itemActual, setItemActual] = useState<ContentItem | null>(null);
  const [seccionesAbiertas, setSeccionesAbiertas] = useState<string[]>([]);
  const [visitadas, setVisitadas] = useState<Set<string>>(new Set());
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    if (allItems.length > 0 && !itemActual) {
      setItemActual(allItems[0]);
      setSeccionesAbiertas([allItems[0].lessonId]);
    }
  }, [allItems]);

  useEffect(() => {
    if (!courseId) return;
    const stored = getVisitadas(courseId);
    setVisitadas(new Set(stored));
  }, [courseId]);

  const itemActualRef = useRef(itemActual);
  useEffect(() => { itemActualRef.current = itemActual; }, [itemActual]);

  const handleComplete = useCallback(() => {
    const item = itemActualRef.current;
    if (!item) return;
    setVisitadas(prev => {
      const next = new Set([...prev, item.id]);
      marcarLeccionCompletada(courseId, item.id, "");
      // Si completó todos los recursos, marcar inscripción como completada
      if (next.size >= allItemsRef.current.length && allItemsRef.current.length > 0) {
        api.patch(`/enrollments/${courseId}/complete`, {}).catch(() => {});
      }
      return next;
    });
  }, [courseId]);

  const idx = allItems.findIndex(i => i.id === itemActual?.id);
  const siguiente = idx < allItems.length - 1 ? allItems[idx + 1] : null;
  const anterior = idx > 0 ? allItems[idx - 1] : null;

  const irA = (item: ContentItem) => {
    setItemActual(item);
    setSeccionesAbiertas(prev => prev.includes(item.lessonId) ? prev : [...prev, item.lessonId]);
  };

  const toggleSeccion = (id: string) =>
    setSeccionesAbiertas(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const totalVistos = visitadas.size;
  const totalItems = allItems.length;
  const progreso = totalItems > 0 ? Math.round((totalVistos / totalItems) * 100) : 0;
  const color = "#004aad";

  if (loading || !user) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f0f4ff" }}>
      <div style={{ textAlign: "center", color: "#334155" }}>
        <div style={{ fontSize: "2.5rem", marginBottom: 12 }}>⏳</div>
        <div style={{ fontWeight: 700 }}>Cargando…</div>
      </div>
    </div>
  );

  if (fetching) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f0f4ff" }}>
      <div style={{ textAlign: "center", color: "#334155" }}>
        <div style={{ fontSize: "2.5rem", marginBottom: 12 }}>⏳</div>
        <div style={{ fontWeight: 700 }}>Cargando curso…</div>
      </div>
    </div>
  );

  if (fetchError || !curso) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f0f4ff" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: "3rem", marginBottom: 12 }}>🔍</div>
        <div style={{ fontWeight: 700, color: "#334155", marginBottom: 16 }}>Curso no encontrado</div>
        <Link href="/dashboard/mis-cursos" className="btn btn-naranja">← Volver a mis cursos</Link>
      </div>
    </div>
  );

  if (allItems.length === 0) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f0f4ff" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: "3rem", marginBottom: 12 }}>📭</div>
        <div style={{ fontWeight: 700, color: "#334155", marginBottom: 8 }}>{curso.title}</div>
        <p style={{ color: "#64748b", marginBottom: 20 }}>Este curso aún no tiene contenido disponible.</p>
        <Link href="/dashboard/mis-cursos" className="btn btn-naranja">← Volver a mis cursos</Link>
      </div>
    </div>
  );

  return (
    <div className="lp-root">

      {/* ── Top bar ── */}
      <div className="lp-topbar" style={{ borderBottom: `3px solid ${color}` }}>
        <Link href="/dashboard/mis-cursos" className="lp-back">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="16" height="16"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
          Mis cursos
        </Link>
        <div className="lp-topbar-center">
          <span className="lp-topbar-titulo">{curso.title}</span>
        </div>
        <div className="lp-topbar-right">
          <div className="lp-topbar-prog">
            <div className="lp-topbar-prog-bar">
              <div className="lp-topbar-prog-fill" style={{ width: `${progreso}%`, background: color }} />
            </div>
            <span className="lp-topbar-prog-pct">{progreso}%</span>
          </div>
          <button className="lp-topbar-logout" onClick={() => { logout(); router.push("/"); }}>
            Salir
          </button>
          <button
            className="lp-sidebar-toggle-btn"
            onClick={() => setSidebarOpen(o => !o)}
            title={sidebarOpen ? "Ocultar contenido" : "Mostrar contenido"}
          >
            <span className="lp-hamburger-line" />
            <span className="lp-hamburger-line" />
            <span className="lp-hamburger-line" />
          </button>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="lp-body">

        {/* ── Panel izquierdo: player + info ── */}
        <div className="lp-main" style={{ marginRight: sidebarOpen ? 360 : 0 }}>
          {itemActual && (
            <>
              <div className="lp-player">
                <ContentPlayer
                  item={itemActual}
                  color={color}
                  yaCompletado={visitadas.has(itemActual.id)}
                  onComplete={handleComplete}
                  onNext={siguiente ? () => irA(siguiente) : undefined}
                />
              </div>

              {/* Info */}
              <div className="lp-leccion-info">
                <div className="lp-leccion-badge" style={{ background: `${color}18`, color }}>
                  {itemActual.lessonTitle}
                </div>
                <h1 className="lp-leccion-titulo">{itemActual.title}</h1>
                <div className="lp-leccion-meta">
                  <span>{visitadas.has(itemActual.id) ? "✅ Completado" : "○ Pendiente"}</span>
                </div>
              </div>

              {/* Contenido académico inline */}
              <div style={{ padding: "0 32px 28px" }}>
                <ResourceAcademicContent
                  resourceId={itemActual.id}
                  slug={courseId}
                  userId={user?.id}
                />
              </div>

              {/* Navegación */}
              <div className="lp-nav">
                <button className="lp-nav-btn" disabled={!anterior} onClick={() => anterior && irA(anterior)}>
                  ← {anterior ? anterior.title : "Primero"}
                </button>
                <button
                  className="lp-nav-btn lp-nav-next"
                  disabled={!siguiente}
                  onClick={() => siguiente && irA(siguiente)}
                  style={siguiente ? { background: color } : {}}
                >
                  {siguiente ? siguiente.title : "Último"} →
                </button>
              </div>
            </>
          )}
        </div>

        {/* ── Sidebar derecho ── */}
        <aside className="lp-sidebar" style={{ transform: sidebarOpen ? "translateX(0)" : "translateX(100%)" }}>
          <div className="lp-sidebar-header">
            <span>Contenido del curso</span>
            <span className="lp-sidebar-count">{totalVistos}/{totalItems}</span>
          </div>
          <div className="lp-sidebar-prog-wrap">
            <div className="lp-sidebar-prog-bg">
              <div className="lp-sidebar-prog-fill" style={{ width: `${progreso}%`, background: color }} />
            </div>
            <span className="lp-sidebar-prog-txt">{progreso}% completado</span>
          </div>

          <div className="lp-secciones">
            {curso.lessons.map((lesson, lIdx) => {
              const abierta = seccionesAbiertas.includes(lesson.id);
              const vistasEnSec = lesson.resources.filter(r => visitadas.has(r.id)).length;
              return (
                <div key={lesson.id} className="lp-seccion">
                  <button className="lp-sec-header" onClick={() => toggleSeccion(lesson.id)}>
                    <div className="lp-sec-header-left">
                      <span className="lp-sec-num" style={{ background: color }}>S{lIdx + 1}</span>
                      <span className="lp-sec-titulo">{lesson.title}</span>
                    </div>
                    <div className="lp-sec-header-right">
                      <span className="lp-sec-prog">{vistasEnSec}/{lesson.resources.length}</span>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="14" height="14"
                        style={{ transform: abierta ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>
                        <path d="M6 9l6 6 6-6"/>
                      </svg>
                    </div>
                  </button>

                  {abierta && (
                    <ul className="lp-lecciones">
                      {lesson.resources.map(r => {
                        const item: ContentItem = {
                          id: r.id,
                          title: r.title,
                          type: r.type,
                          url: r.url ?? r.filePath ?? "",
                          lessonId: lesson.id,
                          lessonTitle: lesson.title,
                          lessonIdx: lIdx,
                        };
                        const activa = itemActual?.id === r.id;
                        const vista = visitadas.has(r.id);
                        return (
                          <li
                            key={r.id}
                            className={`lp-leccion ${activa ? "lp-leccion-activa" : ""}`}
                            onClick={() => irA(item)}
                            style={activa ? { borderLeft: `3px solid ${color}`, background: `${color}0d` } : {}}
                          >
                            <span className="lp-leccion-icon" style={{ color: vista ? "#22c55e" : activa ? color : "#94a3b8" }}>
                              {vista ? (
                                <svg viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" width="16" height="16"><path d="M20 6L9 17l-5-5"/></svg>
                              ) : (
                                <ResourceIcon type={r.type} size={15} />
                              )}
                            </span>
                            <div className="lp-leccion-body">
                              <span className={`lp-leccion-nombre ${activa ? "lp-leccion-nombre-activa" : ""} ${vista && !activa ? "lp-leccion-nombre-vista" : ""}`}>
                                {r.title}
                              </span>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        </aside>
      </div>
    </div>
  );
}
