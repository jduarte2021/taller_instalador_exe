import { Router }    from "express";
import nodemailer    from "nodemailer";
import { authRequired } from "../middlewares/validateTokens.js";
import { createLog } from "../controllers/log.controller.js";
import prisma        from "../db.js";

const router = Router();

// ── Construir transportador según método configurado ─────────────────────────
function getTransporter() {
  const method = process.env.EMAIL_METHOD || "gmail";

  if (method === "smtp") {
    return nodemailer.createTransport({
      host:   process.env.SMTP_HOST,
      port:   parseInt(process.env.SMTP_PORT || "587"),
      secure: process.env.SMTP_SECURE === "true",   // true = 465 (SSL), false = 587 (TLS)
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      tls: { rejectUnauthorized: false },           // tolerante con certificados autofirmados
    });
  }

  // Default: Gmail con App Password
  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASS,
    },
  });
}

// ── Remitente según método ───────────────────────────────────────────────────
function getSenderAddress() {
  const method = process.env.EMAIL_METHOD || "gmail";
  const user   = method === "smtp" ? process.env.SMTP_USER : process.env.GMAIL_USER;
  return `"MeQanoX" <${user}>`;
}

// ── Verificar que hay config de email activa ─────────────────────────────────
function isEmailConfigured() {
  const method = process.env.EMAIL_METHOD || "gmail";
  if (method === "smtp") {
    return !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
  }
  return !!(process.env.GMAIL_USER && process.env.GMAIL_APP_PASS);
}

// ── Helpers de HTML ──────────────────────────────────────────────────────────
function fmtCLP(n) {
  return n !== undefined && n !== null && n !== ""
    ? `$${new Intl.NumberFormat("es-CL").format(n)} CLP`
    : "—";
}

