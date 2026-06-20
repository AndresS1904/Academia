import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Middleware mínimo: no bloquea rutas.
 * La protección de rutas se maneja en cada página via AuthContext (client-side).
 * El middleware de servidor no puede leer la cookie httpOnly del backend
 * confiablemente en desarrollo (puertos 3000 vs 3001).
 */
export function middleware(_request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: [],
};
