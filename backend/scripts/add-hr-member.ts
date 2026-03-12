import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const org = await prisma.organization.findFirst({
    where: { name: 'JobNova Partners' },
  });
  if (!org) throw new Error('Org not found');

  const hr = await prisma.user.findFirst({
    where: { email: 'theotheo519@gmail.com' },
  });
  if (!hr) throw new Error('HR user not found');

  const existing = await prisma.membership.findFirst({
    where: { userId: hr.id, organizationId: org.id },
  });
  if (existing) {
    console.log('Already a member');
    return;
  }

  await prisma.membership.create({
    data: {
      userId: hr.id,
      organizationId: org.id,
      roleInOrg: 'OWNER',
    },
  });
  console.log('Done! HR is now owner of JobNova Partners');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