function buildOrderHTML(task, extraMsg) {
  const total = task.servicePrice || 0;
  const neto  = Math.round(total / 1.19);
  const iva   = total - neto;
  const fmtDate = (d) => d
    ? new Date(d).toLocaleDateString("es-CL") + " " +
      new Date(d).toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" })
    : "—";
  const salida = task.deliveryDate
    ? fmtDate(task.deliveryDate)
    : task.status === "completada"
      ? fmtDate(task.updatedAt || task.date)
      : "En taller";

  const row  = (l, v) =>
    `<tr><td style="padding:4px 14px 4px 0;font-weight:600;color:#475569;font-size:12px;width:36%;vertical-align:top;">${l}</td><td style="padding:4px 0;color:#111;font-size:12px;">${v || "—"}</td></tr>`;
  const note = (title, text, color) =>
    text ? `<div style="margin-bottom:12px;"><div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#475569;margin-bottom:5px;padding-left:8px;border-left:3px solid ${color};">${title}</div><div style="padding:10px 14px;background:#f8fafc;border-radius:0 6px 6px 0;font-size:12px;line-height:1.7;color:#1e293b;">${text}</div></div>` : "";

  return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"/></head><body style="font-family:'Segoe UI',Arial,sans-serif;font-size:13px;color:#111;background:#fff;padding:0;margin:0;">
  <div style="max-width:640px;margin:0 auto;padding:28px 32px;">
    <div style="display:flex;align-items:center;justify-content:space-between;padding-bottom:16px;margin-bottom:20px;border-bottom:2.5px solid #38bdf8;">
      <div style="display:flex;align-items:center;gap:14px;">
        <div style="width:48px;height:48px;background:#0f172a;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:900;color:#38bdf8;">T</div>
        <div><div style="font-size:22px;font-weight:900;color:#0f172a;">MeQanoX</div><div style="font-size:11px;color:#64748b;margin-top:2px;">Software para Servicios Técnicos Automotrices</div></div>
      </div>
      <div style="text-align:right;font-size:11px;color:#64748b;">Presupuesto<strong style="color:#0f172a;display:block;font-size:12px;">${new Date().toLocaleDateString("es-CL")}</strong></div>
    </div>
    <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:22px;">
      <div><div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#64748b;">Orden de Trabajo</div><div style="font-size:36px;font-weight:900;color:#0f172a;line-height:1;">#${task.orderNumber}</div></div>
      <div style="padding:6px 20px;border-radius:20px;font-size:12px;font-weight:700;${task.status === "completada" ? "background:#052e16;color:#4ade80;" : "background:#451a03;color:#fb923c;"}">${task.status === "completada" ? "✔ Completada" : "⏳ En curso"}</div>
    </div>
    <div style="margin-bottom:18px;"><div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#64748b;border-bottom:1px solid #e2e8f0;padding-bottom:5px;margin-bottom:8px;">Datos del Cliente</div>
      <table style="width:100%;border-collapse:collapse;">${row("Nombres", task.clientNombres)}${row("Apellidos", task.clientApellidos)}${row("RUT", task.clientRUT)}${row("Teléfono", task.clientPhone)}${row("Email", task.clientEmail)}</table>
    </div>
    <div style="margin-bottom:18px;"><div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#64748b;border-bottom:1px solid #e2e8f0;padding-bottom:5px;margin-bottom:8px;">Datos del Vehículo</div>
      <table style="width:100%;border-collapse:collapse;">${row("Patente", task.carPlate)}${row("Marca / Modelo", `${task.carBrand || ""} ${task.carModel || ""}`.trim())}${row("Color", task.carColor)}${row("Año", task.carYear || "—")}${row("Kilometraje", task.carKm || "—")}${row("Daños visibles", task.carDamages || "—")}</table>
    </div>
    <div style="margin-bottom:18px;"><div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#64748b;border-bottom:1px solid #e2e8f0;padding-bottom:5px;margin-bottom:8px;">Datos de la Orden</div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;padding:12px;background:#f8fafc;border-radius:8px;margin-bottom:12px;">
        <div><div style="font-size:10px;color:#64748b;font-weight:600;text-transform:uppercase;margin-bottom:3px;">Precio neto</div><div style="font-size:13px;font-weight:700;color:#0f172a;">${fmtCLP(neto)}</div></div>
        <div><div style="font-size:10px;color:#64748b;font-weight:600;text-transform:uppercase;margin-bottom:3px;">IVA (19%)</div><div style="font-size:13px;font-weight:700;color:#0f172a;">${fmtCLP(iva)}</div></div>
        <div><div style="font-size:10px;color:#64748b;font-weight:600;text-transform:uppercase;margin-bottom:3px;">Total con IVA</div><div style="font-size:16px;font-weight:700;color:#166534;">${fmtCLP(total)}</div></div>
      </div>
      <table style="width:100%;border-collapse:collapse;">${row("Mecánico asignado", task.assignedTo ? `${task.assignedTo.nombres} ${task.assignedTo.apellidos}` : "No asignado")}${row("Ingreso", fmtDate(task.date))}${row("Salida", salida)}</table>
    </div>
    ${note("Motivo de Ingreso", task.motivoIngreso, "#38bdf8")}
    ${note("Diagnóstico Taller", task.diagnosticoTaller, "#6366f1")}
    ${note("Descripción de Reparación / Cambio de Piezas", task.repairDescription, "#4ade80")}
    ${note("Observaciones Generales", task.description, "#fb923c")}
    ${extraMsg ? `<div style="margin-top:16px;padding:12px 16px;background:#fffbeb;border-radius:8px;border-left:3px solid #f59e0b;font-size:13px;color:#1e293b;">${extraMsg}</div>` : ""}
    <div style="margin-top:28px;padding-top:12px;border-top:1px solid #e2e8f0;display:flex;justify-content:space-between;font-size:10px;color:#94a3b8;">
      <span>MeQanoX — Software para Servicios Técnicos Automotrices</span>
      <span>Orden #${task.orderNumber} · ${new Date().toLocaleDateString("es-CL")}</span>
    </div>
  </div>
</body></html>`;
}

// ── POST /api/email/send ──────────────────────────────────────────────────────
router.post("/email/send", authRequired, async (req, res) => {
  const { to, subject, message, task } = req.body;
  if (!to) return res.status(400).json({ message: "Faltan campos requeridos" });
  if (!isEmailConfigured())
    return res.status(503).json({ message: "El correo no está configurado. Ve a Configuración → Correo electrónico." });

  const htmlBody = task
    ? buildOrderHTML(task, message)
    : `<div style="font-family:sans-serif;max-width:600px;margin:auto;padding:24px;border:1px solid #e2e8f0;border-radius:12px;"><p style="color:#0f172a;line-height:1.6;">${(message || "").replace(/\n/g, "<br>")}</p><p style="font-size:11px;color:#94a3b8;">MeQanoX — Software para Servicios Técnicos Automotrices</p></div>`;

  try {
    const transporter = getTransporter();
    const info = await transporter.sendMail({
      from:    getSenderAddress(),
      to:      Array.isArray(to) ? to.join(", ") : to,
      subject: subject || "Contacto desde MeQanoX",
      text:    message || `Presupuesto Orden #${task?.orderNumber}`,
      html:    htmlBody,
    });

    const u = await prisma.user.findUnique({ where: { id: req.user.id } });
    await createLog("SEND_EMAIL", `Email enviado a ${to}`, req.user.id, u?.username, req.ip, { to, subject, messageId: info.messageId });

    res.json({ message: "Correo enviado correctamente", id: info.messageId });
  } catch (error) {
    console.error("Error enviando email:", error.message);
    res.status(500).json({ message: "Error al enviar correo: " + error.message });
  }
});

