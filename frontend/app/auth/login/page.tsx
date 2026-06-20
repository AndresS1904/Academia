"use client";

import { useState, useEffect, FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

function detectInputType(value: string): "email" | "documento" | "unknown" {
  if (!value) return "unknown";
  if (value.includes("@")) return "email";
  if (/^\d+$/.test(value.trim())) return "documento";
  return "unknown";
}

export default function LoginPage() {
  const router = useRouter();
  const { login, user, loading: authLoading } = useAuth();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const inputType = detectInputType(identifier);

  useEffect(() => {
    if (!authLoading && user) {
      router.replace(
        user.role === "SUPER_ADMIN" ? "/admin" :
        user.role === "ADMIN" ? "/school-admin" : "/dashboard"
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { mustChangePassword, user: loggedUser } = await login(identifier.trim(), password);
      if (mustChangePassword) {
        router.push("/auth/change-password");
      } else if (loggedUser.role === "SUPER_ADMIN") {
        router.push("/admin");
      } else if (loggedUser.role === "ADMIN") {
        router.push("/school-admin");
      } else {
        router.push("/dashboard");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Credenciales incorrectas");
    } finally {
      setLoading(false);
    }
  };

  const identifierLabel =
    inputType === "documento" ? "Número de identificación" :
    inputType === "email" ? "Correo electrónico" :
    "Correo o número de identificación";

  const identifierHint =
    inputType === "documento" ? "Inicio de sesión para estudiantes" :
    inputType === "email" ? "Inicio de sesión para administradores" :
    null;

  return (
    <div className="auth-page">
      <div className="auth-orb auth-orb-1" />
      <div className="auth-orb auth-orb-2" />

      <div className="auth-card">
        {/* Logo */}
        <div className="auth-logo">
          <div className="auth-logo-text">
            Ap<span>rova</span>
          </div>
          <div className="auth-logo-sub">Plataforma educativa para instituciones</div>
        </div>

        <h1 className="auth-title">Iniciar sesión</h1>
        <p className="auth-subtitle">Bienvenido de nuevo — accede a tu cuenta</p>

        {error && (
          <div className="auth-alert error">
            <span>⚠</span> {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="identifier">
              {identifierLabel}
            </label>
            <input
              id="identifier"
              type="text"
              className="form-input"
              placeholder="Correo o número de identificación"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              required
              autoComplete="username"
              autoCapitalize="none"
            />
            {identifierHint && (
              <span style={{ fontSize: "0.75rem", color: inputType === "documento" ? "#34d399" : "#60a5fa", marginTop: 4, display: "block" }}>
                {inputType === "documento" ? "👤" : "🔑"} {identifierHint}
              </span>
            )}
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="password">
              Contraseña
            </label>
            <input
              id="password"
              type="password"
              className="form-input"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
            {inputType === "documento" && (
              <span style={{ fontSize: "0.72rem", color: "#64748b", marginTop: 4, display: "block" }}>
                Si es tu primer acceso, tu contraseña es tu número de identificación.
              </span>
            )}
          </div>

          <button
            type="submit"
            className="btn-form"
            disabled={loading}
            style={{ marginTop: "8px" }}
          >
            {loading ? "Ingresando…" : "Ingresar"}
          </button>
        </form>

        <div className="auth-link-row" style={{ marginTop: "16px" }}>
          <Link href="/auth/forgot-password">¿Olvidaste tu contraseña?</Link>
        </div>

        <div className="auth-link-row" style={{ marginTop: "10px" }}>
          <Link href="/">← Volver al inicio</Link>
        </div>

      </div>
    </div>
  );
}
