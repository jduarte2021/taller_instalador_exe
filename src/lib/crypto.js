// src/lib/crypto.js — Cifrado determinista AES-256-CBC para campos sensibles
// Clave fija compilada: protege contra acceso con DB Browser (Ley 21.719)
// El IV se deriva del contenido → mismo texto siempre produce el mismo cifrado
import { createCipheriv, createDecipheriv, createHash } from 'crypto';

const ENC_PREFIX = 'enc:';

// Clave fija de 32 bytes (AES-256) — derivada de una semilla del producto
const FIELD_KEY = createHash('sha256')
  .update('meqanox-field-encryption-key-v1-qodeya-2025')
  .digest(); // 32 bytes

// IV determinista: derivado del contenido → mismo texto = mismo resultado
// Esto permite agrupar por RUT cifrado y buscar por valor exacto cifrado
function deterministicIV(text) {
  return createHash('md5').update(String(text)).digest(); // 16 bytes
}

// ── Cifrar un campo sensible ───────────────────────────────────────────────────
export function encrypt(text) {
  if (!text || text.startsWith(ENC_PREFIX)) return text; // ya cifrado o vacío
  try {
    const iv  = deterministicIV(String(text));
    const cip = createCipheriv('aes-256-cbc', FIELD_KEY, iv);
    const enc = Buffer.concat([cip.update(String(text), 'utf8'), cip.final()]);
    return `${ENC_PREFIX}${iv.toString('hex')}:${enc.toString('hex')}`;
  } catch {
    return text; // si falla, devolver original (nunca crash)
  }
}

// ── Descifrar un campo sensible ───────────────────────────────────────────────
export function decrypt(text) {
  if (!text || !text.startsWith(ENC_PREFIX)) return text; // no cifrado → devolver tal cual
  try {
    const parts = text.slice(ENC_PREFIX.length).split(':');
    if (parts.length !== 2) return text;
    const [ivHex, encHex] = parts;
    const dec = createDecipheriv('aes-256-cbc', FIELD_KEY, Buffer.from(ivHex, 'hex'));
    return Buffer.concat([
      dec.update(Buffer.from(encHex, 'hex')),
      dec.final()
    ]).toString('utf8');
  } catch {
    return text; // si falla (dato corrupto), devolver original
  }
}

// ── Descifrar un objeto task completo ─────────────────────────────────────────
export function decryptTask(task) {
  if (!task) return task;
  return {
    ...task,
    clientRUT:   decrypt(task.clientRUT),
    clientEmail: decrypt(task.clientEmail),
  };
}

// ── Cifrar campos sensibles antes de escribir en BD ───────────────────────────
export function encryptTaskFields(data) {
  const result = { ...data };
  if (result.clientRUT   !== undefined) result.clientRUT   = encrypt(result.clientRUT);
  if (result.clientEmail !== undefined) result.clientEmail = encrypt(result.clientEmail);
  return result;
}
