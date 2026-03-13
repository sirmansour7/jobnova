import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Linking jobs to governorate/city FKs...');

  const governorates = await prisma.governorate.findMany({ include: { cities: true } });
  const govMap = new Map(governorates.map((g) => [g.name, g]));

  const jobs = await prisma.job.findMany({
    where: { governorateId: null },
    select: { id: true, governorateId: true, cityId: true },
  });

  console.log('Note: governorate/city string columns removed. Script complete.');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
