"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import AcaeNavbar from "@/components/layout/AcaeNavbar";
import AcaeFooter from "@/components/layout/AcaeFooter";
import { api } from "@/lib/api";

const MATERIAS = [
  { label: "Matemáticas",        score: 100, w: "100%" },
  { label: "Lectura Crítica",    score: 100, w: "100%" },
  { label: "Sociales",           score: 75,  w: "75%"  },
  { label: "Ciencias Naturales", score: 81,  w: "81%"  },
  { label: "Inglés",             score: 100, w: "100%" },
];

const RESULTADOS = [
  { score: 456, year: "2021" },
  { score: 442, year: "2025" },
  { score: 420, year: "2024" },
  { score: 406, year: "2025" },
  { score: 401, year: "2024" },
];

const PORQUE = [
  { icon: "⚡", titulo: "Método de Alto Rendimiento", desc: "Técnicas de estudio estratégico diseñadas para maximizar tu puntaje en el menor tiempo posible." },
  { icon: "🎯", titulo: "Resultados Medibles y Reales", desc: "310+ en ICFES y 350+ en admisión UdeA. Nuestros estudiantes logran metas concretas y verificables." },
  { icon: "🏆", titulo: "Preparación Enfocada ICFES y UdeA", desc: "Simulacros, banco de preguntas exclusivo y análisis de tendencias reales de las pruebas." },
  { icon: "👨‍🏫", titulo: "Docentes Especializados", desc: "Profesores certificados con experiencia comprobada en preparación para pruebas de estado." },
];

const PROGRAMAS = [
  {
    emoji: "📚", tag: "Más Popular", imgClass: "programa-img-1",
    titulo: "Pre ICFES",
    desc: "Preparación completa y estratégica para las Pruebas Saber 11, con simulacros reales, acompañamiento personalizado y docentes especializados.",
    features: ["Simulacros con preguntas reales", "Banco de preguntas exclusivo", "Seguimiento de avance individual", "Énfasis en ponderación por carrera", "Acompañamiento socio-ocupacional"],
    objetivo: "340+", labelTxt: "Puntaje objetivo",
    href: "/acae/programas/pre-icfes", available: true,
  },
  {
    emoji: "🎓", tag: "Alta Demanda", imgClass: "programa-img-2",
    titulo: "Pre UDEA",
    desc: "Formación especializada para el examen de admisión a la Universidad de Antioquia, con análisis de tendencias históricas y estrategia por área.",
    features: ["Análisis de tendencias del examen", "7 de cada 10 estudiantes ingresan", "Puntajes promedio +91", "Estrategia por área de conocimiento", "Acompañamiento hasta el resultado"],
    objetivo: "91+", labelTxt: "Puntaje objetivo",
    href: "#contacto", available: false,
  },
  {
    emoji: "⚡", tag: "Flexible", imgClass: "programa-img-3",
    titulo: "Cursos Especializados",
    desc: "Excel, inglés y educación financiera con horarios flexibles para complementar tu formación académica y profesional.",
    features: ["Clases avanzadas por módulos", "Horarios flexibles adaptados a ti", "Certificado de participación", "Impacto positivo en tu hoja de vida", "Modalidad presencial y virtual"],
    objetivo: "Flexible", labelTxt: "Modalidad",
    href: "#contacto", available: false,
  },
];

