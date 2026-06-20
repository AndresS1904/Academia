// jsPDF se importa dinámicamente para evitar errores de SSR en Next.js

// Colores ACAE oficiales
const NAVY  = [0, 30, 80]    as [number, number, number]; // fondo oscuro base
const BLUE  = [0, 74, 173]   as [number, number, number]; // #004aad
const ORANGE= [252, 116, 12] as [number, number, number]; // #fc740c
const WHITE = [255, 255, 255]as [number, number, number]; // #ffffff
const LIGHT = [180, 200, 235]as [number, number, number]; // blanco tenue sobre azul
const GOLD  = [255, 200, 80] as [number, number, number]; // dorado cálido (acento)

async function imgToDataUrl(src: string): Promise<string | null> {
  try {
    const res = await fetch(src);
    const blob = await res.blob();
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

function formatFecha(date: Date): string {
  return date.toLocaleDateString("es-CO", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export async function generarCertificado({
  studentName,
  courseName,
}: {
  studentName: string;
  courseName: string;
}) {
  const { default: jsPDF } = await import("jspdf");
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const W = 297;
  const H = 210;

  /* ── Fondo navy oscuro ── */
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, W, H, "F");

  /* ── Franja lateral izquierda decorativa ── */
  doc.setFillColor(...BLUE);
  doc.rect(0, 0, 18, H, "F");

  /* ── Franja derecha fina naranja ── */
  doc.setFillColor(...ORANGE);
  doc.rect(W - 6, 0, 6, H, "F");

  /* ── Borde dorado exterior ── */
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(0.8);
  doc.rect(22, 8, W - 30, H - 16);

  /* ── Borde interior fino ── */
  doc.setDrawColor(255, 184, 0, 0.4);
  doc.setLineWidth(0.25);
  doc.rect(24, 10, W - 34, H - 20);

  /* ── Puntos dorados en esquinas del borde ── */
  const corners: [number, number][] = [
    [22, 8], [W - 8, 8], [22, H - 8], [W - 8, H - 8],
  ];
  doc.setFillColor(...GOLD);
  for (const [cx, cy] of corners) {
    doc.circle(cx, cy, 2, "F");
  }

  /* ── Elementos decorativos en franja azul izquierda ── */
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(0.3);
  for (let y = 20; y < H - 10; y += 18) {
    doc.circle(9, y, 1.2, "S");
  }

  /* ── LOGO ── */
  const logoUrl = await imgToDataUrl("/logo-acae.jpeg");
  const logoX = 40;
  const logoY = 18;
  const logoSize = 28;

  if (logoUrl) {
    // Círculo de fondo dorado
    doc.setFillColor(...GOLD);
    doc.circle(logoX + logoSize / 2, logoY + logoSize / 2, logoSize / 2 + 2, "F");
    doc.addImage(logoUrl, "JPEG", logoX, logoY, logoSize, logoSize);
    // Borde circular
    doc.setDrawColor(...ORANGE);
    doc.setLineWidth(0.6);
    doc.circle(logoX + logoSize / 2, logoY + logoSize / 2, logoSize / 2 + 2, "S");
  } else {
    doc.setFillColor(...GOLD);
    doc.circle(logoX + logoSize / 2, logoY + logoSize / 2, logoSize / 2 + 2, "F");
    doc.setTextColor(...NAVY);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("ACAE", logoX + logoSize / 2, logoY + logoSize / 2 + 2, { align: "center" });
  }

  /* ── Nombre academia (derecha del logo) ── */
  doc.setTextColor(...WHITE);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("ACADEMIA DE CIENCIAS", 80, 26, { align: "left" });
  doc.text("AVANZADAS EXACTAS", 80, 33, { align: "left" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...GOLD);
  doc.text("ACAE — Formando líderes científicos del mañana", 80, 39, { align: "left" });

  /* ── Línea separadora naranja ── */
  doc.setDrawColor(...ORANGE);
  doc.setLineWidth(1.2);
  doc.line(26, 52, W - 12, 52);

  /* ── CERTIFICADO — título principal ── */
  doc.setTextColor(...GOLD);
  doc.setFont("times", "bold");
  doc.setFontSize(42);
  doc.text("CERTIFICADO", W / 2 + 10, 78, { align: "center" });

  /* ── Subtítulo ── */
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(...ORANGE);
  // Letter spacing simulado
  doc.text("D  E     F  I  N  A  L  I  Z  A  C  I  Ó  N", W / 2 + 10, 86, { align: "center" });

  /* ── Divider con diamante central ── */
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(0.35);
  doc.line(60, 92, W / 2 + 10 - 6, 92);
  doc.line(W / 2 + 10 + 6, 92, W - 16, 92);
  doc.setFillColor(...GOLD);
  doc.circle(W / 2 + 10, 92, 2.5, "F");

  /* ── Texto introductorio ── */
  doc.setTextColor(...LIGHT);
  doc.setFont("helvetica", "italic");
  doc.setFontSize(9);
  doc.text("Este certificado reconoce con orgullo que", W / 2 + 10, 102, { align: "center" });

  /* ── NOMBRE DEL ESTUDIANTE ── */
  doc.setTextColor(...GOLD);
  doc.setFont("times", "bolditalic");
  doc.setFontSize(28);
  doc.text(studentName.toUpperCase(), W / 2 + 10, 117, { align: "center" });

  /* ── Línea bajo el nombre ── */
  const nameW = doc.getTextWidth(studentName.toUpperCase());
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(0.4);
  doc.line(W / 2 + 10 - nameW / 2, 119.5, W / 2 + 10 + nameW / 2, 119.5);

  /* ── Texto central ── */
  doc.setTextColor(...LIGHT);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("ha completado satisfactoriamente el programa académico", W / 2 + 10, 128, { align: "center" });

  /* ── NOMBRE DEL CURSO ── */
  doc.setTextColor(...ORANGE);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.text(courseName, W / 2 + 10, 138, { align: "center" });

  /* ── Divider inferior ── */
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(0.25);
  doc.line(80, 144, W - 16, 144);

  /* ── Fecha ── */
  doc.setTextColor(...LIGHT);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(`Expedido el ${formatFecha(new Date())}`, W / 2 + 10, 152, { align: "center" });

  /* ── Estrellas decorativas ── */
  doc.setTextColor(...GOLD);
  doc.setFontSize(10);
  doc.text("★   ★   ★", W / 2 + 10, 162, { align: "center" });

  /* ── Footer ── */
  doc.setTextColor(120, 140, 180);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.text("ACAE · Academia de Ciencias Avanzadas Exactas · acae.edu.co", W / 2 + 10, 170, { align: "center" });

  /* ── Guardar ── */
  const safeName = studentName.replace(/\s+/g, "_").replace(/[^a-zA-Z0-9_]/g, "");
  doc.save(`Certificado_ACAE_${safeName}.pdf`);
}
