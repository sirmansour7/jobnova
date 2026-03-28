const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const ids = [
  'cmn5giizz0004pc0coo50xfmk',
  'cmn9lt2tu0000mn0c9m6n67u6',
  'cmn9mzd8j0000ni0cu2q1d49q',
  'cmn0zr07q0006u9t0t01ram19'
];
prisma.user.deleteMany({ where: { id: { in: ids } } }).then(r => { console.log('Deleted:', r.count); prisma.$disconnect(); });
