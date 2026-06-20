"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/layout/Navbar";
import DashboardSidebar from "@/components/layout/DashboardSidebar";
import { api } from "@/lib/api";

export default function PerfilPage() {
  const { user, loading, logout, refreshUser } = useAuth();
  const router = useRouter();

  const BACKEND = "http://localhost:3001";

  /* ── Avatar ── */
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [avatarVersion, setAvatarVersion] = useState(Date.now());
  const [imgBroken, setImgBroken] = useState(false);

  // Resetear estado de imagen rota si cambia el avatar
  useEffect(() => { setImgBroken(false); }, [user?.avatar]);

  /* ── Info editable ── */
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [infoSaving, setInfoSaving] = useState(false);
  const [infoMsg, setInfoMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  /* ── Contraseña ── */
  const [currentPwd, setCurrentPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [pwdSaving, setPwdSaving] = useState(false);
  const [pwdMsg, setPwdMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [showPwd, setShowPwd] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.replace("/auth/login");
    if (!loading && user?.mustChangePassword) router.replace("/auth/change-password");
    if (!loading && user?.role === "ADMIN") router.replace("/admin");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, loading]);

  useEffect(() => {
    if (user) {
      setEmail(user.email);
      setPhone(user.phone ?? "");
    }
  }, [user]);

  if (loading) {
    return (
      <div className="sim-loading-screen">
        <div className="sim-loading-spinner" />
        <div className="sim-loading-text">Cargando perfil…</div>
      </div>
    );
  }

  if (!user) return null;

  const initial = (user.firstName[0] + user.lastName[0]).toUpperCase();
  const memberSince = user.createdAt
    ? new Date(user.createdAt).toLocaleDateString("es-CO", { year: "numeric", month: "long" })
    : "—";

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarUploading(true);
    setAvatarError(null);
    try {
      const form = new FormData();
      form.append("avatar", file);
      await api.upload("/auth/me/avatar", form);
      await refreshUser();
      setAvatarVersion(Date.now());
    } catch (err: any) {
      setAvatarError(err?.message ?? "Error al subir la imagen");
    } finally {
      setAvatarUploading(false);
      e.target.value = "";
    }
  }

  async function handleSaveInfo(e: React.FormEvent) {
    e.preventDefault();
    setInfoSaving(true);
    setInfoMsg(null);
    try {
      await api.patch("/auth/me", { email, phone: phone || null });
      await refreshUser();
      setInfoMsg({ type: "ok", text: "Información actualizada correctamente." });
    } catch (err: any) {
      setInfoMsg({ type: "err", text: err?.message ?? "Error al guardar los cambios." });
    } finally {
      setInfoSaving(false);
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPwd !== confirmPwd) {
      setPwdMsg({ type: "err", text: "Las contraseñas no coinciden." });
      return;
    }
    if (newPwd.length < 6) {
      setPwdMsg({ type: "err", text: "La nueva contraseña debe tener al menos 6 caracteres." });
      return;
    }
    setPwdSaving(true);
    setPwdMsg(null);
    try {
      await api.patch("/auth/me/password", { currentPassword: currentPwd, newPassword: newPwd });
      setPwdMsg({ type: "ok", text: "Contraseña actualizada correctamente." });
      setCurrentPwd(""); setNewPwd(""); setConfirmPwd("");
    } catch (err: any) {
      setPwdMsg({ type: "err", text: err?.message ?? "Error al cambiar la contraseña." });
    } finally {
      setPwdSaving(false);
    }
  }

  return (
    <>
      <Navbar />
      <div className="dashboard-layout">

        {/* ── Sidebar ── */}
        <DashboardSidebar />

        {/* ── Main ── */}
        <main className="dashboard-main prf-main">
          <div className="prf-inner">

          {/* ── Hero / cabecera de perfil ── */}
          <div className="prf-hero">
            {/* Zona de foto */}
            <div className="prf-photo-section">
              <div className="prf-avatar-wrap">
                {user.avatar && !imgBroken ? (
                  <img
                    src={`${BACKEND}${user.avatar}?v=${avatarVersion}`}
                    alt="Foto de perfil"
                    className="prf-avatar-img"
                    onError={() => setImgBroken(true)}
                  />
                ) : (
                  <div className="prf-avatar">{initial}</div>
                )}
                {avatarUploading && (
                  <div className="prf-avatar-uploading">
                    <div className="prf-avatar-spinner" />
                  </div>
                )}
              </div>
              <label className="prf-upload-btn">
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  style={{ display: "none" }}
                  onChange={handleAvatarChange}
                  disabled={avatarUploading}
                />
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="17 8 12 3 7 8"/>
                  <line x1="12" y1="3" x2="12" y2="15"/>
                </svg>
                {avatarUploading ? "Subiendo…" : user.avatar ? "Cambiar foto" : "Subir foto"}
              </label>
              {avatarError && <p className="prf-avatar-error">{avatarError}</p>}
              <p className="prf-photo-formats">JPG, PNG o WebP · máx. 4 MB</p>
            </div>

            {/* Info */}
            <div className="prf-hero-info">
              <h1 className="prf-hero-name">{user.firstName} {user.lastName}</h1>
              <span className="prf-role-badge">Estudiante</span>
              <p className="prf-hero-since">Miembro desde {memberSince}</p>
            </div>
          </div>

          <div className="prf-grid">

            {/* ── Datos de la cuenta (solo lectura) ── */}
            <div className="prf-card">
              <div className="prf-card-header">
                <div className="prf-card-icon prf-icon-blue">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                </div>
                <div className="prf-card-title">Datos de la cuenta</div>
              </div>
              <div className="prf-readonly-list">
                <div className="prf-readonly-row">
                  <span className="prf-readonly-label">Nombre</span>
                  <span className="prf-readonly-value">{user.firstName}</span>
                </div>
                <div className="prf-readonly-row">
                  <span className="prf-readonly-label">Apellido</span>
                  <span className="prf-readonly-value">{user.lastName}</span>
                </div>
                <div className="prf-readonly-row">
                  <span className="prf-readonly-label">Tipo de cuenta</span>
                  <span className="prf-readonly-value">
                    <span className="prf-role-pill">Estudiante</span>
                  </span>
                </div>
                <div className="prf-readonly-row">
                  <span className="prf-readonly-label">Miembro desde</span>
                  <span className="prf-readonly-value">{memberSince}</span>
                </div>
              </div>
              <p className="prf-readonly-note">El nombre no es modificable. Contacta al soporte si necesitas cambiarlo.</p>
            </div>

            {/* ── Información de contacto (editable) ── */}
            <div className="prf-card">
              <div className="prf-card-header">
                <div className="prf-card-icon prf-icon-indigo">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                </div>
                <div className="prf-card-title">Información de contacto</div>
              </div>
              <form className="prf-form" onSubmit={handleSaveInfo}>
                <div className="prf-field">
                  <label className="prf-label">Correo electrónico</label>
                  <input
                    className="prf-input"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="correo@ejemplo.com"
                    required
                  />
                </div>
                <div className="prf-field">
                  <label className="prf-label">Número de celular</label>
                  <input
                    className="prf-input"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+57 300 000 0000"
                  />
                </div>
                {infoMsg && (
                  <div className={`prf-msg ${infoMsg.type === "ok" ? "prf-msg-ok" : "prf-msg-err"}`}>
                    {infoMsg.text}
                  </div>
                )}
                <button className="prf-save-btn" type="submit" disabled={infoSaving}>
                  {infoSaving ? "Guardando…" : "Guardar cambios"}
                </button>
              </form>
            </div>

            {/* ── Cambiar contraseña ── */}
            <div className="prf-card prf-card-full">
              <div className="prf-card-header">
                <div className="prf-card-icon prf-icon-slate">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                </div>
                <div className="prf-card-title">Cambiar contraseña</div>
                <button
                  className="prf-toggle-pwd"
                  type="button"
                  onClick={() => setShowPwd((v) => !v)}
                >
                  {showPwd ? "Cancelar" : "Cambiar"}
                </button>
              </div>

              {showPwd && (
                <form className="prf-form prf-pwd-form" onSubmit={handleChangePassword}>
                  <div className="prf-pwd-fields">
                    <div className="prf-field">
                      <label className="prf-label">Contraseña actual</label>
                      <input
                        className="prf-input"
                        type="password"
                        value={currentPwd}
                        onChange={(e) => setCurrentPwd(e.target.value)}
                        placeholder="••••••••"
                        required
                      />
                    </div>
                    <div className="prf-field">
                      <label className="prf-label">Nueva contraseña</label>
                      <input
                        className="prf-input"
                        type="password"
                        value={newPwd}
                        onChange={(e) => setNewPwd(e.target.value)}
                        placeholder="Mín. 6 caracteres"
                        required
                      />
                    </div>
                    <div className="prf-field">
                      <label className="prf-label">Confirmar contraseña</label>
                      <input
                        className="prf-input"
                        type="password"
                        value={confirmPwd}
                        onChange={(e) => setConfirmPwd(e.target.value)}
                        placeholder="Repite la nueva contraseña"
                        required
                      />
                    </div>
                  </div>
                  {pwdMsg && (
                    <div className={`prf-msg ${pwdMsg.type === "ok" ? "prf-msg-ok" : "prf-msg-err"}`}>
                      {pwdMsg.text}
                    </div>
                  )}
                  <button className="prf-save-btn" type="submit" disabled={pwdSaving}>
                    {pwdSaving ? "Actualizando…" : "Actualizar contraseña"}
                  </button>
                </form>
              )}

              {!showPwd && (
                <p className="prf-pwd-hint">
                  Tu contraseña no se muestra por seguridad. Haz clic en "Cambiar" para actualizarla.
                </p>
              )}
            </div>

          </div>
          </div>{/* /prf-inner */}
        </main>
      </div>
    </>
  );
}
