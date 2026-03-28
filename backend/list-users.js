const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.user.findMany({ select: { id: true, email: true, fullName: true, role: true, emailVerified: true } }).then(u => { console.table(u); prisma.$disconnect(); });
