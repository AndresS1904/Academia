"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { useSchool } from "@/contexts/SchoolContext";
import { mediaUrl } from "@/lib/api";

export default function Navbar({ slug }: { slug?: string }) {
  const pathname = usePathname();
  const { user } = useAuth();
  const { school, colors } = useSchool();

  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState("inicio");

  const effectiveSlug = slug ?? user?.school?.slug ?? null;
  const isAcae = effectiveSlug === "acae";
  const homeHref = effectiveSlug ? `/${effectiveSlug}/inicio` : "/";
  const sobreHref = effectiveSlug ? `/${effectiveSlug}/sobre-nosotros` : "/";
  const programasHref = isAcae ? `/${effectiveSlug}/programas/pre-icfes` : "#programas";
  const isHome = pathname === homeHref || pathname === `/${effectiveSlug}/inicio`;

  // En páginas públicas usa SchoolContext; en el dashboard usa user.school como fallback
  const effectiveSchool = school ?? user?.school ?? null;
  const schoolName = effectiveSchool?.name ?? "";
  const logoSrc = effectiveSchool?.logoUrl ? mediaUrl(effectiveSchool.logoUrl) : null;
  const initials = schoolName.split(" ").slice(0, 2).map(w => w[0]?.toUpperCase() ?? "").join("") || "?";

  useEffect(() => {
    if (pathname === sobreHref) {
      setActiveSection("sobre-nosotros");
    } else if (isAcae && effectiveSlug && pathname.includes("/programas")) {
      setActiveSection("programas");
    } else {
      setActiveSection("inicio");
    }

    const onScroll = () => {
      setScrolled(window.scrollY > 50);
      if (!isHome) return;
      const sections = ["inicio", "programas", "sobre-nosotros", "contacto"];
      for (const id of sections) {
        const el = document.getElementById(id);
        if (el && window.scrollY >= el.offsetTop - 100) setActiveSection(id);
      }
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [pathname, isHome, sobreHref]);

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    if (href.startsWith("#")) {
      e.preventDefault();
      if (!isHome) { window.location.href = homeHref + href; return; }
      const target = document.querySelector(href);
      if (target) {
        const top = target.getBoundingClientRect().top + window.scrollY - 80;
        window.scrollTo({ top, behavior: "smooth" });
      }
      setMenuOpen(false);
    }
  };

  const navLinks = [
    { href: effectiveSlug ? homeHref : "#inicio", label: "Inicio", id: "inicio" },
    { href: programasHref, label: "Programas", id: "programas" },
    { href: sobreHref, label: "Sobre Nosotros", id: "sobre-nosotros" },
  ];

  const dashboardHref = user
    ? user.role === "SUPER_ADMIN" ? "/admin"
    : user.role === "ADMIN" ? "/school-admin"
    : "/dashboard"
    : "/auth/login";

  return (
    <header className={`header${scrolled ? " scrolled" : ""}`}>
      <div className="header-bar" />
      <div className="header-inner">
        {/* Logo dinámico */}
        <Link href={homeHref} className="logo">
          {logoSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logoSrc}
              alt={`Logo ${schoolName}`}
              style={{ width: 44, height: 44, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }}
            />
          ) : (
            <div style={{
              width: 44, height: 44, borderRadius: "50%", flexShrink: 0,
              background: `linear-gradient(135deg, ${colors.primary}, ${colors.dark})`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "1rem", fontWeight: 900, color: "#fff", fontFamily: "var(--font-poppins)",
            }}>
              {initials}
            </div>
          )}
          <div>
            <div className="logo-text" style={{ color: colors.primary }}>
              {schoolName || (school === null && !user?.school ? <span style={{ opacity: 0.4 }}>Cargando…</span> : "")}
            </div>
            <div className="logo-sub">Campus Virtual</div>
          </div>
        </Link>

        {/* Mobile toggle */}
        <button className="menu-toggle" onClick={() => setMenuOpen(!menuOpen)} aria-label="Menú">
          <span /><span /><span />
        </button>

        {/* Navigation */}
        <nav className={`main-nav${menuOpen ? " open" : ""}`}>
          <ul>
            {navLinks.map((link) => (
              <li key={link.id} className={activeSection === link.id ? "nav-active" : ""}>
                <a href={link.href} onClick={(e) => handleNavClick(e, link.href)}>
                  {link.label}
                </a>
              </li>
            ))}
            <li>
              <Link href={dashboardHref} className="nav-campus-btn">
                Campus Virtual
              </Link>
            </li>
            <li className="nav-cta">
              <a href="#contacto" onClick={(e) => handleNavClick(e, "#contacto")}>
                Inscribirme
              </a>
            </li>
          </ul>
        </nav>
      </div>
    </header>
  );
}
