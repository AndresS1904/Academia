"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { useSchool } from "@/contexts/SchoolContext";
import { api, mediaUrl } from "@/lib/api";

export default function SchoolInicioPage() {
  const params = useParams();
  const slug = (params?.slug as string) ?? "";
  const { school, colors, loading } = useSchool();

  const [formName, setFormName] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formProgram, setFormProgram] = useState("");
  const [formLoading, setFormLoading] = useState(false);
  const [formSent, setFormSent] = useState(false);
  const [formError, setFormError] = useState("");

  const pc = school?.pageContent;
  const schoolName = school?.name ?? "";

  const heroTitulo = pc?.hero?.titulo || schoolName;
  const heroSub = pc?.hero?.subtitulo || "Formación académica estratégica para alcanzar tus metas. Prepárate con los mejores docentes y metodología de alto rendimiento.";

  const heroStats = [
    { num: pc?.hero?.stat1 || "", lbl: pc?.hero?.stat1lbl || "" },
    { num: pc?.hero?.stat2 || "", lbl: pc?.hero?.stat2lbl || "" },
    { num: pc?.hero?.stat3 || "", lbl: pc?.hero?.stat3lbl || "" },
  ].filter(s => s.num);

  const programas = (pc?.programas ?? []).filter(p => p.activo !== false);
  const galeria = pc?.galeria ?? [];

  const contacto = pc?.contacto;
  const whatsappNum = contacto?.whatsapp ?? "";
  const whatsappMsg = contacto?.whatsappMsg ?? `Hola, me interesa conocer más sobre los programas de ${schoolName}.`;
  const whatsappUrl = whatsappNum ? `https://wa.me/${whatsappNum}?text=${encodeURIComponent(whatsappMsg)}` : null;

  async function handleLeadSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formName.trim() || !formPhone.trim()) { setFormError("Por favor completa todos los campos."); return; }
    setFormLoading(true);
    setFormError("");
    try {
      await api.post("/leads", { name: formName.trim(), phone: formPhone.trim(), program: formProgram });
      setFormSent(true);
    } catch {
      setFormError("Hubo un error al enviar. Intenta de nuevo.");
    } finally {
      setFormLoading(false);
    }
  }

  return (
    <>
      <Navbar slug={slug} />

      {/* ── HERO ─────────────────────────────────────────────── */}
      <section className="hero" id="inicio">
        <div className="hero-dots" />
        <div className="hero-orb hero-orb-1" />
        <div className="hero-orb hero-orb-2" />
        <div className="hero-orb hero-orb-3" />

        <div className="hero-container">
          <div className="hero-left">
            {loading ? (
              <div style={{ height: 120, background: "rgba(255,255,255,0.08)", borderRadius: 16, marginBottom: 24 }} />
            ) : (
              <h1>{heroTitulo}</h1>
            )}
            <p className="hero-desc">{heroSub}</p>
            <div className="hero-btns">
              <a href="#programas" className="btn btn-naranja btn-lg">Ver programas</a>
              <Link href={`/${slug}/sobre-nosotros`} className="btn btn-blanco btn-lg">Conoce más</Link>
            </div>
            {heroStats.length > 0 && (
              <div className="hero-stats">
                {heroStats.map((s) => (
                  <div key={s.lbl}>
                    <div className="hero-stat-num">{s.num}</div>
                    <div className="hero-stat-lbl">{s.lbl}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* RIGHT: Card con logo + stats */}
          <div className="hero-right">
            <div className="hero-card hero-card-main">
              {school?.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={mediaUrl(school.logoUrl)!}
                  alt={`Logo ${schoolName}`}
                  style={{ width: 120, height: 120, borderRadius: "50%", objectFit: "cover", margin: "0 auto 16px", display: "block", boxShadow: "0 8px 24px rgba(0,0,0,0.25)" }}
                />
              ) : (
                <div style={{
                  width: 100, height: 100, borderRadius: "50%", margin: "0 auto 16px",
                  background: `linear-gradient(135deg, rgba(255,255,255,0.2), rgba(255,255,255,0.05))`,
                  border: "2px solid rgba(255,255,255,0.3)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "2.2rem", fontWeight: 900, color: "#fff", fontFamily: "var(--font-poppins)",
                }}>
                  {schoolName.split(" ").slice(0, 2).map(w => w[0]?.toUpperCase() ?? "").join("") || "?"}
                </div>
              )}
              <h3 style={{ textAlign: "center", marginBottom: 8 }}>{schoolName}</h3>
              {heroStats.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "12px" }}>
                  {heroStats.map((s) => (
                    <div key={s.lbl} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", background: "rgba(255,255,255,0.08)", borderRadius: "10px" }}>
                      <span style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.85)" }}>{s.lbl}</span>
                      <span style={{ fontSize: "1.2rem", fontWeight: 800, color: colors.secondary }}>{s.num}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="hero-card hero-card-badge">
              <div className="badge-icon">🏆</div>
              <div className="badge-text">Formación académica de alto rendimiento</div>
            </div>
          </div>
        </div>

        <div className="hero-bottom-wave">
          <svg viewBox="0 0 1440 80" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M0,40 C360,80 720,0 1080,40 C1260,60 1380,30 1440,40 L1440,80 L0,80 Z" fill="#f0f4ff" />
          </svg>
        </div>
      </section>

      {/* ── STATS ────────────────────────────────────────────── */}
      {heroStats.length > 0 && (
        <section className="stats-section">
          <div className="container">
            <div className="stats-grid">
              {[
                ...heroStats.map(s => ({ num: s.num, sub: s.lbl, lbl: "" })),
                { num: "100%", sub: "Compromiso Académico", lbl: `Equipo ${schoolName}` },
              ].map((s) => (
                <div className="stat-item" key={s.sub}>
                  <span className="stat-num">{s.num}</span>
                  <div className="stat-sub">{s.sub}</div>
                  {s.lbl && <div className="stat-lbl">{s.lbl}</div>}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── PROGRAMAS ────────────────────────────────────────── */}
      <section className="programas-section" id="programas" style={{ background: "#f0f4ff" }}>
        <div className="container">
          <div className="text-center">
            <div className="section-label">Nuestros programas</div>
            <h2 className="section-title">Elige tu camino <span>al éxito</span></h2>
            <div className="section-line centrado" />
            <p className="section-sub centrado">
              Metodología de alto rendimiento adaptada al objetivo de cada estudiante.
            </p>
          </div>

          {programas.length === 0 ? (
            <div style={{ textAlign: "center", padding: "48px 0", color: "#94a3b8" }}>
              <div style={{ fontSize: "2.5rem", marginBottom: 12 }}>📋</div>
              <div style={{ fontWeight: 600 }}>Programas próximamente</div>
            </div>
          ) : (
            <div className="programas-grid">
              {programas.map((p, i) => (
                <div className="programa-card" key={p.id ?? i}>
                  <div
                    className="programa-img"
                    style={{ background: `linear-gradient(135deg, ${colors.primary}ee, ${colors.dark})` }}
                  >
                    <span className="programa-img-emoji">{p.emoji}</span>
                    {p.tag && <span className="programa-tag">{p.tag}</span>}
                  </div>
                  <div className="programa-body">
                    <div className="programa-titulo">{p.titulo}</div>
                    <p className="programa-desc">{p.descripcion}</p>
                  </div>
                  <div className="programa-footer">
                    {p.objetivo && (
                      <div className="programa-label">Objetivo: <span>{p.objetivo}</span></div>
                    )}
                    <a href="#contacto" className="btn btn-azul btn-sm">Más información</a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── SOBRE NOSOTROS PREVIEW ───────────────────────────── */}
      {pc?.sobreNosotros?.contenido && (
        <section className="porque-section" id="sobre">
          <div className="porque-orb porque-orb-1" />
          <div className="porque-orb porque-orb-2" />
          <div className="container">
            <div className="porque-inner">
              <div className="porque-left">
                <div className="section-label">Quiénes somos</div>
                <h2 className="section-title blanco">
                  {pc.sobreNosotros.titulo || "Sobre Nosotros"}
                </h2>
                <div className="section-line" />
                <p className="section-sub blanco" style={{ marginBottom: "32px" }}>
                  {pc.sobreNosotros.mision ?? pc.sobreNosotros.contenido}
                </p>
                <Link href={`/${slug}/sobre-nosotros`} className="btn btn-naranja">
                  Conocer más →
                </Link>
              </div>
              <div className="porque-right" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
                {galeria.length > 0 ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={mediaUrl(galeria[0].url) ?? galeria[0].url}
                    alt={galeria[0].caption ?? schoolName}
                    style={{ width: "100%", maxWidth: 400, borderRadius: 20, objectFit: "cover", height: 280, boxShadow: "0 16px 48px rgba(0,0,0,0.3)" }}
                  />
                ) : (
                  <div style={{ width: 300, height: 280, borderRadius: 20, background: "rgba(255,255,255,0.08)", border: "2px dashed rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(255,255,255,0.4)", fontSize: "3rem" }}>
                    🏛
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── GALERÍA ──────────────────────────────────────────── */}
      {galeria.length > 0 && (
        <section style={{ background: "#fff", padding: "80px 24px" }}>
          <div className="container">
            <div className="text-center" style={{ marginBottom: 48 }}>
              <div className="section-label">Nuestra institución</div>
              <h2 className="section-title">Galería <span>de imágenes</span></h2>
              <div className="section-line centrado" />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 16 }}>
              {galeria.map((img, i) => (
                <div key={i} style={{ borderRadius: 16, overflow: "hidden", boxShadow: "0 4px 16px rgba(0,0,0,0.1)", position: "relative" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={mediaUrl(img.url) ?? img.url}
                    alt={img.caption ?? `Imagen ${i + 1}`}
                    style={{ width: "100%", height: 220, objectFit: "cover", display: "block" }}
                  />
                  {img.caption && (
                    <div style={{ padding: "10px 14px", background: "#fff", fontSize: "0.82rem", color: "#475569", fontWeight: 600 }}>
                      {img.caption}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── CONTACTO / INSCRIPCIÓN ───────────────────────────── */}
      <section id="contacto" style={{ background: "#f0f4ff", padding: "80px 24px" }}>
        <div style={{ maxWidth: "1100px", margin: "0 auto", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 48, alignItems: "start" }}>

          {/* Formulario */}
          <div>
            <div className="section-label">Inscríbete</div>
            <h2 className="section-title">¿Quieres <span>unirte?</span></h2>
            <div className="section-line" style={{ marginBottom: 32 }} />
            <div style={{ background: "#fff", borderRadius: 24, padding: 36, boxShadow: "0 4px 24px rgba(0,74,173,0.08)", border: "1px solid #e2eaf7" }}>
              {formSent ? (
                <div style={{ textAlign: "center", padding: "20px 0" }}>
                  <div style={{ fontSize: "3rem", marginBottom: 16 }}>🎉</div>
                  <div style={{ fontFamily: "var(--font-poppins)", fontWeight: 700, fontSize: "1.1rem", color: "#166534" }}>
                    ¡Recibido! Te contactaremos pronto.
                  </div>
                </div>
              ) : (
                <form onSubmit={handleLeadSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  <div>
                    <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, color: "#1e293b", marginBottom: 6 }}>Nombre completo</label>
                    <input type="text" value={formName} onChange={e => setFormName(e.target.value)} placeholder="Ej: Juan García" disabled={formLoading}
                      style={{ width: "100%", padding: "13px 16px", borderRadius: 12, border: "1.5px solid #e2eaf7", fontSize: "0.95rem", outline: "none", boxSizing: "border-box", color: "#1e293b" }} />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, color: "#1e293b", marginBottom: 6 }}>WhatsApp</label>
                    <input type="tel" value={formPhone} onChange={e => setFormPhone(e.target.value)} placeholder="Ej: 300 123 4567" disabled={formLoading}
                      style={{ width: "100%", padding: "13px 16px", borderRadius: 12, border: "1.5px solid #e2eaf7", fontSize: "0.95rem", outline: "none", boxSizing: "border-box", color: "#1e293b" }} />
                  </div>
                  {programas.length > 0 && (
                    <div>
                      <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, color: "#1e293b", marginBottom: 6 }}>Programa de interés</label>
                      <select value={formProgram} onChange={e => setFormProgram(e.target.value)} disabled={formLoading}
                        style={{ width: "100%", padding: "13px 16px", borderRadius: 12, border: "1.5px solid #e2eaf7", fontSize: "0.95rem", outline: "none", boxSizing: "border-box", color: "#1e293b", background: "#fff" }}>
                        <option value="">— Selecciona —</option>
                        {programas.map((p, i) => <option key={i} value={p.titulo}>{p.titulo}</option>)}
                      </select>
                    </div>
                  )}
                  {formError && (
                    <div style={{ background: "#fef2f2", border: "1.5px solid #fca5a5", borderRadius: 10, padding: "10px 14px", fontSize: "0.88rem", color: "#991b1b" }}>⚠️ {formError}</div>
                  )}
                  <button type="submit" disabled={formLoading}
                    style={{ width: "100%", padding: 14, borderRadius: 12, border: "none", background: colors.primary, color: "#fff", fontFamily: "var(--font-poppins)", fontWeight: 800, fontSize: "1rem", cursor: formLoading ? "not-allowed" : "pointer", opacity: formLoading ? 0.7 : 1 }}>
                    {formLoading ? "Enviando…" : "Enviar solicitud"}
                  </button>
                </form>
              )}
            </div>
          </div>

          {/* Contacto directo */}
          <div>
            <div className="section-label">Contáctanos</div>
            <h2 className="section-title">Estamos <span>para ayudarte</span></h2>
            <div className="section-line" style={{ marginBottom: 32 }} />
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {whatsappUrl && (
                <a href={whatsappUrl} target="_blank" rel="noopener noreferrer"
                  style={{ display: "flex", alignItems: "center", gap: 16, padding: "20px 24px", background: "#fff", borderRadius: 16, border: "1px solid #e2eaf7", textDecoration: "none", boxShadow: "0 2px 8px rgba(0,0,0,0.06)", transition: "transform 0.2s" }}>
                  <div style={{ width: 52, height: 52, borderRadius: "50%", background: "#dcfce7", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.5rem", flexShrink: 0 }}>💬</div>
                  <div>
                    <div style={{ fontWeight: 700, color: "#1e293b", marginBottom: 2 }}>WhatsApp</div>
                    <div style={{ fontSize: "0.85rem", color: "#64748b" }}>+{whatsappNum}</div>
                  </div>
                </a>
              )}
              {contacto?.instagram && (
                <a href={contacto.instagram} target="_blank" rel="noopener noreferrer"
                  style={{ display: "flex", alignItems: "center", gap: 16, padding: "20px 24px", background: "#fff", borderRadius: 16, border: "1px solid #e2eaf7", textDecoration: "none", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
                  <div style={{ width: 52, height: 52, borderRadius: "50%", background: "#fce7f3", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.5rem", flexShrink: 0 }}>📸</div>
                  <div>
                    <div style={{ fontWeight: 700, color: "#1e293b", marginBottom: 2 }}>Instagram</div>
                    <div style={{ fontSize: "0.85rem", color: "#64748b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 220 }}>{contacto.instagram}</div>
                  </div>
                </a>
              )}
              {contacto?.facebook && (
                <a href={contacto.facebook} target="_blank" rel="noopener noreferrer"
                  style={{ display: "flex", alignItems: "center", gap: 16, padding: "20px 24px", background: "#fff", borderRadius: 16, border: "1px solid #e2eaf7", textDecoration: "none", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
                  <div style={{ width: 52, height: 52, borderRadius: "50%", background: "#eff6ff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.5rem", flexShrink: 0 }}>👥</div>
                  <div>
                    <div style={{ fontWeight: 700, color: "#1e293b", marginBottom: 2 }}>Facebook</div>
                    <div style={{ fontSize: "0.85rem", color: "#64748b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 220 }}>{contacto.facebook}</div>
                  </div>
                </a>
              )}
              <div style={{ padding: "20px 24px", background: `linear-gradient(135deg, ${colors.primary}, ${colors.dark})`, borderRadius: 16, color: "#fff", textAlign: "center" }}>
                <div style={{ fontSize: "0.9rem", marginBottom: 12, opacity: 0.9 }}>¿Ya tienes cuenta?</div>
                <a href="/auth/login" style={{ display: "inline-block", padding: "10px 28px", background: "rgba(255,255,255,0.15)", border: "2px solid rgba(255,255,255,0.4)", borderRadius: 50, color: "#fff", fontWeight: 700, textDecoration: "none", fontSize: "0.9rem" }}>
                  Entrar al Campus Virtual →
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer slug={slug} />

      {/* WhatsApp flotante */}
      {whatsappUrl && (
        <a href={whatsappUrl} className="float-wa" target="_blank" rel="noopener noreferrer" aria-label="WhatsApp"
          style={{ background: colors.primary }}>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
          </svg>
          <span className="float-wa-label">Escríbenos</span>
        </a>
      )}
    </>
  );
}
