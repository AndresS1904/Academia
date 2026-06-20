"use client";

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import { api } from "@/lib/api";

export interface UserSchool {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string | null;
  colors?: { primary?: string; secondary?: string; accent?: string; dark?: string } | null;
}

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  avatar?: string;
  role: "SUPER_ADMIN" | "ADMIN" | "ESTUDIANTE";
  schoolId?: string | null;
  school?: UserSchool | null;
  mustChangePassword?: boolean;
  createdAt?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (identifier: string, password: string) => Promise<{ mustChangePassword: boolean; user: User }>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

const CACHE_KEY = "acae_user";

function readCache(): User | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    return null;
  }
}

function writeCache(u: User | null) {
  try {
    if (u) localStorage.setItem(CACHE_KEY, JSON.stringify(u));
    else localStorage.removeItem(CACHE_KEY);
  } catch { /* ignorar */ }
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  // Inicializa desde caché → datos disponibles en el primer render sin esperar al fetch
  const [user, setUser] = useState<User | null>(() => readCache());
  const [loading, setLoading] = useState(true);

  const setAndCache = useCallback((u: User | null) => {
    setUser(u);
    writeCache(u);
  }, []);

  /**
   * Carga el perfil completo desde el backend (incluye school, logo, etc.).
   * Siempre sobreescribe el caché con datos frescos del servidor.
   */
  const fetchMe = useCallback(async () => {
    try {
      const me = await api.get<User>("/auth/profile");
      setAndCache(me); // siempre reemplaza — nunca datos obsoletos del caché
    } catch {
      setAndCache(null); // sesión inválida → limpiar
    } finally {
      setLoading(false);
    }
  }, [setAndCache]);

  // Al montar, siempre intentamos cargar el perfil.
  // Si la cookie existe → success. Si no → setUser(null).
  useEffect(() => {
    fetchMe();
  }, [fetchMe]);

  // Escuchar evento de sesión expirada (lanzado por api.ts al recibir 401)
  useEffect(() => {
    const handleExpired = () => {
      setAndCache(null);
      window.location.href = "/auth/login?expired=1";
    };
    window.addEventListener("acae:session-expired", handleExpired);
    return () => window.removeEventListener("acae:session-expired", handleExpired);
  }, [setAndCache]);

  const login = async (identifier: string, password: string) => {
    const res = await api.post<{ user: User; mustChangePassword?: boolean }>(
      "/auth/login",
      { identifier, password }
    );
    // Obtener el perfil completo (con school, logo, etc.) inmediatamente después del login
    // en vez de usar solo lo que devuelve el endpoint de login
    try {
      const me = await api.get<User>("/auth/profile");
      setAndCache(me);
    } catch {
      setAndCache(res.user);
    }
    return { mustChangePassword: res.mustChangePassword ?? false, user: res.user };
  };

  const register = async (data: RegisterData) => {
    const res = await api.post<{ user: User }>("/auth/register", data);
    setAndCache(res.user);
  };

  const logout = async () => {
    try {
      // El backend borra la cookie httpOnly
      await api.post("/auth/logout", {});
    } catch {
      // Ignorar errores de red en logout
    } finally {
      setAndCache(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser: fetchMe as () => Promise<void> }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
