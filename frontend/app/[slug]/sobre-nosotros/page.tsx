"use client";

import { useEffect } from "react";
import { useParams } from "next/navigation";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { useSchool } from "@/contexts/SchoolContext";
import { mediaUrl } from "@/lib/api";

function GalleryGrid({ images }: { images: { url: string; caption?: string }[] }) {
  if (images.length === 0) return null;
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 16 }}>
      {images.map((img, i) => (
        <div key={i} style={{ borderRadius: 16, overflow: "hidden", boxShadow: "0 4px 16px rgba(0,0,0,0.1)" }}>
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
  );
}

export default function SobreNosotrosPage() {
  const params = useParams();
  const slug = (params?.slug as string) ?? "";
  const { school, colors } = useSchool();

  const schoolName = school?.name ?? "";
  const pc = school?.pageContent;
  const sobre = pc?.sobreNosotros;
  const galeria = pc?.galeria ?? [];
  const contacto = pc?.contacto;

  const whatsappUrl = contacto?.whatsapp
    ? `https://wa.me/${contacto.whatsapp}?text=${encodeURIComponent(contacto.whatsappMsg ?? `Hola, me interesa ${schoolName}.`)}`
    : null;

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => entries.forEach(e => e.isIntersecting && e.target.classList.add("visible")),
      { threshold: 0.1, rootMargin: "0px 0px -50px 0px" }
    );
    document.querySelectorAll(".reveal, .reveal-left, .reveal-right").forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <Navbar slug={slug} />

      {/* ── PAGE HERO ── */}
      <section className="page-hero">
        <div className="page-hero-orb page-hero-orb-1" />
        <div className="page-hero-orb page-hero-orb-2" />
        <div className="page-hero-inner">
          <div className="page-hero-label">{schoolName}</div>
          <h1>Sobre <span>Nosotros</span></h1>
          <p>{sobre?.titulo ?? "Conoce nuestra historia, misión, visión y el equipo detrás de nuestra institución."}</p>
        </div>
        <div className="page-hero-wave">
          <svg viewBox="0 0 1440 80" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M0,40 C360,80 720,0 1080,40 C1260,60 1380,30 1440,40 L1440,80 L0,80 Z" fill="#ffffff" />
          </svg>
        </div>
      </section>

      {/* ── QUIÉNES SOMOS ── */}
      <section className="quienes-section">
        <div className="quienes-inner">
          <div className="quienes-left reveal-left">
            <div className="section-label">Nuestra historia</div>
            <h2 className="section-title">¿Quiénes <span>somos?</span></h2>
            <div className="section-line" />
            {sobre?.contenido ? (
              <p style={{ whiteSpace: "pre-line" }}>{sobre.contenido}</p>
            ) : (
              <p style={{ color: "#94a3b8" }}>
                {schoolName} es una institución educativa dedicada a la formación académica de alto rendimiento.
                Nuestro equipo de docentes especializados prepara a cada estudiante con método, datos y acompañamiento
                personalizado para lograr sus metas.
              </p>
            )}
          </div>
          <div className="quienes-visual reveal-right">
            {galeria.length > 0 ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={mediaUrl(galeria[0].url) ?? galeria[0].url}
                alt={galeria[0].caption ?? schoolName}
                style={{ width: "100%", maxWidth: 320, height: 320, borderRadius: "50%", objectFit: "cover", display: "block", margin: "0 auto", boxShadow: "0 16px 48px rgba(0,74,173,0.3)" }}
              />
            ) : (
              <>
                <div className="q-orbit q-orbit-1" />
                <div className="q-orbit q-orbit-2" />
                <div className="q-glow" />
                <div className="quienes-logo-wrap">
                  <div style={{
                    width: 200, height: 200, borderRadius: "50%",
                    background: `linear-gradient(135deg, ${colors.primary}, ${colors.dark})`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: "3.5rem", fontWeight: 900, color: "#fff", fontFamily: "var(--font-poppins)",
                    boxShadow: "0 16px 48px rgba(0,74,173,0.3)",
                  }}>
                    {schoolName.split(" ").slice(0, 2).map(w => w[0]?.toUpperCase() ?? "").join("") || "?"}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </section>

      {/* ── MISIÓN & VISIÓN ── */}
      {(sobre?.mision || sobre?.vision) && (
        <section className="mv-section">
          <div className="container">
            <div className="text-center reveal" style={{ marginBottom: 52 }}>
              <div className="section-label">Nuestros pilares</div>
              <h2 className="section-title">Misión y <span>Visión</span></h2>
              <div className="section-line centrado" />
            </div>
            <div className="mv-grid">
              {sobre.mision && (
                <div className="mv-card mision reveal delay-1">
                  <span className="mv-icon">🎯</span>
                  <div className="mv-title">Misión</div>
                  <div className="mv-text" style={{ whiteSpace: "pre-line" }}>{sobre.mision}</div>
                </div>
              )}
              {sobre.vision && (
                <div className="mv-card vision reveal delay-2">
                  <span className="mv-icon">🌟</span>
                  <div className="mv-title">Visión</div>
                  <div className="mv-text" style={{ whiteSpace: "pre-line" }}>{sobre.vision}</div>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* ── GALERÍA ── */}
      {galeria.length > 0 && (
        <section className="gallery-section">
          <div className="container">
            <div className="text-center reveal" style={{ marginBottom: 40 }}>
              <div className="section-label">Nuestra institución</div>
              <h2 className="section-title">Galería <span>de imágenes</span></h2>
              <div className="section-line centrado" />
            </div>
            <GalleryGrid images={galeria} />
          </div>
        </section>
      )}

      {/* ── CONTACTO ── */}
      {(whatsappUrl || contacto?.instagram || contacto?.facebook) && (
        <section style={{ background: `linear-gradient(135deg, ${colors.dark}, ${colors.primary})`, padding: "80px 24px" }}>
          <div style={{ maxWidth: 600, margin: "0 auto", textAlign: "center" }}>
            <div style={{ fontSize: "0.78rem", fontWeight: 700, color: colors.secondary, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12 }}>Contáctanos</div>
            <h2 style={{ fontFamily: "var(--font-poppins)", fontWeight: 800, fontSize: "2rem", color: "#fff", marginBottom: 8 }}>
              ¿Tienes alguna pregunta?
            </h2>
            <p style={{ color: "rgba(255,255,255,0.75)", marginBottom: 40 }}>
              Estamos aquí para ayudarte. Escríbenos por WhatsApp o síguenos en redes.
            </p>
            <div style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap" }}>
              {whatsappUrl && (
                <a href={whatsappUrl} target="_blank" rel="noopener noreferrer"
                  style={{ display: "inline-flex", alignItems: "center", gap: 10, padding: "14px 28px", background: "#25d366", borderRadius: 50, color: "#fff", fontWeight: 700, textDecoration: "none" }}>
                  💬 WhatsApp
                </a>
              )}
              {contacto?.instagram && (
                <a href={contacto.instagram} target="_blank" rel="noopener noreferrer"
                  style={{ display: "inline-flex", alignItems: "center", gap: 10, padding: "14px 28px", background: "rgba(255,255,255,0.15)", border: "2px solid rgba(255,255,255,0.3)", borderRadius: 50, color: "#fff", fontWeight: 700, textDecoration: "none" }}>
                  📸 Instagram
                </a>
              )}
              {contacto?.facebook && (
                <a href={contacto.facebook} target="_blank" rel="noopener noreferrer"
                  style={{ display: "inline-flex", alignItems: "center", gap: 10, padding: "14px 28px", background: "rgba(255,255,255,0.15)", border: "2px solid rgba(255,255,255,0.3)", borderRadius: 50, color: "#fff", fontWeight: 700, textDecoration: "none" }}>
                  👥 Facebook
                </a>
              )}
            </div>
          </div>
        </section>
      )}

      <Footer slug={slug} />

      {whatsappUrl && (
        <a href={whatsappUrl} className="float-wa" target="_blank" rel="noopener noreferrer" aria-label="WhatsApp"
          style={{ background: colors.primary }}>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
          </svg>
          <span className="float-wa-label">WhatsApp</span>
        </a>
      )}
    </>
  );
}
