"use client";

import type { CSSProperties } from "react";
import { useState } from "react";
import Link from "next/link";
import AcaeNavbar from "@/components/layout/AcaeNavbar";
import AcaeFooter from "@/components/layout/AcaeFooter";
import { api } from "@/lib/api";

const INCLUYE_PRESENCIAL = [
  { icon: "🎥", texto: "Clases sincrónicas todas las semanas" },
  { icon: "📅", texto: "Acompañamiento hasta una semana antes del ICFES" },
  { icon: "📝", texto: "Hasta 4 simulacros tipo ICFES" },
  { icon: "📊", texto: "Retroalimentación para identificar fortalezas y aspectos por mejorar" },
  { icon: "📚", texto: "Material semanal: guías, ejercicios y tips" },
  { icon: "📲", texto: "Acceso a plataforma virtual 24/7" },
  { icon: "🎮", texto: "Clases y refuerzos a través de Kick" },
  { icon: "🔍", texto: "Preguntas reales y tipo ICFES" },
  { icon: "🔥", texto: "Profes especializados en todas las áreas" },
  { icon: "🗂️", texto: "Material cargado y organizado en plataforma" },
  { icon: "😌", texto: "Charlas para manejo del estrés" },
  { icon: "🎓", texto: "Orientación vocacional para elegir carrera" },
];

const INCLUYE_INTENSIVO = [
  { icon: "🎥", texto: "Clases sincrónicas todos los días" },
  { icon: "📅", texto: "Acompañamiento durante el mes completo de preparación" },
  { icon: "📝", texto: "Hasta 4 simulacros tipo ICFES" },
  { icon: "📊", texto: "Retroalimentación para identificar fortalezas y aspectos por mejorar" },
  { icon: "📚", texto: "Material diario: guías, ejercicios y tips" },
  { icon: "📲", texto: "Acceso a plataforma virtual 24/7" },
  { icon: "🎮", texto: "Clases y refuerzos a través de Kick" },
  { icon: "🔍", texto: "Preguntas reales y tipo ICFES" },
  { icon: "🔥", texto: "Profes especializados en todas las áreas" },
  { icon: "🗂️", texto: "Material cargado y organizado en plataforma" },
  { icon: "😌", texto: "Charlas para manejo del estrés" },
  { icon: "🎓", texto: "Orientación vocacional para elegir carrera" },
];

const AREAS = [
  { icon: "➕", nombre: "Matemáticas",          color: "#004aad", bg: "#dbeafe" },
  { icon: "📖", nombre: "Lectura Crítica",       color: "#7c3aed", bg: "#ede9fe" },
  { icon: "🧪", nombre: "Ciencias Naturales",    color: "#059669", bg: "#d1fae5" },
  { icon: "🌎", nombre: "Sociales y Ciudadanas", color: "#d97706", bg: "#fef3c7" },
  { icon: "💬", nombre: "Inglés",               color: "#dc2626", bg: "#fee2e2" },
];

const BENEFICIOS = [
  { icon: "🎯", titulo: "Preparación con método", desc: "Estrategia y enfoque real en resultados desde el primer día." },
  { icon: "🧭", titulo: "Estudio guiado",          desc: "Acompañamiento durante todo el proceso, sin dejarte solo." },
  { icon: "📈", titulo: "Práctica constante",       desc: "Simulacros y ejercicios tipo prueba para ganar velocidad y precisión." },
  { icon: "🔎", titulo: "Seguimiento personalizado",desc: "Sabemos en qué mejorar y trabajamos exactamente ahí." },
  { icon: "💪", titulo: "Seguridad y confianza",    desc: "Llega al examen preparado, tranquilo y con la mente clara." },
  { icon: "⏰", titulo: "Acceso flexible",          desc: "Contenido disponible en cualquier momento desde cualquier dispositivo." },
];

