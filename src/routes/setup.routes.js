// src/routes/setup.routes.js
// Endpoint de configuración inicial — solo disponible cuando no hay usuarios
import { Router }  from 'express';
import bcrypt      from 'bcryptjs';
import prisma      from '../db.js';
import { createLog } from '../controllers/log.controller.js';

const router = Router();

// ── GET /api/setup/status — ¿necesita configuración inicial? ─────────────────
router.get('/setup/status', async (req, res) => {
  try {
    const count = await prisma.user.count();
    res.json({ needsSetup: count === 0 });
  } catch {
    res.json({ needsSetup: true });
  }
});

// ── POST /api/setup — crear primer superadmin y configurar el taller ──────────
router.post('/setup', async (req, res) => {
  try {
    // Verificar que no haya usuarios — endpoint solo válido en primera ejecución
    const count = await prisma.user.count();
    if (count > 0) {
      return res.status(403).json({ message: 'La aplicación ya está configurada' });
    }

    const { username, password, confirmPassword, nombres, apellidos, email, tallerNombre } = req.body;

    // Validaciones
    if (!username?.trim())       return res.status(400).json({ message: 'El usuario es requerido' });
    if (!password)               return res.status(400).json({ message: 'La contraseña es requerida' });
    if (password.length < 8)     return res.status(400).json({ message: 'La contraseña debe tener al menos 8 caracteres' });
    if (password !== confirmPassword) return res.status(400).json({ message: 'Las contraseñas no coinciden' });
    if (!nombres?.trim())        return res.status(400).json({ message: 'El nombre es requerido' });
    if (!apellidos?.trim())      return res.status(400).json({ message: 'El apellido es requerido' });
    if (!email?.trim())          return res.status(400).json({ message: 'El email es requerido' });
    if (!tallerNombre?.trim())   return res.status(400).json({ message: 'El nombre del taller es requerido' });

    // Crear usuario superadmin
    const hash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        username:     username.trim().toLowerCase(),
        email:        email.trim().toLowerCase(),
        password:     hash,
        nombres:      nombres.trim(),
        apellidos:    apellidos.trim(),
        cargo:        'superadmin',
        profileImage: '',
      }
    });

    // Guardar nombre del taller en Config
    await prisma.$executeRawUnsafe(
      `INSERT OR REPLACE INTO "Config" ("key", "value") VALUES ('tallerNombre', ?)`,
      tallerNombre.trim()
    );

    await createLog(
      'SETUP_COMPLETE',
      `Configuración inicial completada. Taller: ${tallerNombre}. Admin: ${username}`,
      user.id, username, req.ip
    );

    console.log(`[setup] ✅ Configuración inicial completada. Taller: "${tallerNombre}" | Admin: "${username}"`);

    res.json({ message: 'Configuración completada correctamente', username: user.username });
  } catch (error) {
    console.error('[setup] Error:', error.message);
    if (error.code === 'P2002') {
      return res.status(400).json({ message: 'El email o usuario ya existe' });
    }
    res.status(500).json({ message: 'Error al configurar: ' + error.message });
  }
});

export default router;
