/* ─────────────────────────────────────────────
   Simulacro Storage — persiste en localStorage
   ───────────────────────────────────────────── */

export interface SimulacroGuardado {
  status: "pendiente" | "en_progreso" | "completado";
  respuestas: Record<number, "A" | "B" | "C" | "D">;
  ordenPreguntas: number[];
  tiempoUsadoSeg: number;
  fechaInicio?: string;
  fechaFin?: string;
  puntaje?: number;
}

const KEY = "acae_simulacros";

function leer(): Record<string, SimulacroGuardado> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "{}");
  } catch {
    return {};
  }
}

function guardarTodo(data: Record<string, SimulacroGuardado>): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(data));
}

export function getSimulacroGuardado(simId: string): SimulacroGuardado | null {
  const data = leer();
  return data[simId] ?? null;
}

export function guardarSimulacro(simId: string, sim: SimulacroGuardado): void {
  const data = leer();
  data[simId] = sim;
  guardarTodo(data);
}

export function iniciarSimulacro(
  simId: string,
  ordenPreguntas: number[]
): SimulacroGuardado {
  const existente = getSimulacroGuardado(simId);
  if (existente && existente.status === "en_progreso") {
    return existente;
  }
  const nuevo: SimulacroGuardado = {
    status: "en_progreso",
    respuestas: {},
    ordenPreguntas,
    tiempoUsadoSeg: 0,
    fechaInicio: new Date().toISOString(),
  };
  guardarSimulacro(simId, nuevo);
  return nuevo;
}

export function actualizarRespuesta(
  simId: string,
  preguntaId: number,
  respuesta: "A" | "B" | "C" | "D"
): void {
  const data = leer();
  if (!data[simId]) return;
  data[simId].respuestas[preguntaId] = respuesta;
  guardarTodo(data);
}

export function completarSimulacro(
  simId: string,
  tiempoUsadoSeg: number
): number {
  const data = leer();
  if (!data[simId]) return 0;

  // importar preguntas inline para evitar dependencia circular
  // el cálculo del puntaje se hace en el componente usando BANCO_PREGUNTAS
  // esta función sólo persiste el estado; el puntaje se pasa desde afuera
  const sim = data[simId];
  sim.status = "completado";
  sim.tiempoUsadoSeg = tiempoUsadoSeg;
  sim.fechaFin = new Date().toISOString();
  // puntaje calculado externamente y almacenado antes de esta llamada
  data[simId] = sim;
  guardarTodo(data);
  return sim.puntaje ?? 0;
}

export function setPuntaje(simId: string, puntaje: number): void {
  const data = leer();
  if (!data[simId]) return;
  data[simId].puntaje = puntaje;
  guardarTodo(data);
}
