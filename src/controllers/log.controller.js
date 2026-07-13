import prisma from '../db.js';

// ── Retención automática: borrar logs según configuración (default 90 días) ───
export const purgeOldLogs = async () => {
  try {
    const days   = parseInt(process.env.LOG_RETENTION_DAYS || "90");
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - (isNaN(days) || days < 1 ? 90 : days));
    const { count } = await prisma.log.deleteMany({
      where: { createdAt: { lt: cutoff } },
    });
    if (count > 0) console.log(`[logs] Purga automática: ${count} logs eliminados (>${days} días)`);
  } catch (e) {
    console.warn('[logs] Error en purga automática:', e.message);
  }
};

export const getLogs = async (req, res) => {
  try {
    const page  = parseInt(req.query.page)  || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip  = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      prisma.log.findMany({
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.log.count(),
    ]);

    // Parsear el campo meta (guardado como string JSON)
    const parsed = logs.map(l => ({ ...l, meta: JSON.parse(l.meta || '{}') }));
    res.json({ logs: parsed, total, page, pages: Math.ceil(total / limit) });
  } catch (error) {
    res.status(500).json({ message: 'Error obteniendo logs' });
  }
};

export const createLog = async (action, description, userId, username, ip = '', meta = {}) => {
  try {
    await prisma.log.create({
      data: {
        action,
        description,
        userId:   userId   || null,
        username: username || 'Sistema',
        ip,
        meta: JSON.stringify(meta),
      }
    });
  } catch (e) { /* silent — el log nunca debe romper la app */ }
};

export default { getLogs, createLog };
