import { PrismaClient } from '@prisma/client';

// Singleton para no abrir múltiples conexiones
const prisma = new PrismaClient();

export const connectDB = async () => {
  try {
    await prisma.$connect();
    console.log('>>>>> DB is connected → SQLite');
  } catch (error) {
    console.error('Error conectando a la DB:', error);
    throw error;
  }
};

export default prisma;
