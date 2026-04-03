/**
 * One-time fix: promote HR users whose org membership is stuck as MEMBER.
 *
 * Root cause: assignHr() used createMany({ skipDuplicates: true }) which
 * silently dropped the HR assignment when the user already had a MEMBER
 * record in the same org (@@unique[userId, organizationId] conflict).
 *
 * Run once:
 *   npx ts-node --project tsconfig.json -e "require('./prisma/fix-hr-memberships')"
 * or via the npm script:
 *   npm run fix:hr-memberships
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Find all users whose account role is 'hr'
  const hrUsers = await prisma.user.findMany({
    where: { role: 'hr', deletedAt: null },
    select: { id: true, email: true, fullName: true },
  });

  console.log(`Found ${hrUsers.length} HR user(s) to check.`);

  let fixed = 0;

  for (const user of hrUsers) {
    // Find any MEMBER memberships for this HR user
    const memberMemberships = await prisma.membership.findMany({
      where: { userId: user.id, roleInOrg: 'MEMBER' },
      select: { id: true, organizationId: true, organization: { select: { name: true } } },
    });

    if (memberMemberships.length === 0) continue;

    for (const m of memberMemberships) {
      await prisma.membership.update({
        where: { id: m.id },
        data: { roleInOrg: 'HR' },
      });

      console.log(
        `  ✓ Promoted ${user.fullName ?? user.email} → ${m.organization.name} : MEMBER → HR`,
      );
      fixed++;
    }
  }

  if (fixed === 0) {
    console.log('No stuck memberships found — nothing to fix.');
  } else {
    console.log(`\nDone. Fixed ${fixed} membership(s).`);
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
