"use client";

import { useState, useEffect, useCallback } from "react";

type ExamTheme = "dark" | "light";

const LS_KEY = "exam-theme";

/**
 * Hook local — no necesita Provider.
 * Cada página llama a esto directamente: estado local + localStorage.
 */
export function useExamTheme() {
  const [theme, setTheme] = useState<ExamTheme>("dark");

  useEffect(() => {
    try {
      const saved = localStorage.getItem(LS_KEY);
      if (saved === "light" || saved === "dark") setTheme(saved);
    } catch {}
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next: ExamTheme = prev === "dark" ? "light" : "dark";
      try { localStorage.setItem(LS_KEY, next); } catch {}
      return next;
    });
  }, []);

  return {
    theme,
    toggleTheme,
    examClass: theme === "light" ? "sim-theme-light" : "",
    listClass: theme === "dark"  ? "sim-theme-dark"  : "",
  };
}
