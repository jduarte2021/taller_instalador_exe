# Instrucciones de Deploy

## ⚠️ IMPORTANTE: Variables de entorno en Render (Backend)

Antes de hacer redeploy, configura estas variables en **Render > tu servicio > Environment**:

| Variable | Valor |
|----------|-------|
| `TOKEN_SECRET` | `ThinkPad@551v` ← **usar el mismo valor original para no invalidar sesiones** |
| `MONGODB_URI` | tu URI de MongoDB Atlas |
| `PORT` | `3000` |

> Si cambias `TOKEN_SECRET`, **todos los usuarios deberán volver a iniciar sesión**.

---

## Variables de entorno en Vercel (Frontend)

En **Vercel > tu proyecto > Settings > Environment Variables**:

| Variable | Valor |
|----------|-------|
| `VITE_API_URL` | `https://taller-8qh1.onrender.com/api` |

> ⚠️ Debe terminar en `/api` exactamente así.

---

## Pasos de redeploy

### Backend (Render)
1. Subir los cambios al repositorio Git
2. Render hace redeploy automático, o ir a **Manual Deploy**

### Frontend (Vercel)
1. Subir los cambios al repositorio Git
2. Vercel hace redeploy automático
3. Si el bundle sigue siendo el viejo: ir a **Vercel > Deployments > Redeploy** (sin cache)

---

## Verificar que el fix del `/api/api/users` funcionó

Abre DevTools > Network y verifica que las llamadas sean:
- ✅ `GET https://taller-8qh1.onrender.com/api/users` (200)
- ✅ `GET https://taller-8qh1.onrender.com/api/users/all` (200)
- ❌ `GET https://taller-8qh1.onrender.com/api/api/users` (404) ← esto ya NO debe aparecer
