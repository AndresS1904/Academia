"use client";

import { useState, FormEvent } from "react";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/auth/forgot-password`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        }
      );
      if (!res.ok) throw new Error("Error al procesar la solicitud");
      setSent(true);
    } catch {
      setError("No se pudo procesar la solicitud. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-orb auth-orb-1" />
      <div className="auth-orb auth-orb-2" />

      <div className="auth-card">
        <div className="auth-logo">
          <div className="auth-logo-text">
            Ap<span>rova</span>
          </div>
          <div className="auth-logo-sub">Plataforma educativa para instituciones</div>
        </div>

        <h1 className="auth-title">Recuperar contraseña</h1>

        {sent ? (
          <>
            <div className="auth-alert" style={{ background: "rgba(34,197,94,0.12)", color: "#22c55e", borderColor: "#22c55e33" }}>
              <span>✓</span> Instrucciones enviadas. Revisa la consola del servidor (en desarrollo).
            </div>
            <div className="auth-link-row" style={{ marginTop: "24px" }}>
              <Link href="/auth/login">← Volver al login</Link>
            </div>
          </>
        ) : (
          <>
            <p className="auth-subtitle">
              Ingresa tu correo y te enviaremos un enlace para restablecer tu contraseña.
            </p>

            {error && (
              <div className="auth-alert error">
                <span>⚠</span> {error}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label" htmlFor="email">
                  Correo electrónico
                </label>
                <input
                  id="email"
                  type="email"
                  className="form-input"
                  placeholder="correo@ejemplo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>

              <button
                type="submit"
                className="btn-form"
                disabled={loading}
                style={{ marginTop: "8px" }}
              >
                {loading ? "Enviando…" : "Enviar enlace"}
              </button>
            </form>

            <div className="auth-link-row" style={{ marginTop: "24px" }}>
              <Link href="/auth/login">← Volver al login</Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
