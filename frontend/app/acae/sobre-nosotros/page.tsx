"use client";

import { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import AcaeNavbar from "@/components/layout/AcaeNavbar";
import AcaeFooter from "@/components/layout/AcaeFooter";

const topScores = [
  { score: 456, year: "2021", medal: "🥇", label: "Mejor puntaje histórico ACAE" },
  { score: 442, year: "2025", medal: "🥈", label: "Segundo mejor puntaje ACAE" },
  { score: 420, year: "2024", medal: "🥉", label: "Tercer mejor puntaje ACAE" },
];

const testimonios = [
  { text: "ACAE cambió mi perspectiva académica por completo. Gracias a su metodología logré un puntaje de 387 en el ICFES y pude ingresar a la Universidad de Antioquia. Los docentes son increíbles y siempre están dispuestos a ayudar.", name: "Valentina Ríos", detail: "Pre ICFES 2024 · Puntaje 387", initial: "V", color: "linear-gradient(135deg, #004aad, #0059d1)" },
  { text: "El programa Pre UdeA es exactamente lo que necesitaba. La preparación es muy específica y los simulacros me ayudaron a manejar el tiempo en el examen real. Hoy soy estudiante de Ingeniería de Sistemas en la UdeA.", name: "Sebastián Morales", detail: "Pre UDEA 2024 · Ingeniería Sistemas", initial: "S", color: "linear-gradient(135deg, #d95e00, #fc740c)" },
  { text: "Lo que más me gustó fue el acompañamiento personalizado. Los profesores conocen a fondo las pruebas y te enseñan a pensar estratégicamente. Definitivamente ACAE es la mejor inversión que hice para mi futuro.", name: "María Camila López", detail: "Cursos Especializados · Puntaje 401", initial: "M", color: "linear-gradient(135deg, #003380, #004aad)" },
  { text: "Vine sin saber nada de estrategia para el examen y salí con un puntaje de 442. El método de ACAE es diferente a todo lo que había visto antes. Super recomendado para cualquier estudiante que quiera ingresar a la universidad.", name: "Andrés Felipe Gómez", detail: "Pre ICFES 2025 · Puntaje 442", initial: "A", color: "linear-gradient(135deg, #16a34a, #22c55e)" },
];

const gallerySlides = [
  { src: "/galeria-new-1.jpeg" },
  { src: "/galeria-new-2.jpeg" },
  { src: "/galeria-new-3.jpeg" },
  { src: "/galeria-new-4.jpeg" },
  { src: "/galeria-new-5.jpeg" },
  { src: "/galeria-new-6.jpeg" },
  { src: "/galeria-new-7.jpeg" },
];

function GalleryCarousel() {
  const [current, setCurrent] = useState(0);
  const total = gallerySlides.length;
  const prev = useCallback(() => setCurrent((c) => (c - 1 + total) % total), [total]);
  const next = useCallback(() => setCurrent((c) => (c + 1) % total), [total]);

  useEffect(() => {
    const id = setInterval(next, 5000);
    return () => clearInterval(id);
  }, [next]);

  return (
    <div className="gallery-wrapper">
      <div className="gallery-track-outer">
        <div className="gallery-track" style={{ transform: `translateX(-${current * 100}%)` }}>
          {gallerySlides.map((slide, i) => (
            <div key={i} className="gallery-slide">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={slide.src} alt={`Galería ACAE ${i + 1}`} className="gallery-slide-img" />
            </div>
          ))}
        </div>
      </div>
      <button className="gallery-btn gallery-btn-prev" onClick={prev} aria-label="Anterior">‹</button>
      <button className="gallery-btn gallery-btn-next" onClick={next} aria-label="Siguiente">›</button>
      <div className="gallery-dots">
        {gallerySlides.map((_, i) => (
          <button key={i} className={`gallery-dot${current === i ? " active" : ""}`} onClick={() => setCurrent(i)} aria-label={`Slide ${i + 1}`} />
        ))}
      </div>
    </div>
  );
}

export default function AcaeSobreNosotros() {
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && e.target.classList.add("visible")),
      { threshold: 0.1, rootMargin: "0px 0px -50px 0px" }
    );
    document.querySelectorAll(".reveal, .reveal-left, .reveal-right").forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <AcaeNavbar />

      {/* ── Page Hero ── */}
      <section className="page-hero">
        <div className="page-hero-orb page-hero-orb-1" />
        <div className="page-hero-orb page-hero-orb-2" />
        <div className="page-hero-inner">
          <div className="page-hero-label">Academia ACAE</div>
          <h1>Sobre <span>Nosotros</span></h1>
          <p>Conoce nuestra historia, misión, visión y el equipo que ha transformado el futuro académico de cientos de estudiantes en Colombia.</p>
        </div>
        <div className="page-hero-wave">
          <svg viewBox="0 0 1440 80" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M0,40 C360,80 720,0 1080,40 C1260,60 1380,30 1440,40 L1440,80 L0,80 Z" fill="#ffffff" />
          </svg>
        </div>
      </section>

      {/* ── Quiénes Somos ── */}
      <section className="quienes-section">
        <div className="quienes-inner">
          <div className="quienes-left reveal-left">
            <div className="section-label">Nuestra historia</div>
            <h2 className="section-title">¿Quiénes <span>somos?</span></h2>
            <div className="section-line" />
            <p>La Academia de Ciencias Avanzadas Exactas es una institución educativa dedicada a la formación académica y humana de estudiantes de educación media y universitaria. Nos especializamos en la preparación para las Pruebas Saber 11 (Pre-ICFES) y exámenes de admisión universitaria, fortaleciendo las competencias en ciencias exactas y los hábitos de estudio.</p>
            <br />
            <p>Acompañamos a nuestros estudiantes con una metodología clara, cercana y estratégica, ayudándolos a alcanzar sus metas académicas y a dar un paso firme hacia su futuro profesional.</p>
            <br />
            <div style={{ display: "flex", gap: "20px", flexWrap: "wrap", marginTop: "8px" }}>
              {[{ num: "10+", label: "Años de experiencia" }, { num: "98%", label: "Satisfacción" }, { num: "456", label: "Mejor puntaje" }].map((s) => (
                <div key={s.label} style={{ textAlign: "center" }}>
                  <div style={{ fontFamily: "var(--font-poppins)", fontSize: "1.8rem", fontWeight: 900, color: "#004aad" }}>{s.num}</div>
                  <div style={{ fontSize: "0.78rem", color: "#94a3b8", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px" }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="quienes-visual reveal-right">
            <div className="q-orbit q-orbit-1" />
            <div className="q-orbit q-orbit-2" />
            <div className="q-orbit q-orbit-3" />
            <span className="q-dot q-dot-blue"  style={{ top: "10%",  left: "14%" }} />
            <span className="q-dot q-dot-orange" style={{ top: "14%",  right: "10%" }} />
            <span className="q-dot q-dot-blue"  style={{ bottom: "12%", left: "10%" }} />
            <span className="q-dot q-dot-orange" style={{ bottom: "10%", right: "14%" }} />
            <span className="q-dot q-dot-sm"    style={{ top: "38%",  left: "4%" }} />
            <span className="q-dot q-dot-sm"    style={{ top: "42%",  right: "4%" }} />
            <div className="q-glow" />
            <div className="quienes-logo-wrap">
              <Image src="/logo-acae.jpeg" alt="Logo ACAE" width={280} height={280}
                style={{ borderRadius: "50%", objectFit: "cover", display: "block", boxShadow: "0 16px 48px rgba(0,74,173,0.3), 0 4px 16px rgba(0,0,0,0.15)" }} priority />
            </div>
          </div>
        </div>
      </section>

      {/* ── Misión & Visión ── */}
      <section className="mv-section">
        <div className="container">
          <div className="text-center reveal" style={{ marginBottom: "52px" }}>
            <div className="section-label">Nuestros pilares</div>
            <h2 className="section-title">Misión y <span>Visión</span></h2>
            <div className="section-line centrado" />
          </div>
          <div className="mv-grid">
            <div className="mv-card mision reveal delay-1">
              <span className="mv-icon">🎯</span>
              <div className="mv-title">Misión</div>
              <div className="mv-text">Preparar de manera integral y estratégica a estudiantes de educación secundaria para las Pruebas Saber 11 (PreICFES), fortaleciendo su formación en ciencias exactas y complementándola con cursos en Excel, inglés y educación financiera, brindándoles las herramientas académicas y prácticas necesarias para acceder a la educación superior y desenvolverse con éxito en su vida académica y profesional.</div>
            </div>
            <div className="mv-card vision reveal delay-2">
              <span className="mv-icon">🌟</span>
              <div className="mv-title">Visión</div>
              <div className="mv-text">Ser una academia líder a nivel regional y nacional en la preparación para las Pruebas Saber 11 (PreICFES) y la formación integral en ciencias exactas, destacándonos por la calidad académica, la innovación educativa y la incorporación de programas complementarios como Excel, inglés y educación financiera, impactando positivamente el proyecto de vida de nuestros estudiantes y su acceso a la educación superior.</div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Galería ── */}
      <section className="gallery-section">
        <div className="container">
          <div className="text-center reveal">
            <div className="section-label">Nuestra academia</div>
            <h2 className="section-title">Galería <span>ACAE</span></h2>
            <div className="section-line centrado" />
            <p className="section-sub centrado">Un vistazo a nuestras instalaciones, clases y momentos especiales.</p>
          </div>
          <GalleryCarousel />
        </div>
      </section>

      {/* ── Top Puntajes ── */}
      <section className="top-scores-section">
        <div className="top-scores-inner">
          <div className="text-center reveal">
            <div className="section-label" style={{ color: "#fc740c" }}>Nuestros logros</div>
            <h2 className="section-title blanco">Top 3 Mejores Puntajes <span>ICFES en ACAE</span></h2>
            <div className="section-line centrado" />
            <p className="section-sub centrado blanco">Resultados reales de estudiantes que confiaron en nuestra metodología. Puntaje de 0 a 500.</p>
          </div>
          <div className="top-scores-grid">
            {topScores.map((s, i) => (
              <div className="top-score-card reveal" key={i}>
                <span className="top-score-medal">{s.medal}</span>
                <span className="top-score-num">{s.score}</span>
                <div className="top-score-year">Saber 11 · {s.year}</div>
                <div className="top-score-label">{s.label}</div>
                <div className="top-score-bar-wrap">
                  <div className="top-score-bar" style={{ width: `${(s.score / 500) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Testimonios ── */}
      <section className="testimonios-section">
        <div className="container">
          <div className="text-center reveal">
            <div className="section-label">Lo que dicen</div>
            <h2 className="section-title">Referencias de <span>nuestros estudiantes</span></h2>
            <div className="section-line centrado" />
            <p className="section-sub centrado">La mejor prueba de nuestro trabajo son los resultados y las palabras de quienes vivieron la experiencia ACAE.</p>
          </div>
          <div className="testimonios-grid">
            {testimonios.map((t, i) => (
              <div className={`testimonio-card reveal delay-${(i % 4) + 1}`} key={i}>
                <span className="testimonio-quote">&ldquo;</span>
                <p className="testimonio-text">{t.text}</p>
                <div className="testimonio-author">
                  <div className="testimonio-avatar" style={{ background: t.color, color: "#fff" }}>{t.initial}</div>
                  <div>
                    <div className="testimonio-name">{t.name}</div>
                    <div className="testimonio-detail">{t.detail}</div>
                    <div className="testimonio-stars">★★★★★</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <AcaeFooter />

      <a href="https://wa.me/573154616531?text=Hola%2C%20me%20interesa%20conocer%20m%C3%A1s%20sobre%20los%20programas%20de%20ACAE.%20%C2%BFMe%20pueden%20dar%20m%C3%A1s%20informaci%C3%B3n%3F"
        className="float-wa" target="_blank" rel="noopener noreferrer" aria-label="WhatsApp">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="24" height="24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
        <span className="float-wa-label">Escríbenos por WhatsApp</span>
      </a>
    </>
  );
}
