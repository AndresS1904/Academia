"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import SchoolAdminSidebar from "@/components/school-admin/SchoolAdminSidebar";

interface License {
  id: string;
  status: "ACTIVE" | "EXPIRED" | "CANCELLED" | "PENDING";
  startsAt: string;
  endsAt: string | null;
  pricePaid: number | null;
  currency: string;
  notes: string | null;
  product: { name: string; type: string; description: string | null };
  grantedBy: { firstName: string; lastName: string } | null;
}

const formatPrice = (v: number | null) =>
  v == null ? "—" : new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(v);

const formatDate = (d: string | null) =>
  d ? new Date(d).toLocaleDateString("es-CO", { day: "numeric", month: "short", year: "numeric" }) : "Perpetua";

const statusColors: Record<string, { bg: string; color: string; label: string }> = {
  ACTIVE: { bg: "#dcfce7", color: "#16a34a", label: "Activa" },
  EXPIRED: { bg: "#fef2f2", color: "#dc2626", label: "Expirada" },
  CANCELLED: { bg: "#f1f5f9", color: "#64748b", label: "Cancelada" },
  PENDING: { bg: "#fef3c7", color: "#92400e", label: "Pendiente" },
};

const typeLabel: Record<string, string> = {
  COURSE: "📚 Curso",
  SIMULACRO: "📋 Simulacro",
  QUESTION_BANK: "🧠 Banco preguntas",
  BUNDLE: "📦 Paquete",
};

export default function SchoolLicenciasPage() {
  const { user } = useAuth();
  const [licenses, setLicenses] = useState<License[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    api.get<License[]>("/licenses/my-school")
      .then(setLicenses)
      .finally(() => setLoading(false));
  }, [user]);

  const active = licenses.filter(l => l.status === "ACTIVE");
  const expired = licenses.filter(l => l.status === "EXPIRED");
  const others = licenses.filter(l => l.status !== "ACTIVE" && l.status !== "EXPIRED");

  const now = new Date();
  const expiringSoon = active.filter(l => l.endsAt && new Date(l.endsAt) < new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000));

  return (
    <div style={{ minHeight: "100vh", background: "#f0f4ff" }}>
      <SchoolAdminSidebar />
      <main style={{ marginLeft: 260, padding: "32px 36px", minHeight: "100vh", boxSizing: "border-box" }}>

        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 800, color: "#1e293b", margin: 0 }}>Mis licencias</h1>
          <p style={{ color: "#64748b", fontSize: "0.875rem", margin: "4px 0 0" }}>
            Contenido premium al que tiene acceso tu colegio.
          </p>
        </div>

        {loading ? (
          <div style={{ padding: "80px 0", textAlign: "center", color: "#64748b" }}>⏳ Cargando licencias…</div>
        ) : (
          <>
            {/* Stats */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginBottom: 24 }}>
              {[
                { label: "Activas", value: active.length, color: "#16a34a", bg: "#f0fdf4" },
                { label: "Expiradas", value: expired.length, color: "#dc2626", bg: "#fef2f2" },
                { label: "Por vencer (30d)", value: expiringSoon.length, color: "#92400e", bg: "#fffbeb" },
              ].map(stat => (
                <div key={stat.label} style={{ background: stat.bg, borderRadius: 14, border: "1px solid #e2eaf7", padding: "18px 22px" }}>
                  <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 4 }}>{stat.label}</div>
                  <div style={{ fontSize: "2rem", fontWeight: 800, color: stat.color }}>{stat.value}</div>
                </div>
              ))}
            </div>

            {/* Expiring soon banner */}
            {expiringSoon.length > 0 && (
              <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 12, padding: "12px 18px", marginBottom: 20, fontSize: "0.875rem", color: "#92400e", display: "flex", gap: 10, alignItems: "center" }}>
                <span>⚠️</span>
                <span>
                  Tienes {expiringSoon.length} licencia{expiringSoon.length > 1 ? "s" : ""} que vence{expiringSoon.length > 1 ? "n" : ""} en los próximos 30 días.
                  Contacta a Aprova para renovar: {expiringSoon.map(l => l.product.name).join(", ")}.
                </span>
              </div>
            )}

            {/* No licenses */}
            {licenses.length === 0 ? (
              <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e2eaf7", padding: "60px 24px", textAlign: "center", color: "#94a3b8" }}>
                <div style={{ fontSize: "2.5rem", marginBottom: 12 }}>🔑</div>
                <p style={{ margin: "0 0 6px", fontWeight: 600, color: "#64748b" }}>No tienes licencias activas</p>
                <p style={{ margin: 0, fontSize: "0.875rem" }}>Contacta a tu administrador de Aprova para adquirir acceso a contenido premium.</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {licenses.map(lic => {
                  const sc = statusColors[lic.status] ?? statusColors.CANCELLED;
                  const isExpiredDate = lic.endsAt && new Date(lic.endsAt) < now;
                  const daysLeft = lic.endsAt
                    ? Math.ceil((new Date(lic.endsAt).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
                    : null;

                  return (
                    <div key={lic.id} style={{ background: "#fff", borderRadius: 14, border: "1px solid #e2eaf7", boxShadow: "0 2px 8px rgba(0,74,173,0.06)", padding: "20px 24px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                            <h3 style={{ fontSize: "1rem", fontWeight: 700, color: "#1e293b", margin: 0 }}>
                              {lic.product.name}
                            </h3>
                            <span style={{ display: "inline-block", padding: "2px 10px", borderRadius: 20, fontSize: "0.72rem", fontWeight: 700, background: sc.bg, color: sc.color }}>
                              {sc.label}
                            </span>
                          </div>
                          <div style={{ fontSize: "0.8rem", color: "#64748b", marginBottom: 6 }}>
                            {typeLabel[lic.product.type] ?? lic.product.type}
                          </div>
                          {lic.product.description && (
                            <p style={{ fontSize: "0.82rem", color: "#94a3b8", margin: "0 0 10px" }}>{lic.product.description}</p>
                          )}
                          <div style={{ display: "flex", gap: 20, fontSize: "0.8rem", color: "#64748b" }}>
                            <span>Inicio: <strong>{formatDate(lic.startsAt)}</strong></span>
                            <span style={{ color: isExpiredDate && lic.status === "ACTIVE" ? "#dc2626" : "#64748b" }}>
                              Vence: <strong>{formatDate(lic.endsAt)}</strong>
                              {daysLeft !== null && daysLeft > 0 && daysLeft <= 30 && (
                                <span style={{ marginLeft: 6, color: "#92400e", fontWeight: 700 }}>({daysLeft}d)</span>
                              )}
                            </span>
                            {lic.pricePaid != null && (
                              <span>Pagado: <strong>{formatPrice(lic.pricePaid)}</strong></span>
                            )}
                          </div>
                          {lic.notes && (
                            <p style={{ fontSize: "0.8rem", color: "#94a3b8", margin: "8px 0 0", fontStyle: "italic" }}>
                              Nota: {lic.notes}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
