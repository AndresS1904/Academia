"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";

interface Certificate {
  id: string; verificationCode: string; status: string; issuedAt?: string; finalScore?: number;
  classroom: { title: string; school: { name: string } };
  student: { firstName: string; lastName: string };
}

export default function CertificateVerificationPage() {
  const params = useParams();
  const code = params.code as string;
  const [cert, setCert] = useState<Certificate | null>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<Certificate>(`/classrooms/certificates/verify/${code}`)
      .then(setCert).catch(() => setError(true)).finally(() => setLoading(false));
  }, [code]);

  if (loading) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f8fafc" }}>
      <div style={{ color: "#94a3b8", fontSize: "1rem" }}>Verificando certificado…</div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <Link href="/" style={{ marginBottom: 32, fontFamily: "var(--font-poppins)", fontWeight: 800, fontSize: "1.4rem", color: "#004aad", textDecoration: "none" }}>Aprova</Link>

      {error ? (
        <div style={{ background: "#fff", borderRadius: 20, border: "2px solid #fee2e2", padding: "40px 48px", textAlign: "center", maxWidth: 480 }}>
          <div style={{ fontSize: "3rem", marginBottom: 12 }}>❌</div>
          <h2 style={{ fontFamily: "var(--font-poppins)", fontWeight: 800, color: "#dc2626", margin: "0 0 8px" }}>Certificado no válido</h2>
          <p style={{ color: "#64748b", fontSize: "0.875rem" }}>El código <code style={{ fontFamily: "monospace", background: "#f1f5f9", padding: "2px 6px", borderRadius: 4 }}>{code}</code> no corresponde a ningún certificado válido o ha sido revocado.</p>
        </div>
      ) : cert ? (
        <div style={{ background: "linear-gradient(135deg, #004aad 0%, #0066dd 100%)", borderRadius: 24, padding: "48px 52px", color: "#fff", textAlign: "center", maxWidth: 520, boxShadow: "0 16px 48px rgba(0,74,173,0.3)" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(255,255,255,0.2)", padding: "6px 16px", borderRadius: 20, marginBottom: 24 }}>
            <span style={{ fontSize: "0.8rem", fontWeight: 700, letterSpacing: "0.05em" }}>✅ CERTIFICADO VÁLIDO</span>
          </div>
          <div style={{ fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.2em", opacity: 0.7, marginBottom: 16 }}>CERTIFICADO DE FINALIZACIÓN</div>
          <div style={{ fontSize: "0.9rem", opacity: 0.8, marginBottom: 8 }}>Este certificado acredita que</div>
          <div style={{ fontSize: "2rem", fontWeight: 900, fontFamily: "var(--font-poppins)", marginBottom: 4 }}>{cert.student.firstName} {cert.student.lastName}</div>
          <div style={{ fontSize: "0.9rem", opacity: 0.8, marginBottom: 6 }}>completó satisfactoriamente el curso</div>
          <div style={{ fontSize: "1.3rem", fontWeight: 800, marginBottom: 6 }}>{cert.classroom.title}</div>
          <div style={{ fontSize: "0.82rem", opacity: 0.7, marginBottom: 24 }}>Institución: {cert.classroom.school.name}</div>
          {cert.finalScore != null && <div style={{ marginBottom: 20, fontSize: "1rem", fontWeight: 700 }}>Nota final: {cert.finalScore.toFixed(1)}%</div>}
          <div style={{ borderTop: "1px solid rgba(255,255,255,0.25)", paddingTop: 20, marginTop: 4 }}>
            <div style={{ fontSize: "0.68rem", opacity: 0.6, marginBottom: 6 }}>Código de verificación</div>
            <div style={{ fontFamily: "monospace", fontSize: "1rem", fontWeight: 700, letterSpacing: "0.15em", background: "rgba(255,255,255,0.15)", padding: "8px 16px", borderRadius: 10, display: "inline-block" }}>
              {cert.verificationCode}
            </div>
            {cert.issuedAt && <div style={{ fontSize: "0.7rem", opacity: 0.6, marginTop: 10 }}>Emitido el {new Date(cert.issuedAt).toLocaleDateString("es-CO", { day: "2-digit", month: "long", year: "numeric" })}</div>}
          </div>
        </div>
      ) : null}
    </div>
  );
}
