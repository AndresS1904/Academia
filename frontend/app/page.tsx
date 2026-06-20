export default function RootPage() {
  return (
    <div style={{ minHeight: "100vh", fontFamily: "sans-serif", background: "#f0f4ff" }}>

      {/* ── NAV ── */}
      <nav style={{
        background: "#004aad",
        padding: "0 32px",
        height: "64px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}>
        <div style={{ fontWeight: 900, fontSize: "1.2rem", color: "#fff", letterSpacing: "-0.5px" }}>
          Ap<span style={{ color: "#fc740c" }}>rova</span>
        </div>
        <a
          href="/auth/login"
          style={{
            background: "#fff",
            color: "#004aad",
            padding: "8px 20px",
            borderRadius: "100px",
            fontWeight: 700,
            fontSize: "0.9rem",
            textDecoration: "none",
          }}
        >
          Iniciar sesión
        </a>
      </nav>

      {/* ── HERO ── */}
      <section style={{
        background: "linear-gradient(135deg, #003380 0%, #004aad 60%, #0059d1 100%)",
        padding: "100px 24px 80px",
        textAlign: "center",
        position: "relative",
        overflow: "hidden",
      }}>
        {/* Orbe decorativo */}
        <div aria-hidden style={{
          position: "absolute", top: "-100px", right: "-100px",
          width: "500px", height: "500px", borderRadius: "50%",
          background: "radial-gradient(circle, rgba(255,255,255,0.06) 0%, transparent 70%)",
          pointerEvents: "none",
        }} />

        <div style={{ maxWidth: "720px", margin: "0 auto", position: "relative", zIndex: 1 }}>
          <div style={{
            display: "inline-block",
            background: "rgba(255,255,255,0.12)",
            border: "1px solid rgba(255,255,255,0.25)",
            borderRadius: "100px",
            padding: "6px 18px",
            fontSize: "0.8rem",
            fontWeight: 600,
            color: "#fff",
            marginBottom: "24px",
            letterSpacing: "0.5px",
          }}>
            Plataforma SaaS educativa
          </div>

          <h1 style={{
            fontSize: "clamp(2rem, 5vw, 3.2rem)",
            fontWeight: 900,
            color: "#fff",
            lineHeight: 1.15,
            marginBottom: "20px",
            margin: "0 0 20px",
          }}>
            La plataforma educativa para{" "}
            <span style={{ color: "#fc740c" }}>tu institución</span>
          </h1>

          <p style={{
            fontSize: "1.1rem",
            color: "rgba(255,255,255,0.85)",
            maxWidth: "560px",
            margin: "0 auto 40px",
            lineHeight: 1.7,
          }}>
            Gestiona cursos, simulacros y estudiantes en un solo lugar.
          </p>

          <div style={{ display: "flex", gap: "16px", justifyContent: "center", flexWrap: "wrap" }}>
            <a
              href="/auth/login"
              style={{
                background: "#fff",
                color: "#004aad",
                padding: "14px 32px",
                borderRadius: "100px",
                fontWeight: 700,
                fontSize: "1rem",
                textDecoration: "none",
              }}
            >
              Iniciar sesión
            </a>
            <a
              href="#contacto"
              style={{
                background: "rgba(255,255,255,0.12)",
                border: "1.5px solid rgba(255,255,255,0.4)",
                color: "#fff",
                padding: "14px 32px",
                borderRadius: "100px",
                fontWeight: 700,
                fontSize: "1rem",
                textDecoration: "none",
              }}
            >
              Ver demo
            </a>
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section style={{ padding: "80px 24px", background: "#f0f4ff" }}>
        <div style={{ maxWidth: "1000px", margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "52px" }}>
            <h2 style={{
              fontSize: "clamp(1.6rem, 3vw, 2.2rem)",
              fontWeight: 800,
              color: "#1e293b",
              margin: 0,
            }}>
              Todo lo que tu institución necesita
            </h2>
          </div>

          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: "24px",
          }}>
            {[
              {
                icon: "👥",
                title: "Gestión de estudiantes",
                desc: "Registra, organiza y da seguimiento a todos los estudiantes de tu institución desde un panel centralizado.",
                color: "#004aad",
              },
              {
                icon: "📋",
                title: "Simulacros ICFES",
                desc: "Crea y asigna simulacros con banco de preguntas propio. Genera resultados automáticos al instante.",
                color: "#7c3aed",
              },
              {
                icon: "🏫",
                title: "Multi-institución",
                desc: "Administra múltiples colegios desde una sola plataforma. Cada institución con su propio espacio y branding.",
                color: "#059669",
              },
            ].map((feat) => (
              <div
                key={feat.title}
                style={{
                  background: "#fff",
                  borderRadius: "20px",
                  padding: "36px 28px",
                  boxShadow: "0 4px 24px rgba(0,0,0,0.06)",
                  border: "1px solid #e2eaf7",
                }}
              >
                <div style={{
                  width: "56px", height: "56px",
                  borderRadius: "16px",
                  background: `${feat.color}18`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "1.8rem",
                  marginBottom: "20px",
                }}>
                  {feat.icon}
                </div>
                <div style={{ fontWeight: 700, fontSize: "1.1rem", color: "#1e293b", marginBottom: "10px" }}>
                  {feat.title}
                </div>
                <div style={{ fontSize: "0.92rem", color: "#64748b", lineHeight: 1.6 }}>
                  {feat.desc}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CONTACTO ── */}
      <section id="contacto" style={{ background: "#003380", padding: "72px 24px", textAlign: "center" }}>
        <div style={{ maxWidth: "600px", margin: "0 auto" }}>
          <h2 style={{
            fontSize: "clamp(1.5rem, 3vw, 2rem)",
            fontWeight: 800,
            color: "#fff",
            marginBottom: "16px",
          }}>
            ¿Tu institución quiere usar Aprova?
          </h2>
          <p style={{ color: "rgba(255,255,255,0.8)", fontSize: "1rem", marginBottom: "32px", lineHeight: 1.7 }}>
            Escríbenos y agendamos una demo personalizada para tu institución.
          </p>
          <a
            href="mailto:contacto@tucolegioWeb.com"
            style={{
              background: "#fc740c",
              color: "#fff",
              padding: "14px 36px",
              borderRadius: "100px",
              fontWeight: 700,
              fontSize: "1rem",
              textDecoration: "none",
              display: "inline-block",
            }}
          >
            Contactar ahora
          </a>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{
        background: "#1e293b",
        padding: "24px 32px",
        textAlign: "center",
        fontSize: "0.85rem",
        color: "rgba(255,255,255,0.5)",
      }}>
        Copyright {new Date().getFullYear()} <strong style={{ color: "rgba(255,255,255,0.8)" }}>Aprova</strong>. Todos los derechos reservados.
      </footer>

    </div>
  );
}
