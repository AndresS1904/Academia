/* ─────────────────────────────────────────────
   Progreso de cursos — persiste en localStorage
   ───────────────────────────────────────────── */

const KEY = "acae_progress_v2";

interface CourseProgress {
  visitadasIds: string[];
}

function leer(): Record<string, CourseProgress> {
  try { return JSON.parse(localStorage.getItem(KEY) ?? "{}"); }
  catch { return {}; }
}

function guardar(data: Record<string, CourseProgress>) {
  localStorage.setItem(KEY, JSON.stringify(data));
}

export function getVisitadas(courseId: string): string[] {
  return leer()[courseId]?.visitadasIds ?? [];
}

export function marcarLeccionCompletada(
  courseId: string,
  leccionId: string,
  _duracion: string,
): void {
  const data = leer();
  const cur = data[courseId] ?? { visitadasIds: [] };
  if (!cur.visitadasIds.includes(leccionId)) {
    cur.visitadasIds = [...cur.visitadasIds, leccionId];
  }
  data[courseId] = cur;
  guardar(data);
}

/* ── Funciones legacy (mock) — ya no se usan en cursos reales ── */
export function parseDuracionMin(dur: string): number {
  const h = dur.match(/(\d+)\s*h/);
  const m = dur.match(/(\d+)\s*min/);
  return (h ? +h[1] : 0) * 60 + (m ? +m[1] : 0);
}

export function getStatsGlobales() {
  return { activos: 0, completados: 0, tiempo: "0h", promedio: 0 };
}

export function forzarCursoCompleto(_slug: string): void {}
