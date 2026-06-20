"use client";

import { useEffect, useState, ReactNode } from "react";
import { SchoolContext, SchoolData, SchoolColors, DEFAULT_COLORS } from "@/contexts/SchoolContext";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";

export default function SchoolLayoutClient({
  children,
  slug,
}: {
  children: ReactNode;
  slug: string;
}) {
  const [school, setSchool] = useState<SchoolData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) { setLoading(false); return; }
    fetch(`${API}/schools/public/${slug}`)
      .then(r => r.json())
      .then(data => setSchool(data?.data ?? data))
      .catch(() => null)
      .finally(() => setLoading(false));
  }, [slug]);

  const pc = school?.pageContent;
  const colors: SchoolColors = {
    primary:   pc?.colors?.primary   ?? school?.colors?.primary   ?? DEFAULT_COLORS.primary,
    secondary: pc?.colors?.secondary ?? school?.colors?.secondary ?? DEFAULT_COLORS.secondary,
    accent:    pc?.colors?.accent    ?? school?.colors?.accent    ?? DEFAULT_COLORS.accent,
    dark:      pc?.colors?.dark      ?? school?.colors?.dark      ?? DEFAULT_COLORS.dark,
  };

  return (
    <SchoolContext.Provider value={{ school, colors, loading }}>
      <style>{`
        :root {
          --color-primary:   ${colors.primary};
          --color-secondary: ${colors.secondary};
          --color-accent:    ${colors.accent};
          --color-dark:      ${colors.dark};
        }
      `}</style>
      {children}
    </SchoolContext.Provider>
  );
}
