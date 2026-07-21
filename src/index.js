import app from './app.js';
import { connectDB } from './db.js';
import { initDatabase, firstRun } from './firstRun.js';
import { purgeOldLogs } from './controllers/log.controller.js';
import { migrateEncryption } from './lib/migration.js';
import 'dotenv/config';

const PORT = process.env.PORT || 3000;

const startServer = async () => {
  try {
    await connectDB();
    await initDatabase();
    await firstRun();
    await migrateEncryption();  // Cifrar datos existentes en texto plano (idempotente)
    await purgeOldLogs();

    app.listen(PORT, () => {
      console.log(`Server on port ${PORT}`);
    });
  } catch (error) {
    console.error('Error al iniciar el servidor:', error);
  }
};

startServer();
