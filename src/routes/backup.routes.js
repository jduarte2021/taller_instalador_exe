import { Router }   from 'express';
import archiver     from 'archiver';
import multer       from 'multer';
import fs           from 'fs';
import path         from 'path';
import { authRequired, superadminRequired } from '../middlewares/validateTokens.js';
import prisma       from '../db.js';
import { createLog } from '../controllers/log.controller.js';

const router  = Router();
const upload  = multer({ storage: multer.memoryStorage(), limits: { fileSize: 200 * 1024 * 1024 } });

// ── Obtener ruta real del .db desde DATABASE_URL ──────────────────────────────
function getDbPath() {
  const url = process.env.DATABASE_URL || '';          // "file:/ruta/meqanox.db"
  return url.replace(/^file:/, '');
}

// ── GET /api/backup  →  descarga ZIP con .db + JSONs legibles ─────────────────
router.get('/backup', authRequired, superadminRequired, async (req, res) => {
  try {
    const dbPath = getDbPath();
    if (!fs.existsSync(dbPath))
      return res.status(500).json({ message: 'No se encontró el archivo de base de datos' });

    const date = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename=backup_meqanox_${date}.zip`);

    const archive = archiver('zip', { zlib: { level: 9 } });
    archive.pipe(res);

    // 1. Base de datos SQLite completa (para restauración)
    archive.file(dbPath, { name: 'meqanox.db' });

    // 2. JSON de órdenes (legible)
    const tasks = await prisma.task.findMany({
      include: {
        assignedTo: { select: { nombres: true, apellidos: true, username: true } },
        createdBy:  { select: { username: true } },
        editedBy:   { select: { username: true } },
      },
      orderBy: { orderNumber: 'asc' },
    });
    archive.append(JSON.stringify(tasks, null, 2), { name: 'ordenes.json' });

    // 3. JSON de usuarios (sin contraseñas)
    const users = await prisma.user.findMany({
      select: { id: true, username: true, email: true, nombres: true, apellidos: true, cargo: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    });
    archive.append(JSON.stringify(users, null, 2), { name: 'usuarios.json' });

    // 4. CSV de órdenes (para Excel)
    const csvHeader = 'N° Orden,Cliente,RUT,Teléfono,Email,Patente,Marca,Modelo,Color,Año,KM,Estado,Precio,Mecánico,Fecha\n';
    const csvRows   = tasks.map(t =>
      `${t.orderNumber},"${t.clientNombres} ${t.clientApellidos}","${t.clientRUT||''}","${t.clientPhone||''}","${t.clientEmail||''}","${t.carPlate}","${t.carBrand||''}","${t.carModel||''}","${t.carColor||''}","${t.carYear||''}","${t.carKm||''}","${t.status}",${t.servicePrice||0},"${t.assignedTo ? t.assignedTo.nombres+' '+t.assignedTo.apellidos : 'N/A'}","${new Date(t.date).toLocaleDateString('es-CL')}"`
    ).join('\n');
    archive.append(csvHeader + csvRows, { name: 'ordenes.csv' });

    // 5. Metadata del backup
    const meta = {
      version: '1.0',
      fecha: new Date().toISOString(),
      totalOrdenes: tasks.length,
      totalUsuarios: users.length,
      generadoPor: req.user?.email || 'desconocido',
    };
    archive.append(JSON.stringify(meta, null, 2), { name: 'INFO.json' });

    const u = await prisma.user.findUnique({ where: { id: req.user.id } });
    await createLog('BACKUP', `Respaldo completo generado (${tasks.length} órdenes, ${users.length} usuarios)`, req.user.id, u?.username, req.ip);

    await archive.finalize();
  } catch (error) {
    console.error('Error generando backup:', error);
    if (!res.headersSent)
      res.status(500).json({ message: 'Error generando respaldo: ' + error.message });
  }
});

// ── POST /api/backup/restore  →  restaura desde un .db subido ─────────────────
router.post('/backup/restore', authRequired, superadminRequired, upload.single('database'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No se recibió archivo' });

    // Validar que sea un SQLite válido (magic bytes: 53 51 4C 69 74 65 = "SQLite")
    const magic = req.file.buffer.slice(0, 6).toString('utf8');
    if (magic !== 'SQLite')
      return res.status(400).json({ message: 'El archivo no es una base de datos SQLite válida' });

    const dbPath = getDbPath();

    // Crear backup automático del estado actual antes de restaurar
    const backupPath = dbPath + '.previo_restauracion';
    fs.copyFileSync(dbPath, backupPath);

    // Desconectar Prisma para liberar el archivo
    await prisma.$disconnect();

    // Escribir el nuevo .db
    fs.writeFileSync(dbPath, req.file.buffer);

    // Reconectar Prisma
    await prisma.$connect();

    const u = await prisma.user.findUnique({ where: { id: req.user.id } }).catch(() => null);
    await createLog('RESTORE', 'Base de datos restaurada desde backup', req.user.id, u?.username, req.ip).catch(() => {});

    res.json({ message: 'Base de datos restaurada correctamente. Reinicia la aplicación para aplicar los cambios.' });
  } catch (error) {
    console.error('Error restaurando backup:', error);
    // Intentar reconectar si algo falló
    await prisma.$connect().catch(() => {});
    res.status(500).json({ message: 'Error restaurando: ' + error.message });
  }
});

export default router;


// ── GET /api/config/email  →  leer config actual ────────────────────────────
router.get('/config/email', authRequired, superadminRequired, async (req, res) => {
  const method = process.env.EMAIL_METHOD || 'gmail';
  res.json({
    method,
    // Gmail
    GMAIL_USER:     process.env.GMAIL_USER     || '',
    gmailConfigured: !!(process.env.GMAIL_USER && process.env.GMAIL_APP_PASS),
    // SMTP
    SMTP_HOST:      process.env.SMTP_HOST      || '',
    SMTP_PORT:      process.env.SMTP_PORT      || '587',
    SMTP_SECURE:    process.env.SMTP_SECURE    || 'false',
    SMTP_USER:      process.env.SMTP_USER      || '',
    smtpConfigured: !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS),
  });
});

// ── POST /api/config/email  →  guardar config en .env.local ─────────────────
router.post('/config/email', authRequired, superadminRequired, async (req, res) => {
  try {
    const { method, gmailUser, gmailPass, smtpHost, smtpPort, smtpSecure, smtpUser, smtpPass } = req.body;

    if (!method) return res.status(400).json({ message: 'Método requerido' });

    if (method === 'gmail') {
      if (!gmailUser) return res.status(400).json({ message: 'Correo Gmail requerido' });
    } else {
      if (!smtpHost || !smtpUser) return res.status(400).json({ message: 'Servidor y usuario SMTP requeridos' });
    }

    // Construir contenido del .env.local
    const lines = [`EMAIL_METHOD=${method}`];
    if (method === 'gmail') {
      lines.push(`GMAIL_USER=${gmailUser.trim()}`);
      if (gmailPass) lines.push(`GMAIL_APP_PASS=${gmailPass.trim()}`);
    } else {
      lines.push(`SMTP_HOST=${smtpHost.trim()}`);
      lines.push(`SMTP_PORT=${smtpPort || '587'}`);
      lines.push(`SMTP_SECURE=${smtpSecure || 'false'}`);
      lines.push(`SMTP_USER=${smtpUser.trim()}`);
      if (smtpPass) lines.push(`SMTP_PASS=${smtpPass.trim()}`);
    }

    const { app } = await import('electron').catch(() => ({ app: null }));
    const envPath  = app
      ? path.join(app.getPath('userData'), '.env.local')
      : path.join(process.cwd(), '.env.local');

    // Leer .env.local existente para no borrar otras claves
    let existing = {};
    try {
      fs.readFileSync(envPath, 'utf8').split('\n').forEach(line => {
        const eq = line.indexOf('=');
        if (eq > 0) existing[line.slice(0, eq).trim()] = line.slice(eq + 1).trim();
      });
    } catch {}

    // Merge: sobrescribir solo las claves del método elegido
    lines.forEach(line => {
      const eq  = line.indexOf('=');
      const key = line.slice(0, eq); const val = line.slice(eq + 1);
      existing[key] = val;
    });

    fs.writeFileSync(envPath, Object.entries(existing).map(([k, v]) => `${k}=${v}`).join('\n') + '\n', 'utf8');

    // Recargar en memoria
    lines.forEach(line => {
      const eq = line.indexOf('=');
      process.env[line.slice(0, eq)] = line.slice(eq + 1);
    });

    const u = await prisma.user.findUnique({ where: { id: req.user.id } });
    await createLog('CONFIG_EMAIL', `Config de correo actualizada (${method})`, req.user.id, u?.username, req.ip);

    res.json({ message: 'Configuración de correo guardada correctamente' });
  } catch (error) {
    console.error('Error guardando config email:', error);
    res.status(500).json({ message: 'Error al guardar: ' + error.message });
  }
});


// ── GET /api/config/retention  →  leer config de retención actual ─────────────
router.get('/config/retention', authRequired, superadminRequired, async (req, res) => {
  res.json({ days: parseInt(process.env.LOG_RETENTION_DAYS || "90") });
});

// ── POST /api/config/retention  →  guardar retención en .env.local ────────────
router.post('/config/retention', authRequired, superadminRequired, async (req, res) => {
  try {
    const { days } = req.body;
    const val = parseInt(days);
    if (isNaN(val) || val < 1) return res.status(400).json({ message: 'Valor inválido' });

    const { app } = await import('electron').catch(() => ({ app: null }));
    const envPath  = app
      ? path.join(app.getPath('userData'), '.env.local')
      : path.join(process.cwd(), '.env.local');

    // Leer .env.local existente y hacer merge
    let existing = {};
    try {
      fs.readFileSync(envPath, 'utf8').split('\n').forEach(line => {
        const eq = line.indexOf('=');
        if (eq > 0) existing[line.slice(0, eq).trim()] = line.slice(eq + 1).trim();
      });
    } catch {}
    existing['LOG_RETENTION_DAYS'] = String(val);
    fs.writeFileSync(envPath, Object.entries(existing).map(([k, v]) => `${k}=${v}`).join('\n') + '\n', 'utf8');

    process.env.LOG_RETENTION_DAYS = String(val);

    const u = await prisma.user.findUnique({ where: { id: req.user.id } });
    await createLog('CONFIG_RETENTION', `Retención de logs configurada a ${val} días`, req.user.id, u?.username, req.ip);

    res.json({ message: `Retención de logs configurada a ${val} días` });
  } catch (error) {
    res.status(500).json({ message: 'Error al guardar: ' + error.message });
  }
});
