import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Preview first
  const toDelete = await prisma.job.findMany({
    where: {
      OR: [
        {
          organization: {
            name: 'Interview Test Org',
          },
        },
        {
          title: {
            contains: 'Interview Test Job',
            mode: 'insensitive',
          },
        },
      ],
    },
    select: {
      id: true,
      title: true,
      organization: { select: { name: true } },
    },
  });

  if (toDelete.length === 0) {
    console.log('✅ No matching jobs found. Nothing to delete.');
    return;
  }

  console.log(`\n🔍 Found ${toDelete.length} job(s) to delete:\n`);
  toDelete.forEach((job) => {
    console.log(`  - [${job.id}] "${job.title}" (Org: ${job.organization.name})`);
  });

  // Execute delete
  const result = await prisma.job.deleteMany({
    where: {
      OR: [
        {
          organization: {
            name: 'Interview Test Org',
          },
        },
        {
          title: {
            contains: 'Interview Test Job',
            mode: 'insensitive',
          },
        },
      ],
    },
  });

  console.log(`\n🗑️  Successfully deleted ${result.count} job(s).`);
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
