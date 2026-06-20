"use client";

import { useState, FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

export default function RegisterPage() {
  const router = useRouter();
  const { register } = useAuth();

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [k]: e.target.value }));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");

    if (form.password !== form.confirmPassword) {
      setError("Las contraseñas no coinciden");
      return;
    }
    if (form.password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres");
      return;
    }

    setLoading(true);
    try {
      await register({
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        password: form.password,
      });
      router.push("/dashboard");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al crear la cuenta");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-orb auth-orb-1" />
      <div className="auth-orb auth-orb-2" />

      <div className="auth-card" style={{ maxWidth: 500 }}>
        {/* Logo */}
        <div className="auth-logo">
          <div className="auth-logo-text">
            Ap<span>rova</span>
          </div>
          <div className="auth-logo-sub">Plataforma educativa para instituciones</div>
        </div>

        <h1 className="auth-title">Crear cuenta</h1>
        <p className="auth-subtitle">Únete a ACAE y comienza a prepararte hoy</p>

        {error && (
          <div className="auth-alert error">
            <span>⚠</span> {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label" htmlFor="firstName">Nombre</label>
              <input
                id="firstName"
                type="text"
                className="form-input"
                placeholder="Juan"
                value={form.firstName}
                onChange={set("firstName")}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="lastName">Apellido</label>
              <input
                id="lastName"
                type="text"
                className="form-input"
                placeholder="Pérez"
                value={form.lastName}
                onChange={set("lastName")}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="email">Correo electrónico</label>
            <input
              id="email"
              type="email"
              className="form-input"
              placeholder="correo@ejemplo.com"
              value={form.email}
              onChange={set("email")}
              required
              autoComplete="email"
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="password">Contraseña</label>
            <input
              id="password"
              type="password"
              className="form-input"
              placeholder="Mínimo 8 caracteres"
              value={form.password}
              onChange={set("password")}
              required
              autoComplete="new-password"
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="confirmPassword">Confirmar contraseña</label>
            <input
              id="confirmPassword"
              type="password"
              className="form-input"
              placeholder="Repite tu contraseña"
              value={form.confirmPassword}
              onChange={set("confirmPassword")}
              required
              autoComplete="new-password"
            />
          </div>

          <button
            type="submit"
            className="btn-form"
            disabled={loading}
            style={{ marginTop: "8px" }}
          >
            {loading ? "Creando cuenta…" : "Crear cuenta gratis"}
          </button>
        </form>

        <div
          style={{
            fontSize: "0.78rem",
            color: "#94a3b8",
            textAlign: "center",
            marginTop: "16px",
            lineHeight: 1.6,
          }}
        >
          Al registrarte aceptas nuestros{" "}
          <a href="#" style={{ color: "#004aad", fontWeight: 700 }}>
            términos y condiciones
          </a>
          .
        </div>

        <div className="auth-link-row" style={{ marginTop: "16px" }}>
          ¿Ya tienes cuenta? <Link href="/auth/login">Inicia sesión</Link>
        </div>

        <div className="auth-link-row" style={{ marginTop: "10px" }}>
          <Link href="/">← Volver al inicio</Link>
        </div>
      </div>
    </div>
  );
}
