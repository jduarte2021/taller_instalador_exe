import { Router } from "express";
import { authRequired } from "../middlewares/validateTokens.js";
import puppeteer from "puppeteer";

const router = Router();

// ── Lanzador de Chrome / headless-shell ──────────────────────────────────────
// En producción (Electron): PUPPETEER_EXECUTABLE_PATH apunta al Chrome empaquetado
// En desarrollo: Puppeteer usa su propio Chrome descargado en .cache/puppeteer
async function getBrowser() {
  return puppeteer.launch({
    headless: "shell",
    // Si la variable está seteada (Electron), usamos ese ejecutable;
    // si no, Puppeteer busca el suyo propio (modo desarrollo).
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-accelerated-2d-canvas",
      "--no-first-run",
      "--disable-gpu",
      // "--single-process"  ← este flag causa "Target closed" en Windows
    ],
  });
}

function buildHTML(task) {
  const fmt = (n) =>
    n !== undefined && n !== null && n !== ""
      ? `$${new Intl.NumberFormat("es-CL").format(n)} CLP`
      : "—";

  const total = task.servicePrice || 0;
  const neto = Math.round(total / 1.19);
  const iva = total - neto;

  const row = (label, value) => `
    <tr>
      <td class="label">${label}</td>
      <td class="value">${value || "—"}</td>
    </tr>`;

  const note = (title, text, color) =>
    text ? `
      <div class="note">
        <div class="note-title" style="border-left-color:${color}">${title}</div>
        <div class="note-body">${text}</div>
      </div>` : "";

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8"/>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family:'Segoe UI',Arial,sans-serif; font-size:13px; color:#111; background:#fff; padding:28px 32px; }
    .header { display:flex; align-items:center; justify-content:space-between; padding-bottom:16px; margin-bottom:20px; border-bottom:2.5px solid #38bdf8; }
    .brand { display:flex; align-items:center; gap:14px; }
    .brand-icon { width:48px;height:48px;background:linear-gradient(135deg,#0f172a,#1e3a5f);border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:900;color:#38bdf8; }
    .brand-name { font-size:22px;font-weight:900;color:#0f172a; }
    .brand-sub { font-size:11px;color:#64748b;margin-top:2px; }
    .print-date { text-align:right;font-size:11px;color:#64748b; }
    .print-date strong { color:#0f172a;display:block;font-size:12px; }
    .order-header { display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:22px; }
    .order-label { font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#64748b; }
    .order-number { font-size:36px;font-weight:900;color:#0f172a;line-height:1; }
    .status-badge { padding:6px 20px;border-radius:20px;font-size:12px;font-weight:700; }
    .status-completada { background:#052e16;color:#4ade80; }
    .status-en-curso { background:#451a03;color:#fb923c; }
    .section { margin-bottom:18px; }
    .section-title { font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#64748b;border-bottom:1px solid #e2e8f0;padding-bottom:5px;margin-bottom:8px; }
    table { width:100%;border-collapse:collapse; }
    .label { width:36%;padding:4px 16px 4px 0;font-weight:600;color:#475569;font-size:12px;vertical-align:top; }
    .value { padding:4px 0;color:#111;font-size:12px;vertical-align:top; }
    .price-box { display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;padding:12px;background:#f8fafc;border-radius:8px;margin-bottom:12px; }
    .price-item .plabel { font-size:10px;color:#64748b;font-weight:600;text-transform:uppercase;margin-bottom:3px; }
    .price-item .pvalue { font-size:13px;font-weight:700;color:#0f172a; }
    .price-item.total .pvalue { font-size:16px;color:#166534; }
    .note { margin-bottom:12px; }
    .note-title { font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#475569;margin-bottom:5px;padding-left:8px;border-left:3px solid #38bdf8; }
    .note-body { padding:10px 14px;background:#f8fafc;border-radius:0 6px 6px 0;font-size:12px;line-height:1.7;color:#1e293b; }
    .footer { margin-top:28px;padding-top:12px;border-top:1px solid #e2e8f0;display:flex;justify-content:space-between;font-size:10px;color:#94a3b8; }
  </style>
</head>
<body>
  <div class="header">
    <div class="brand">
      <div class="brand-icon">T</div>
      <div>
        <div class="brand-name">MotiQ</div>
        <div class="brand-sub">Software para Servicios Técnicos Automotrices</div>
      </div>
    </div>
    <div class="print-date">Fecha de impresión<strong>${new Date().toLocaleDateString("es-CL")}</strong></div>
  </div>
  <div class="order-header">
    <div>
      <div class="order-label">Orden de Trabajo</div>
      <div class="order-number">#${task.orderNumber}</div>
    </div>
    <div class="status-badge ${task.status === "completada" ? "status-completada" : "status-en-curso"}">
      ${task.status === "completada" ? "✔ Completada" : "⏳ En curso"}
    </div>
  </div>
  <div class="section">
    <div class="section-title">Datos del Cliente</div>
    <table>
      ${row("Nombres", task.clientNombres)}
      ${row("Apellidos", task.clientApellidos)}
      ${row("RUT", task.clientRUT)}
      ${row("Teléfono", task.clientPhone)}
      ${row("Email", task.clientEmail)}
    </table>
  </div>
  <div class="section">
    <div class="section-title">Datos del Vehículo</div>
    <table>
      ${row("Patente", task.carPlate)}
      ${row("Marca / Modelo", `${task.carBrand || ""} ${task.carModel || ""}`.trim())}
      ${row("Color", task.carColor)}
      ${row("Año", task.carYear || "—")}
      ${row("Kilometraje", task.carKm || "—")}
      ${row("Daños visibles", task.carDamages || "—")}
      ${row("Detalles extraordinarios", task.carDetails || "—")}
    </table>
  </div>
  <div class="section">
    <div class="section-title">Datos de la Orden</div>
    <div class="price-box">
      <div class="price-item"><div class="plabel">Precio neto</div><div class="pvalue">${fmt(neto)}</div></div>
      <div class="price-item"><div class="plabel">IVA (19%)</div><div class="pvalue">${fmt(iva)}</div></div>
      <div class="price-item total"><div class="plabel">Total con IVA</div><div class="pvalue">${fmt(total)}</div></div>
    </div>
    <table>
      ${row("Mecánico asignado", task.assignedTo ? `${task.assignedTo.nombres} ${task.assignedTo.apellidos}` : "No asignado")}
      ${row("Ingreso", task.date ? new Date(task.date).toLocaleDateString("es-CL") + " " + new Date(task.date).toLocaleTimeString("es-CL", {hour:"2-digit",minute:"2-digit"}) : "—")}
      ${row("Salida", task.deliveryDate ? new Date(task.deliveryDate).toLocaleDateString("es-CL") + " " + new Date(task.deliveryDate).toLocaleTimeString("es-CL", {hour:"2-digit",minute:"2-digit"}) : (task.status === "completada" ? new Date(task.updatedAt || task.date).toLocaleDateString("es-CL") + " " + new Date(task.updatedAt || task.date).toLocaleTimeString("es-CL", {hour:"2-digit",minute:"2-digit"}) : "En taller"))}
      ${task.editedBy ? row("Editado por", task.editedBy?.username || "—") : ""}
    </table>
  </div>
  ${note("Motivo de Ingreso", task.motivoIngreso, "#38bdf8")}
  ${note("Diagnóstico Taller", task.diagnosticoTaller, "#6366f1")}
  ${note("Descripción de Reparación / Cambio de Piezas", task.repairDescription, "#4ade80")}
  ${note("Observaciones Generales", task.description, "#fb923c")}
  <div class="footer">
    <span>MotiQ — Software para Servicios Técnicos Automotrices</span>
    <span>Orden #${task.orderNumber} · ${new Date().toLocaleDateString("es-CL")}</span>
  </div>
</body>
</html>`;
}

router.post("/pdf/order", authRequired, async (req, res) => {
  const task = req.body;
  if (!task || !task.orderNumber) {
    return res.status(400).json({ message: "Datos de orden inválidos" });
  }
  let browser;
  try {
    browser = await getBrowser();
    const page = await browser.newPage();
    await page.setContent(buildHTML(task), { waitUntil: "networkidle0" });
    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "10mm", right: "10mm", bottom: "10mm", left: "10mm" },
    });
    await browser.close();
    const clientName = `${task.clientNombres || ""}_${task.clientApellidos || ""}`.trim().replace(/\s+/g, "_") || "cliente";
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="orden_${task.orderNumber}_${clientName}.pdf"`);
    res.send(pdf);
  } catch (error) {
    if (browser) await browser.close().catch(() => {});
    console.error("Error generando PDF:", error.message);
    res.status(500).json({ message: "Error generando PDF: " + error.message });
  }
});

export default router;
