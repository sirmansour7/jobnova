import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Linking jobs to governorate/city FKs...');

  const governorates = await prisma.governorate.findMany({ include: { cities: true } });
  const govMap = new Map(governorates.map((g) => [g.name, g]));

  const jobs = await prisma.job.findMany({
    where: { governorateId: null },
    select: { id: true, governorate: true, city: true },
  });

  console.log(`Found ${jobs.length} jobs to process`);

  let linked = 0;
  let skipped = 0;

  for (const job of jobs) {
    if (!job.governorate) { skipped++; continue; }

    const gov = govMap.get(job.governorate);
    if (!gov) { skipped++; continue; }

    const city = job.city
      ? gov.cities.find((c) => c.name === job.city) ?? null
      : null;

    await prisma.job.update({
      where: { id: job.id },
      data: {
        governorateId: gov.id,
        cityId: city?.id ?? null,
      },
    });
    linked++;
  }

  console.log(`Done. Linked: ${linked}, Skipped: ${skipped}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
