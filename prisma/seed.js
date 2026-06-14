const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();

async function main() {
  console.log('Cleaning and Seeding...');

  // 1. تنظيف الجداول القديمة عشان نبدأ على نظافة
  await prisma.user.deleteMany({});
  await prisma.userRole.deleteMany({});

  // 2. إنشاء الأدوار بـ slugs واضحة
  const adminRole = await prisma.userRole.create({
    data: {
      slug: 'admin',
      name: 'ADMIN',
      description: 'مدير النظام',
    },
  });

  const citizenRole = await prisma.userRole.create({
    data: {
      slug: 'citizen',
      name: 'CITIZEN',
      description: 'مواطن عادي',
      isDefault: true,
    },
  });

  const password = await bcrypt.hash('123456', 10);

  // 3. إنشاء مستخدم Admin
  await prisma.user.create({
    data: {
      email: 'admin@test.com',
      name: 'Admin User',
      password: password,
      roleId: adminRole.id, // هون الربط
      status: 'ACTIVE',
    },
  });

  // 4. إنشاء مستخدم Citizen
  await prisma.user.create({
    data: {
      email: 'citizen@test.com',
      name: 'Citizen User',
      password: password,
      roleId: citizenRole.id, // هون الربط
      status: 'ACTIVE',
    },
  });

  console.log('Done! Check your database now.');
}

main().catch(e => console.error(e)).finally(() => prisma.$disconnect());