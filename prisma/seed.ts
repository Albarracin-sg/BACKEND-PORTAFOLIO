import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function seedAdminUser() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  
  if (!email || !password) {
    console.warn('⚠️ Saltando seed de admin: ADMIN_EMAIL o ADMIN_PASSWORD no definidos en el .env');
    return;
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log('ℹ️ El usuario administrador ya existe.');
    return;
  }

  const hashed = await bcrypt.hash(password, 10);
  await prisma.user.create({
    data: {
      email,
      password: hashed,
      role: 'ADMIN',
    },
  });
  console.log('✅ Usuario administrador creado con éxito.');
}

async function main() {
  await seedAdminUser();
}

main()
  .catch((error) => {
    console.error('❌ Error en el seeding:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
