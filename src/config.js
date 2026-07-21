// TOKEN_SECRET viene de process.env — seteado dinámicamente en electron/main.cjs
// basado en hardware del equipo. En desarrollo usa el valor del .env.
export const TOKEN_SECRET = process.env.TOKEN_SECRET || 'meqanox-dev-fallback-secret-2025';
