import app from './app.js';
import { connectDB } from './db.js';
import { initDatabase, firstRun } from './firstRun.js';
import 'dotenv/config';

const PORT = process.env.PORT || 3000;

const startServer = async () => {
  try {
    await connectDB();        // Conectar Prisma
    await initDatabase();     // Crear tablas si no existen
    await firstRun();         // Crear admin por defecto si BD vacía

    app.listen(PORT, () => {
      console.log(`Server on port ${PORT}`);
    });
  } catch (error) {
    console.error('Error al iniciar el servidor:', error);
  }
};

startServer();
