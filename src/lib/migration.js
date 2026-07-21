// src/lib/migration.js — Migración idempotente de datos plain → cifrado AES-256
// Se ejecuta en cada arranque pero solo procesa registros sin cifrar
import prisma from '../db.js';
import { encrypt } from './crypto.js';

export const migrateEncryption = async () => {
  try {
    // Obtener todas las tasks
    const tasks = await prisma.task.findMany({
      select: { id: true, clientRUT: true, clientEmail: true }
    });

    let migrated = 0;
    for (const task of tasks) {
      const updates = {};

      // Solo cifrar si el campo existe y NO está ya cifrado (no empieza en "enc:")
      if (task.clientRUT   && !task.clientRUT.startsWith('enc:'))
        updates.clientRUT   = encrypt(task.clientRUT);
      if (task.clientEmail && !task.clientEmail.startsWith('enc:'))
        updates.clientEmail = encrypt(task.clientEmail);

      if (Object.keys(updates).length > 0) {
        await prisma.task.update({ where: { id: task.id }, data: updates });
        migrated++;
      }
    }

    if (migrated > 0)
      console.log(`[crypto] Migración: ${migrated} órdenes cifradas correctamente`);
    else
      console.log(`[crypto] Migración: todos los datos ya están cifrados`);

  } catch (e) {
    console.warn('[crypto] Error en migración de cifrado:', e.message);
    // No lanzar — la app debe arrancar aunque falle la migración
  }
};