const POR_QUE = [
  {
    icon: "✅",
    titulo: "Método y estrategia",
    desc: "Cada clase, ejercicio y simulacro tiene un propósito claro dentro de un plan diseñado para tu puntaje.",
  },
  {
    icon: "👨‍🏫",
    titulo: "Profes especializados",
    desc: "Contamos con docentes preparados en cada área del ICFES, no generalistas.",
  },
  {
    icon: "📊",
    titulo: "Teoría + Práctica + Retroalimentación",
    desc: "No solo enseñamos — combinamos contenido, ejercitación y análisis de resultados.",
  },
  {
    icon: "🎯",
    titulo: "Acompañamiento de principio a fin",
    desc: "Desde la primera clase hasta una semana antes del examen, siempre tendrás apoyo.",
  },
  {
    icon: "🚫",
    titulo: "Sin improvisación",
    desc: "Aquí todo está planeado: tiempos, contenidos, simulacros y refuerzos.",
  },
];

type Modalidad = "presencial" | "intensivo";

export default function PreICFESPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [modalidad, setModalidad] = useState<Modalidad>("presencial");
  const [transitioning, setTransitioning] = useState(false);

  function switchModalidad(mode: Modalidad) {
    if (mode === modalidad) return;
    setTransitioning(true);
    setTimeout(() => {
      setModalidad(mode);
      setTransitioning(false);
    }, 180);
  }

  const INCLUYE = modalidad === "presencial" ? INCLUYE_PRESENCIAL : INCLUYE_INTENSIVO;

  return (
    <>
      <AcaeNavbar />

      <main className="prog-page">

        {/* ══ HERO ══════════════════════════════════════════════ */}
        <section className="prog-hero">
          <div className="prog-hero-bg" aria-hidden />
          <div className="prog-hero-content">
            <div className="prog-hero-tag">Programa estrella</div>
            <h1 className="prog-hero-titulo">
              Pre<span>ICFES</span> ACAE
            </h1>
            <p className="prog-hero-desc">
              Prepárate para las Pruebas Saber 11 con una metodología organizada,
              acompañamiento constante y estrategias reales para obtener un mejor
              resultado.
            </p>

            {/* Stats rápidos */}
            <div className="prog-hero-stats">
              <div className="prog-hero-stat">
                <div className="prog-hero-stat-num">4</div>
                <div className="prog-hero-stat-label">Simulacros ICFES</div>
              </div>
              <div className="prog-hero-stat">
                <div className="prog-hero-stat-num">5</div>
                <div className="prog-hero-stat-label">Áreas evaluadas</div>
              </div>
              <div className="prog-hero-stat">
                <div className="prog-hero-stat-num">24/7</div>
                <div className="prog-hero-stat-label">Plataforma virtual</div>
              </div>
              <div className="prog-hero-stat">
                <div className="prog-hero-stat-num">340+</div>
                <div className="prog-hero-stat-label">Puntaje objetivo</div>
              </div>
            </div>

            <div className="prog-hero-ctas">
              <button
                className="prog-cta-primary"
                onClick={() => setModalOpen(true)}
              >
                Quiero inscribirme
              </button>
            </div>
          </div>

          {/* Deco flotante */}
          <div className="prog-hero-deco" aria-hidden>📝</div>
          <div className="prog-hero-deco2" aria-hidden>🧠</div>
        </section>

        {/* ══ QUÉ INCLUYE ════════════════════════════════════════ */}
        <section className="prog-section" id="incluye">
          <div className="prog-container">
            <div className="prog-section-header">
              <div className="prog-section-tag">Contenido del programa</div>
              <h2 className="prog-section-titulo">¿Qué incluye nuestro PreICFES?</h2>
              <p className="prog-section-sub">
                Todo lo que necesitas para llegar preparado al examen, sin que te falte nada.
              </p>
            </div>

            {/* ── Toggle modalidad ── */}
            <div className="prog-modalidad-toggle">
              <button
                className={`prog-modalidad-btn${modalidad === "presencial" ? " prog-modalidad-active" : ""}`}
                onClick={() => switchModalidad("presencial")}
              >
                Pre ICFES Presencial
              </button>
              <button
                className={`prog-modalidad-btn${modalidad === "intensivo" ? " prog-modalidad-active" : ""}`}
                onClick={() => switchModalidad("intensivo")}
              >
                Pre ICFES Intensivo
              </button>
            </div>

            <div
              className="prog-incluye-grid"
              style={{
                opacity: transitioning ? 0 : 1,
                transform: transitioning ? "translateY(10px)" : "translateY(0)",
                transition: "opacity 0.18s ease, transform 0.18s ease",
              }}
            >
              {INCLUYE.map((item, i) => (
                <div key={i} className="prog-incluye-item" style={{ animationDelay: `${i * 0.05}s` }}>
                  <div className="prog-incluye-icon">{item.icon}</div>
                  <div className="prog-incluye-texto">{item.texto}</div>
                  <div className="prog-incluye-check" aria-hidden>✓</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ══ ÁREAS ══════════════════════════════════════════════ */}
        <section className="prog-section prog-section-alt">
          <div className="prog-container">
            <div className="prog-section-header">
              <div className="prog-section-tag">Cobertura académica</div>
              <h2 className="prog-section-titulo">Áreas que trabajamos</h2>
              <p className="prog-section-sub">
                Cubrimos las 5 pruebas del ICFES Saber 11 con docentes especializados en cada una.
              </p>
            </div>

            <div className="prog-areas-grid">
              {AREAS.map((area, i) => (
                <div
                  key={i}
                  className="prog-area-card"
                  style={{
                    "--area-color": area.color,
                    "--area-bg": area.bg,
                    animationDelay: `${i * 0.08}s`,
                  } as CSSProperties}
                >
                  <div className="prog-area-icon">{area.icon}</div>
                  <div className="prog-area-nombre">{area.nombre}</div>
                  <div className="prog-area-bar" />
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ══ BENEFICIOS ═════════════════════════════════════════ */}
        <section className="prog-section">
          <div className="prog-container">
            <div className="prog-section-header">
              <div className="prog-section-tag">¿Por qué vale la pena?</div>
              <h2 className="prog-section-titulo">Beneficios del curso</h2>
              <p className="prog-section-sub">
                Más que una preparación, es una transformación en la forma de estudiar y presentar exámenes.
              </p>
            </div>

            <div className="prog-beneficios-grid">
              {BENEFICIOS.map((b, i) => (
                <div key={i} className="prog-beneficio-card" style={{ animationDelay: `${i * 0.07}s` }}>
                  <div className="prog-beneficio-icon">{b.icon}</div>
                  <div className="prog-beneficio-body">
                    <div className="prog-beneficio-titulo">{b.titulo}</div>
                    <div className="prog-beneficio-desc">{b.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ══ POR QUÉ ACAE ═══════════════════════════════════════ */}
        <section className="prog-section prog-section-dark">
          <div className="prog-container">
            <div className="prog-section-header prog-section-header-dark">
              <div className="prog-section-tag prog-tag-light">Nuestra diferencia</div>
              <h2 className="prog-section-titulo prog-titulo-light">¿Por qué elegir ACAE?</h2>
              <p className="prog-section-sub prog-sub-light">
                No somos un curso más. Somos el acompañamiento que necesitas para llegar seguro al examen.
              </p>
            </div>

            <div className="prog-porque-cards">
              {POR_QUE.map((item, i) => (
                <div
                  key={i}
                  className="prog-porque-card"
                  data-num={String(i + 1).padStart(2, "0")}
                  style={{ animationDelay: `${i * 0.1}s` } as CSSProperties}
                >
                  <div className="prog-porque-card-top">
                    <div className="prog-porque-card-icon">{item.icon}</div>
                    <div className="prog-porque-card-num">{String(i + 1).padStart(2, "0")}</div>
                  </div>
                  <div className="prog-porque-card-titulo">{item.titulo}</div>
                  <div className="prog-porque-card-desc">{item.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ══ CTA FINAL ══════════════════════════════════════════ */}
        <section className="prog-cta-section" id="contacto-prog">
          <div className="prog-container">
            <div className="prog-cta-card">
              {/* Decos de fondo */}
              <div className="prog-cta-bg-circle1" aria-hidden />
              <div className="prog-cta-bg-circle2" aria-hidden />

              {/* Columna izquierda: logo + texto */}
              <div className="prog-cta-left">
                <img src="/logo-acae.jpeg" alt="Logo ACAE" className="prog-cta-logo" />
                <div>
                  <h2 className="prog-cta-titulo">¿Listo para mejorar tu puntaje?</h2>
                  <p className="prog-cta-desc">
                    Únete a los estudiantes que ya se están preparando con ACAE.
                    Inscríbete ahora y empieza con el pie derecho. 💪
                  </p>
                </div>
              </div>

              {/* Columna derecha: botón */}
              <div className="prog-cta-right">
                <a
                  href="https://wa.me/573154616531?text=Hola%2C%20quiero%20información%20sobre%20el%20PreICFES%20ACAE"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="prog-cta-wa"
                >
                  <svg className="prog-cta-wa-icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                  </svg>
                  Escribir por WhatsApp
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* ══ VOLVER ═════════════════════════════════════════════ */}
        <div className="prog-volver">
          <Link href="/acae/inicio#programas" className="prog-volver-btn">
            ← Ver todos los programas
          </Link>
        </div>

      </main>

      {/* ══ MODAL ══════════════════════════════════════════════ */}
      {modalOpen && (
        <InscripcionModal onClose={() => setModalOpen(false)} />
      )}

      <AcaeFooter />
    </>
  );
}

/* ─── Modal de inscripción ─────────────────────────────────── */
function InscripcionModal({ onClose }: { onClose: () => void }) {
  const [name, setName]     = useState("");
  const [phone, setPhone]   = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent]     = useState(false);
  const [error, setError]   = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) {
      setError("Por favor completa todos los campos.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await api.post("/leads", { name: name.trim(), phone: phone.trim(), program: "PreICFES" });
      setSent(true);
    } catch {
      setError("Hubo un error al enviar. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="lead-modal-overlay" onClick={onClose}>
      <div className="lead-modal" onClick={(e) => e.stopPropagation()}>
        <button className="lead-modal-close" onClick={onClose} aria-label="Cerrar">✕</button>

        {sent ? (
          <div className="lead-modal-success">
            <div className="lead-modal-success-icon">🎉</div>
            <h3 className="lead-modal-success-title">¡Listo!</h3>
            <p className="lead-modal-success-desc">
              Recibimos tu solicitud. Un asesor de ACAE se pondrá en contacto contigo pronto.
            </p>
            <button className="lead-modal-submit" onClick={onClose}>
              Cerrar
            </button>
          </div>
        ) : (
          <>
            <div className="lead-modal-header">
              <div className="lead-modal-emoji">🚀</div>
              <h3 className="lead-modal-title">Quiero inscribirme</h3>
              <p className="lead-modal-subtitle">
                Déjanos tu nombre y número y te contactamos para darte toda la información.
              </p>
            </div>

            <form className="lead-modal-form" onSubmit={handleSubmit}>
              <div className="lead-modal-field">
                <label className="lead-modal-label">Nombre completo</label>
                <input
                  className="lead-modal-input"
                  type="text"
                  placeholder="Ej: Juan García"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={loading}
                />
              </div>
              <div className="lead-modal-field">
                <label className="lead-modal-label">Número de teléfono</label>
                <input
                  className="lead-modal-input"
                  type="tel"
                  placeholder="Ej: 300 123 4567"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  disabled={loading}
                />
              </div>
              {error && <div className="lead-modal-error">⚠️ {error}</div>}
              <button
                className="lead-modal-submit"
                type="submit"
                disabled={loading}
              >
                {loading ? "Enviando…" : "Enviar solicitud"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