export default function AcaeInicioPage() {
  const [formName, setFormName] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formProgram, setFormProgram] = useState("Pre ICFES");
  const [formLoading, setFormLoading] = useState(false);
  const [formSent, setFormSent] = useState(false);
  const [formError, setFormError] = useState("");

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
      <AcaeNavbar />

      {/* ── HERO ─────────────────────────────────────────────── */}
      <section className="hero" id="inicio">
        <div className="hero-dots" />
        <div className="hero-orb hero-orb-1" />
        <div className="hero-orb hero-orb-2" />
        <div className="hero-orb hero-orb-3" />

        <div className="hero-container">
          <div className="hero-left">
            <h1>
              <span style={{ color: "var(--color-secondary)" }}>A</span>cademia de{" "}
              <span style={{ color: "var(--color-secondary)" }}>C</span>iencias{" "}
              <span style={{ color: "var(--color-secondary)" }}>A</span>vanzadas{" "}
              <span style={{ color: "var(--color-secondary)" }}>E</span>xactas
            </h1>
            <p className="hero-desc">
              Formación académica estratégica para las Pruebas Saber 11 y exámenes de admisión universitaria.
              Prepárate con los mejores docentes y metodología de alto rendimiento.
            </p>
            <div className="hero-btns">
              <a href="#programas" className="btn btn-naranja btn-lg">Ver programas</a>
              <Link href="/acae/sobre-nosotros" className="btn btn-blanco btn-lg">Conoce más sobre nosotros</Link>
            </div>
            <div className="hero-stats">
              <div><div className="hero-stat-num">340+</div><div className="hero-stat-lbl">Puntajes ICFES</div></div>
              <div><div className="hero-stat-num">91+</div><div className="hero-stat-lbl">Admisiones UdeA</div></div>
              <div><div className="hero-stat-num">98%</div><div className="hero-stat-lbl">Satisfacción</div></div>
            </div>
          </div>

          <div className="hero-right">
            <div className="hero-card hero-card-main">
              <h3>Mejores Puntajes de Materias ICFES</h3>
              <p>Resultados de nuestros estudiantes destacados</p>
              {MATERIAS.map((m) => (
                <div className="prog-mini" key={m.label}>
                  <div className="prog-mini-top"><span>{m.label}</span><span>{m.score}</span></div>
                  <div className="prog-mini-bar">
                    <div className="prog-mini-fill" style={{ "--w": m.w } as React.CSSProperties} />
                  </div>
                </div>
              ))}
            </div>
            <div className="hero-card hero-card-results">
              <h4>Mejor Resultado ACAE Saber 11</h4>
              {RESULTADOS.map((r) => (
                <div className="result-row" key={`${r.score}-${r.year}`}>
                  <span className="result-score">{r.score}</span>
                  <div className="result-bar-wrap">
                    <div className="result-bar-fill" style={{ width: `${(r.score / 500) * 100}%` }} />
                  </div>
                  <span className="result-year">{r.year}</span>
                </div>
              ))}
            </div>
            <div className="hero-card hero-card-badge">
              <div className="badge-icon">👨‍🏫</div>
              <div className="badge-text">Docentes especializados y certificados</div>
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
      <section className="stats-section">
        <div className="container">
          <div className="stats-grid">
            {[
              { num: "340+", sub: "Puntaje Promedio ICFES",   lbl: "Sobre 500 puntos" },
              { num: "456",  sub: "Nuestro Mejor ICFES ACAE", lbl: "Puntaje histórico" },
              { num: "98%",  sub: "Tasa de Satisfacción",     lbl: "Estudiantes satisfechos" },
              { num: "10+",  sub: "Años de Experiencia",      lbl: "Formando estudiantes" },
            ].map((s) => (
              <div className="stat-item" key={s.sub}>
                <span className="stat-num">{s.num}</span>
                <div className="stat-sub">{s.sub}</div>
                <div className="stat-lbl">{s.lbl}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── POR QUÉ ELEGIRNOS ────────────────────────────────── */}
      <section className="porque-section" id="porque">
        <div className="porque-orb porque-orb-1" />
        <div className="porque-orb porque-orb-2" />
        <div className="container">
          <div className="porque-inner">
            <div className="porque-left">
              <div className="section-label">Por qué elegirnos</div>
              <h2 className="section-title blanco">Formación Estratégica Para <span>Resultados Reales</span></h2>
              <div className="section-line" />
              <p className="section-sub blanco" style={{ marginBottom: "32px" }}>
                En ACAE no solo enseñamos — preparamos a cada estudiante con método, datos y acompañamiento
                para lograr el puntaje que necesita y entrar a la universidad que sueña.
              </p>
              <a href="#programas" className="btn btn-naranja">Conocer programas</a>
            </div>
            <div className="porque-right">
              {PORQUE.map((p) => (
                <div className="porque-card" key={p.titulo}>
                  <span className="porque-icon">{p.icon}</span>
                  <div className="porque-titulo">{p.titulo}</div>
                  <div className="porque-desc">{p.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── PROGRAMAS ────────────────────────────────────────── */}
      <section className="programas-section" id="programas">
        <div className="container">
          <div className="text-center">
            <div className="section-label">Nuestros programas</div>
            <h2 className="section-title">Elige tu camino <span>al éxito</span></h2>
            <div className="section-line centrado" />
            <p className="section-sub centrado">
              Metodología de alto rendimiento adaptada al objetivo de cada estudiante.
              Elige el programa que más se ajusta a tu meta.
            </p>
          </div>
          <div className="programas-grid">
            {PROGRAMAS.map((p) => (
              <div className="programa-card" key={p.titulo}>
                <div className={`programa-img ${p.imgClass}`}>
                  <span className="programa-img-emoji">{p.emoji}</span>
                  <span className="programa-tag">{p.tag}</span>
                </div>
                <div className="programa-body">
                  <div className="programa-titulo">{p.titulo}</div>
                  <p className="programa-desc">{p.desc}</p>
                  <ul className="programa-features">
                    {p.features.map((f) => <li key={f}>{f}</li>)}
                  </ul>
                </div>
                <div className="programa-footer">
                  <div className="programa-label">{p.labelTxt}: <span>{p.objetivo}</span></div>
                  {p.available ? (
                    <Link href={p.href} className="btn btn-azul btn-sm">Ver más →</Link>
                  ) : (
                    <span className="btn btn-sm" style={{ background: "#e2e8f0", color: "#94a3b8", cursor: "not-allowed", border: "none" }}>
                      Próximamente
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA BANNER ───────────────────────────────────────── */}
      <section className="cta-section" id="contacto">
        <div className="cta-inner">
          <div className="cta-left">
            <h2>Tu Futuro Profesional Comienza Con Una Decisión Hoy.</h2>
            <p>
              Únete a los cientos de estudiantes que confiaron en ACAE y lograron ingresar
              a la universidad de sus sueños. El momento es ahora.
            </p>
            <div className="cta-btns">
              <a href="#inscripcion" className="btn-cta-blanco">Empezar mi preparación</a>
              <a href="#programas" className="btn-cta-ghost">Ver programas</a>
            </div>
          </div>
          <div className="cta-right">
            <div className="cta-illustration">
              <Image
                src="/logo-acae.jpeg"
                alt="Logo ACAE"
                width={200}
                height={200}
                style={{ borderRadius: "50%", objectFit: "cover", boxShadow: "0 16px 48px rgba(0,0,0,0.25)" }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* ── FORMULARIO INSCRIPCIÓN ───────────────────────────── */}
      <section id="inscripcion" style={{ background: "#f0f4ff", padding: "80px 24px" }}>
        <div style={{ maxWidth: "560px", margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "40px" }}>
            <div className="section-label">Inscríbete</div>
            <h2 className="section-title">¿Quieres <span>unirte?</span></h2>
            <div className="section-line centrado" />
            <p className="section-sub centrado">
              Déjanos tus datos y te contactamos por WhatsApp para contarte todo sobre el programa.
            </p>
          </div>
          <div style={{ background: "#fff", borderRadius: "24px", padding: "40px", boxShadow: "0 4px 24px rgba(0,74,173,0.08)", border: "1px solid #e2eaf7" }}>
            {formSent ? (
              <div style={{ textAlign: "center", padding: "20px 0" }}>
                <div style={{ fontSize: "3rem", marginBottom: "16px" }}>🎉</div>
                <div style={{ fontFamily: "var(--font-poppins)", fontWeight: 700, fontSize: "1.15rem", color: "#166534" }}>
                  ¡Recibido! Te contactaremos pronto por WhatsApp.
                </div>
              </div>
            ) : (
              <form onSubmit={handleLeadSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, color: "#1e293b", marginBottom: "6px" }}>Nombre completo</label>
                  <input type="text" value={formName} onChange={e => setFormName(e.target.value)} placeholder="Ej: Juan García" disabled={formLoading}
                    style={{ width: "100%", padding: "13px 16px", borderRadius: "12px", border: "1.5px solid #e2eaf7", fontSize: "0.95rem", outline: "none", boxSizing: "border-box", color: "#1e293b" }} />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, color: "#1e293b", marginBottom: "6px" }}>Número de WhatsApp</label>
                  <input type="tel" value={formPhone} onChange={e => setFormPhone(e.target.value)} placeholder="Ej: 300 123 4567" disabled={formLoading}
                    style={{ width: "100%", padding: "13px 16px", borderRadius: "12px", border: "1.5px solid #e2eaf7", fontSize: "0.95rem", outline: "none", boxSizing: "border-box", color: "#1e293b" }} />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, color: "#1e293b", marginBottom: "6px" }}>Programa de interés</label>
                  <select value={formProgram} onChange={e => setFormProgram(e.target.value)} disabled={formLoading}
                    style={{ width: "100%", padding: "13px 16px", borderRadius: "12px", border: "1.5px solid #e2eaf7", fontSize: "0.95rem", outline: "none", boxSizing: "border-box", color: "#1e293b", background: "#fff" }}>
                    <option value="Pre ICFES">Pre ICFES</option>
                    <option value="Pre UdeA">Pre UdeA</option>
                    <option value="Cursos Especializados">Cursos Especializados</option>
                  </select>
                </div>
                {formError && (
                  <div style={{ background: "#fef2f2", border: "1.5px solid #fca5a5", borderRadius: "10px", padding: "10px 14px", fontSize: "0.88rem", color: "#991b1b" }}>⚠️ {formError}</div>
                )}
                <button type="submit" disabled={formLoading}
                  style={{ width: "100%", padding: "14px", borderRadius: "12px", border: "none", background: "#004aad", color: "#fff", fontFamily: "var(--font-poppins)", fontWeight: 800, fontSize: "1rem", cursor: formLoading ? "not-allowed" : "pointer", opacity: formLoading ? 0.7 : 1, marginTop: "4px" }}>
                  {formLoading ? "Enviando…" : "Enviar solicitud"}
                </button>
              </form>
            )}
          </div>
        </div>
      </section>

      <AcaeFooter />

      <a href="https://wa.me/573154616531?text=Hola%2C%20me%20interesa%20conocer%20m%C3%A1s%20sobre%20los%20programas%20de%20ACAE.%20%C2%BFMe%20pueden%20dar%20m%C3%A1s%20informaci%C3%B3n%3F"
        className="float-wa" target="_blank" rel="noopener noreferrer" aria-label="WhatsApp">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
        </svg>
        <span className="float-wa-label">Escríbenos por WhatsApp</span>
      </a>
    </>
  );
}
