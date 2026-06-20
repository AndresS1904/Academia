"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/contexts/AuthContext";

export default function AcaeNavbar() {
  const pathname = usePathname();
  const { user } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState("inicio");
  const [mounted, setMounted] = useState(false);

  const homeHref = "/acae/inicio";
  const sobreHref = "/acae/sobre-nosotros";
  const programasHref = "/acae/programas/pre-icfes";
  const isHome = pathname === homeHref;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (pathname === sobreHref) {
      setActiveSection("sobre-nosotros");
    } else if (pathname.startsWith("/acae/programas")) {
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
        if (el && window.scrollY >= el.offsetTop - 100) {
          setActiveSection(id);
        }
      }
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [pathname, isHome, sobreHref]);

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    if (href.startsWith("#")) {
      e.preventDefault();
      if (!isHome) {
        window.location.href = homeHref + href;
        return;
      }
      const target = document.querySelector(href);
      if (target) {
        const top = target.getBoundingClientRect().top + window.scrollY - 80;
        window.scrollTo({ top, behavior: "smooth" });
      }
      setMenuOpen(false);
    }
  };

  const navLinks = [
    { href: homeHref, label: "Inicio", id: "inicio" },
    { href: programasHref, label: "Programas", id: "programas" },
    { href: sobreHref, label: "Sobre Nosotros", id: "sobre-nosotros" },
  ];

  const dashboardHref = mounted && user
    ? user.role === "SUPER_ADMIN" ? "/admin"
    : user.role === "ADMIN" ? "/school-admin"
    : "/dashboard"
    : "/auth/login";

  return (
    <header className={`header${scrolled ? " scrolled" : ""}`}>
      <div className="header-bar" />
      <div className="header-inner">
        <Link href={homeHref} className="logo">
          <Image
            src="/logo-acae.jpeg"
            alt="Logo ACAE"
            width={44}
            height={44}
            style={{ borderRadius: "50%", objectFit: "cover", flexShrink: 0 }}
            priority
          />
          <div>
            <div className="logo-text">AC<span>AE</span></div>
            <div className="logo-sub">Ciencias Avanzadas</div>
          </div>
        </Link>

        <button className="menu-toggle" onClick={() => setMenuOpen(!menuOpen)} aria-label="Menú">
          <span /><span /><span />
        </button>

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
              <Link href={dashboardHref} className="nav-campus-btn">Campus Virtual</Link>
            </li>
            <li className="nav-cta">
              <a href="#programas" onClick={(e) => handleNavClick(e, "#programas")}>Inscribirme</a>
            </li>
          </ul>
        </nav>
      </div>
    </header>
  );
}
