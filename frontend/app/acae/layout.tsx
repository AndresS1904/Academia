import { Metadata } from "next";
import { ReactNode } from "react";

// Rutas /acae/* usan su propio layout independiente —
// no heredan el SchoolContext de [slug]/layout.tsx
export const metadata: Metadata = {
  title: "ACAE - Plataforma Educativa",
  description:
    "ACAE: preparación estratégica para ICFES y admisión a la universidad. Simulacros, docentes especializados y resultados medibles.",
};

export default function AcaeLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