// ── POST /api/email/test  →  enviar correo de prueba ─────────────────────────
router.post("/email/test", authRequired, async (req, res) => {
  if (!isEmailConfigured())
    return res.status(503).json({ message: "El correo no está configurado." });

  const { testTo } = req.body;
  const method = process.env.EMAIL_METHOD || "gmail";
  const user   = method === "smtp" ? process.env.SMTP_USER : process.env.GMAIL_USER;
  const to     = testTo || user;

  try {
    const transporter = getTransporter();

    // Verificar conexión antes de enviar
    await transporter.verify();

    await transporter.sendMail({
      from:    getSenderAddress(),
      to,
      subject: "✅ MeQanoX — Prueba de correo exitosa",
      html: `
        <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:480px;margin:auto;padding:32px;background:#fff;border:1px solid #e2e8f0;border-radius:12px;">
          <div style="font-size:48px;text-align:center;margin-bottom:16px;">✅</div>
          <h2 style="color:#0f172a;text-align:center;margin:0 0 8px;">¡Correo configurado correctamente!</h2>
          <p style="color:#475569;text-align:center;font-size:14px;margin:0 0 24px;">
            Este es un correo de prueba enviado desde <strong>MeQanoX</strong>.
          </p>
          <div style="background:#f8fafc;border-radius:8px;padding:16px;font-size:12px;color:#64748b;">
            <strong>Método:</strong> ${method === "smtp" ? "SMTP Genérico" : "Gmail"}<br>
            <strong>Servidor:</strong> ${method === "smtp" ? (process.env.SMTP_HOST + ":" + process.env.SMTP_PORT) : "smtp.gmail.com"}<br>
            <strong>Fecha:</strong> ${new Date().toLocaleString("es-CL")}
          </div>
          <p style="font-size:11px;color:#94a3b8;text-align:center;margin-top:20px;">MeQanoX — Software para Servicios Técnicos Automotrices</p>
        </div>`,
    });

    const u = await prisma.user.findUnique({ where: { id: req.user.id } });
    await createLog("EMAIL_TEST", `Correo de prueba enviado a ${to}`, req.user.id, u?.username, req.ip);

    res.json({ message: `Correo de prueba enviado a ${to}` });
  } catch (error) {
    console.error("Error en prueba de email:", error.message);
    res.status(500).json({ message: "Error de conexión: " + error.message });
  }
});

export default router;
