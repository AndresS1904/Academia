"use client";

import { createContext, useContext } from "react";

export interface SchoolColors {
  primary: string;
  secondary: string;
  accent: string;
  dark: string;
}

export interface GaleriaItem {
  url: string;
  caption?: string;
}

export interface SchoolPrograma {
  id?: string;
  titulo: string;
  descripcion: string;
  emoji: string;
  tag?: string;
  activo?: boolean;
  objetivo?: string;
}

export interface SchoolPageContent {
  colors?: Partial<SchoolColors>;
  hero?: {
    titulo?: string;
    subtitulo?: string;
    stat1?: string; stat1lbl?: string;
    stat2?: string; stat2lbl?: string;
    stat3?: string; stat3lbl?: string;
  };
  sobreNosotros?: {
    titulo?: string;
    contenido?: string;
    mision?: string;
    vision?: string;
  };
  programas?: SchoolPrograma[];
  contacto?: {
    whatsapp?: string;
    whatsappMsg?: string;
    instagram?: string;
    tiktok?: string;
    facebook?: string;
  };
  galeria?: GaleriaItem[];
}

export interface SchoolData {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string | null;
  colors?: Partial<SchoolColors>;
  pageContent?: SchoolPageContent;
}

export const DEFAULT_COLORS: SchoolColors = {
  primary: "#004aad",
  secondary: "#fc740c",
  accent: "#0ea5e9",
  dark: "#0a1628",
};

export interface SchoolContextType {
  school: SchoolData | null;
  colors: SchoolColors;
  loading: boolean;
}

export const SchoolContext = createContext<SchoolContextType>({
  school: null,
  colors: DEFAULT_COLORS,
  loading: true,
});

export function useSchool() {
  return useContext(SchoolContext);
}
