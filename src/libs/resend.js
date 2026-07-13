import { Resend } from 'resend';

if (!process.env.RESEND_API_KEY) {
    throw new Error('[ERROR] RESEND_API_KEY no está definido en las variables de entorno.');
}

export const resend = new Resend(process.env.RESEND_API_KEY);

// Remitente por defecto. Debe ser un dominio verificado en Resend.
// Ejemplo: "MotiQ <no-reply@tudominio.com>"
// Si aún no tienes dominio propio, puedes usar: "onboarding@resend.dev" (solo para pruebas)
export const FROM_EMAIL = process.env.RESEND_FROM || 'MotiQ <no-reply@resend.dev>';
