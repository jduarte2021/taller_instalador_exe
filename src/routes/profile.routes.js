import express from "express";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { authRequired } from "../middlewares/validateTokens.js";
import prisma from "../db.js";
import multer from "multer";
import { createLog } from "../controllers/log.controller.js";

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

// ── Carpeta de destino de imágenes de perfil ──────────────────────────────────
// En producción (Electron): UPLOADS_BASE = <userData>/uploads  → siempre escribible
// En desarrollo:            ruta local src/uploads
const uploadsBase = process.env.UPLOADS_BASE
  ? process.env.UPLOADS_BASE
  : path.join(__dirname, "..", "uploads");

const uploadsDir = path.join(uploadsBase, "perfiles");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const ext    = path.extname(file.originalname).toLowerCase() || ".jpg";
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e6)}${ext}`;
    cb(null, unique);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp/;
    if (allowed.test(file.mimetype)) cb(null, true);
    else cb(new Error("Solo se permiten imágenes (jpg, png, gif, webp)"));
  },
});

router.put("/profile", authRequired, upload.single("profileImage"), async (req, res) => {
  try {
    const { id } = req.user;
    const { nombre, apellido, cargo } = req.body;

    const currentUser = await prisma.user.findUnique({ where: { id } });
    if (!currentUser) return res.status(404).json({ message: "Usuario no encontrado" });

    const updatedFields = {
      nombres:   nombre?.trim()   || currentUser.nombres,
      apellidos: apellido?.trim() || currentUser.apellidos,
      cargo:     cargo?.trim()    || currentUser.cargo,
    };

    if (req.file) {
      // URL accesible desde el frontend via /uploads/perfiles/filename
      updatedFields.profileImage = `/uploads/perfiles/${req.file.filename}`;

      // Eliminar imagen anterior del disco si existe
      if (currentUser.profileImage && currentUser.profileImage.startsWith("/uploads/")) {
        // Obtener la ruta relativa a uploads  (ej: "perfiles/foto.jpg")
        const relPath = currentUser.profileImage.replace(/^\/uploads\//, "");
        const oldPath = path.join(uploadsBase, relPath);
        fs.unlink(oldPath, (err) => {
          if (err) console.warn("No se pudo eliminar imagen anterior:", err.message);
        });
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: updatedFields,
    });

    await createLog(
      "UPDATE_PROFILE",
      `Usuario ${currentUser.username} actualizó su perfil${req.file ? " (foto)" : ""}`,
      id,
      currentUser.username,
      req.ip
    );

    res.json({
      id:           updatedUser.id,
      username:     updatedUser.username,
      nombres:      updatedUser.nombres,
      apellidos:    updatedUser.apellidos,
      cargo:        updatedUser.cargo,
      email:        updatedUser.email,
      profileImage: updatedUser.profileImage,
    });
  } catch (error) {
    console.error("Error al actualizar el perfil:", error);
    res.status(500).json({ message: "Error al actualizar el perfil: " + error.message });
  }
});

export default router;
