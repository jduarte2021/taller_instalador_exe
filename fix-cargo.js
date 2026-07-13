import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const updated = await prisma.user.updateMany({
  where: { email: 'jduarte@tallerdata.cl' },
  data:  { cargo: 'superadmin' },
});

console.log(`Usuarios actualizados: ${updated.count}`);
await prisma.$disconnect();
