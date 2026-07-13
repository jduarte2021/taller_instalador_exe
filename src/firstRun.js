import bcrypt from 'bcryptjs';
import prisma from './db.js';

// Crea las tablas si no existen (idempotente — seguro correr siempre)
export const initDatabase = async () => {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "User" (
      "id"           TEXT     NOT NULL PRIMARY KEY,
      "username"     TEXT     NOT NULL,
      "email"        TEXT     NOT NULL UNIQUE,
      "password"     TEXT     NOT NULL,
      "nombres"      TEXT     NOT NULL,
      "apellidos"    TEXT     NOT NULL,
      "cargo"        TEXT     NOT NULL DEFAULT 'Mecánico',
      "profileImage" TEXT     NOT NULL DEFAULT '',
      "createdAt"    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt"    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "Task" (
      "id"                TEXT     NOT NULL PRIMARY KEY,
      "orderNumber"       INTEGER  NOT NULL UNIQUE,
      "carPlate"          TEXT     NOT NULL,
      "clientNombres"     TEXT     NOT NULL DEFAULT '',
      "clientApellidos"   TEXT     NOT NULL DEFAULT '',
      "description"       TEXT     NOT NULL DEFAULT '',
      "motivoIngreso"     TEXT     NOT NULL DEFAULT '',
      "diagnosticoTaller" TEXT     NOT NULL DEFAULT '',
      "repairDescription" TEXT     NOT NULL DEFAULT '',
      "date"              DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "clientRUT"         TEXT     NOT NULL DEFAULT '',
      "clientPhone"       TEXT     NOT NULL DEFAULT '',
      "clientEmail"       TEXT     NOT NULL DEFAULT '',
      "carBrand"          TEXT     NOT NULL DEFAULT '',
      "carModel"          TEXT     NOT NULL DEFAULT '',
      "carColor"          TEXT     NOT NULL DEFAULT '',
      "carYear"           TEXT     NOT NULL DEFAULT '',
      "carKm"             TEXT     NOT NULL DEFAULT '',
      "carDamages"        TEXT     NOT NULL DEFAULT '',
      "carDetails"        TEXT     NOT NULL DEFAULT '',
      "servicePrice"      REAL     NOT NULL DEFAULT 0,
      "status"            TEXT     NOT NULL DEFAULT 'en curso',
      "createdAt"         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt"         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "userId"            TEXT     NOT NULL,
      "createdById"       TEXT     NOT NULL,
      "editedById"        TEXT,
      "assignedToId"      TEXT,
      CONSTRAINT "Task_userId_fkey"       FOREIGN KEY ("userId")       REFERENCES "User" ("id"),
      CONSTRAINT "Task_createdById_fkey"  FOREIGN KEY ("createdById")  REFERENCES "User" ("id"),
      CONSTRAINT "Task_editedById_fkey"   FOREIGN KEY ("editedById")   REFERENCES "User" ("id"),
      CONSTRAINT "Task_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User" ("id")
    )
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "Log" (
      "id"          TEXT     NOT NULL PRIMARY KEY,
      "action"      TEXT     NOT NULL,
      "description" TEXT     NOT NULL,
      "userId"      TEXT,
      "username"    TEXT     NOT NULL DEFAULT 'Sistema',
      "ip"          TEXT     NOT NULL DEFAULT '',
      "meta"        TEXT     NOT NULL DEFAULT '{}',
      "createdAt"   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt"   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  console.log('>>>>> Tablas verificadas (SQLite)');
};

// Crea el usuario administrador por defecto si la BD está vacía
export const firstRun = async () => {
  try {
    const count = await prisma.user.count();
    if (count > 0) return;

    const hash = await bcrypt.hash('Admin123456', 10);
    await prisma.user.create({
      data: {
        username:     'jduarte',
        email:        'jduarte@motiq.cl',
        password:     hash,
        nombres:      'Jimmy',
        apellidos:    'Duarte',
        cargo:        'superadmin',
        profileImage: '',
      }
    });

    console.log('✅ Primera ejecución: usuario administrador creado.');
    console.log('   Email:      jduarte@motiq.cl');
    console.log('   Contraseña: Admin123456');
  } catch (error) {
    console.error('❌ Error en firstRun:', error.message);
  }
};
