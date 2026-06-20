import { Metadata } from "next";
import { ReactNode } from "react";
import SchoolLayoutClient from "./SchoolLayoutClient";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  try {
    const res = await fetch(`${API}/schools/public/${slug}`, { cache: "no-store" });
    if (!res.ok) throw new Error("not found");
    const json = await res.json();
    const school = json?.data ?? json;
    if (!school?.name) throw new Error("no name");
    return {
      title: `${school.name} - Aprova`,
      description: `Plataforma educativa de ${school.name}. Cursos, simulacros y seguimiento académico.`,
    };
  } catch {
    return {
      title: "Aprova - Plataforma Educativa",
      description:
        "Plataforma SaaS educativa multi-institución. Gestiona cursos, simulacros y estudiantes desde un solo lugar.",
    };
  }
}

// Server component — recibe params siempre de forma confiable
export default async function SchoolLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return (
    <SchoolLayoutClient slug={slug}>
      {children}
    </SchoolLayoutClient>
  );
}
