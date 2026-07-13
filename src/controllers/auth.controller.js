import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../db.js';
import { createAccessToken } from '../libs/jwt.js';
import { TOKEN_SECRET } from '../config.js';
import { createLog } from './log.controller.js';

// En Electron corre HTTP en localhost → secure:false, sameSite:lax
// En web (Render + Vercel) necesita secure:true, sameSite:none
const isElectron = process.env.ELECTRON_APP === 'true';
const cookieOptions = {
  httpOnly: true,
  secure:   !isElectron,
  sameSite: isElectron ? 'lax' : 'none',
  maxAge:   24 * 60 * 60 * 1000,
};

export const register = async (req, res) => {
  const { email, password, username, nombres, apellidos, cargo } = req.body;
  try {
    const userFound = await prisma.user.findUnique({ where: { email } });
    if (userFound) return res.status(400).json(['El correo ya está registrado']);
    if (!cargo)    return res.status(400).json({ message: "El campo 'cargo' es obligatorio." });

    const passwordHash = await bcrypt.hash(password, 10);
    const userSaved = await prisma.user.create({
      data: { username, email, password: passwordHash, nombres, apellidos, cargo }
    });

    const token = await createAccessToken({ id: userSaved.id, cargo: userSaved.cargo, email: userSaved.email });
    res.cookie('token', token, cookieOptions);
    await createLog('REGISTER', `Nuevo usuario registrado: ${username} (${email})`, userSaved.id, username, req.ip);
    res.json({ token, id: userSaved.id, username: userSaved.username, nombres: userSaved.nombres, apellidos: userSaved.apellidos, cargo: userSaved.cargo, email: userSaved.email });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const login = async (req, res) => {
  const { email, password } = req.body;
  try {
    const userFound = await prisma.user.findUnique({ where: { email } });
    if (!userFound) return res.status(400).json({ message: 'Usuario no encontrado' });

    const isMatch = await bcrypt.compare(password, userFound.password);
    if (!isMatch) return res.status(400).json({ message: 'Datos Incorrectos' });

    const token = await createAccessToken({ id: userFound.id, cargo: userFound.cargo, email: userFound.email });
    res.cookie('token', token, cookieOptions);
    await createLog('LOGIN', `Usuario ${userFound.username} inició sesión`, userFound.id, userFound.username, req.ip);
    res.json({ token, id: userFound.id, username: userFound.username, nombres: userFound.nombres, apellidos: userFound.apellidos, cargo: userFound.cargo, email: userFound.email, profileImage: userFound.profileImage });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const logout = (req, res) => {
  res.cookie('token', '', { ...cookieOptions, maxAge: 0 });
  return res.sendStatus(200);
};

export const profile = async (req, res) => {
  const userFound = await prisma.user.findUnique({ where: { id: req.user.id } });
  if (!userFound) return res.status(400).json({ message: 'Usuario no encontrado' });
  return res.json({ id: userFound.id, username: userFound.username, nombres: userFound.nombres, apellidos: userFound.apellidos, cargo: userFound.cargo, email: userFound.email, profileImage: userFound.profileImage });
};

export const verifyToken = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const headerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    const token = headerToken || req.cookies.token;
    if (!token) return res.status(401).json({ message: 'No autorizado' });

    jwt.verify(token, TOKEN_SECRET, async (err, user) => {
      if (err) return res.status(401).json({ message: 'Token inválido' });
      const userFound = await prisma.user.findUnique({ where: { id: user.id } });
      if (!userFound) return res.status(404).json({ message: 'Usuario no encontrado' });
      return res.json({ id: userFound.id, username: userFound.username, nombres: userFound.nombres, apellidos: userFound.apellidos, cargo: userFound.cargo, email: userFound.email, profileImage: userFound.profileImage });
    });
  } catch (error) {
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
};

export const getUsers = async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, username: true, email: true, nombres: true, apellidos: true, cargo: true }
    });
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

export const registerByAdmin = async (req, res) => {
  const { email, password, username, nombres, apellidos, cargo } = req.body;
  try {
    const userFound = await prisma.user.findUnique({ where: { email } });
    if (userFound) return res.status(400).json({ message: 'El correo ya está registrado' });

    const passwordHash = await bcrypt.hash(password, 10);
    const userSaved = await prisma.user.create({
      data: { username, email, password: passwordHash, nombres, apellidos, cargo: cargo || 'Mecánico' }
    });

    const adminUser = await prisma.user.findUnique({ where: { id: req.user.id } });
    await createLog('ADMIN_REGISTER', `Admin ${adminUser?.username} registró usuario: ${username} (${email}) con cargo ${cargo}`, req.user.id, adminUser?.username, req.ip);
    res.json({ id: userSaved.id, username: userSaved.username, nombres: userSaved.nombres, apellidos: userSaved.apellidos, cargo: userSaved.cargo, email: userSaved.email });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
