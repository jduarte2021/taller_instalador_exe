import { Router } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../db.js';
import { authRequired, superadminRequired } from '../middlewares/validateTokens.js';

const router = Router();

// Listar todos los usuarios (sin password)
router.get('/users/all', authRequired, async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, username: true, email: true, nombres: true, apellidos: true, cargo: true, profileImage: true, createdAt: true }
    });
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Error interno' });
  }
});

// Cambiar cargo — solo superadmin
router.put('/users/:id/role', authRequired, superadminRequired, async (req, res) => {
  try {
    const { cargo } = req.body;
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data:  { cargo },
      select: { id: true, username: true, email: true, nombres: true, apellidos: true, cargo: true }
    });
    res.json(user);
  } catch (error) {
    if (error.code === 'P2025') return res.status(404).json({ message: 'Usuario no encontrado' });
    res.status(500).json({ message: 'Error interno' });
  }
});

// Cambiar contraseña — solo superadmin
router.put('/users/:id/password', authRequired, superadminRequired, async (req, res) => {
  try {
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 6)
      return res.status(400).json({ message: 'La contraseña debe tener al menos 6 caracteres' });

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({ where: { id: req.params.id }, data: { password: passwordHash } });
    res.json({ message: 'Contraseña actualizada correctamente' });
  } catch (error) {
    if (error.code === 'P2025') return res.status(404).json({ message: 'Usuario no encontrado' });
    res.status(500).json({ message: 'Error interno' });
  }
});

// Eliminar usuario — solo superadmin
router.delete('/users/:id', authRequired, superadminRequired, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!user) return res.status(404).json({ message: 'Usuario no encontrado' });
    if ((user.cargo || '').toLowerCase() === 'superadmin')
      return res.status(403).json({ message: 'No se puede eliminar al superadmin' });

    await prisma.user.delete({ where: { id: req.params.id } });
    res.json({ message: 'Usuario eliminado' });
  } catch (error) {
    res.status(500).json({ message: 'Error interno' });
  }
});

export default router;
