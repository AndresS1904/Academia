"use client";

import { useState, FormEvent, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");

    if (newPassword.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres");
      return;
    }
    if (newPassword !== confirm) {
      setError("Las contraseñas no coinciden");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/auth/reset-password`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, newPassword }),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Error al restablecer");
      setSuccess(true);
      setTimeout(() => router.push("/auth/login"), 2500);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al restablecer la contraseña");
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="auth-alert error">
        <span>⚠</span> Enlace inválido. Solicita uno nuevo.
        <div style={{ marginTop: "16px" }}>
          <Link href="/auth/forgot-password">Solicitar enlace</Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <h1 className="auth-title">Nueva contraseña</h1>

      {success ? (
        <div className="auth-alert" style={{ background: "rgba(34,197,94,0.12)", color: "#22c55e", borderColor: "#22c55e33" }}>
          <span>✓</span> Contraseña restablecida. Redirigiendo al login…
        </div>
      ) : (
        <>
          <p className="auth-subtitle">Elige una contraseña segura de al menos 8 caracteres.</p>

          {error && (
            <div className="auth-alert error">
              <span>⚠</span> {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label" htmlFor="newPassword">
                Nueva contraseña
              </label>
              <input
                id="newPassword"
                type="password"
                className="form-input"
                placeholder="••••••••"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                autoComplete="new-password"
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="confirm">
                Confirmar contraseña
              </label>
              <input
                id="confirm"
                type="password"
                className="form-input"
                placeholder="••••••••"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
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
              {loading ? "Guardando…" : "Establecer contraseña"}
            </button>
          </form>

          <div className="auth-link-row" style={{ marginTop: "24px" }}>
            <Link href="/auth/login">← Volver al login</Link>
          </div>
        </>
      )}
    </>
  );
}

export default function ResetPasswordPage() {
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

        <Suspense fallback={<p className="auth-subtitle">Cargando…</p>}>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  );
}
