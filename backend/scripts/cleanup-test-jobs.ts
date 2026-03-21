/**
 * cleanup-test-jobs.ts
 * ---------------------
 * Deletes all jobs where:
 *   - title contains "Interview Test Job", OR
 *   - the owning organization name contains "Interview Test Org"
 *
 * Also removes every dependent record in the correct cascade order:
 *   InterviewSummary → InterviewMessage → InterviewSession →
 *   Interview → Notification (via meta.jobId) →
 *   SavedJob → Application → Job
 *
 * Run: npx ts-node --esm scripts/cleanup-test-jobs.ts
 */

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({ log: ['warn', 'error'] });

// ─── Colour helpers ──────────────────────────────────────────────────────────
const c = {
  red:    (s: string) => `\x1b[31m${s}\x1b[0m`,
  green:  (s: string) => `\x1b[32m${s}\x1b[0m`,
  yellow: (s: string) => `\x1b[33m${s}\x1b[0m`,
  cyan:   (s: string) => `\x1b[36m${s}\x1b[0m`,
  bold:   (s: string) => `\x1b[1m${s}\x1b[0m`,
  dim:    (s: string) => `\x1b[2m${s}\x1b[0m`,
};

async function main() {
  console.log(c.bold('\n═══════════════════════════════════════════════════'));
  console.log(c.bold('  JobNova — Cleanup Test Jobs'));
  console.log(c.bold('═══════════════════════════════════════════════════\n'));

  // ── STEP 1: Identify target organisations ──────────────────────────────────
  const targetOrgs = await prisma.organization.findMany({
    where: { name: { contains: 'Interview Test Org' } },
    select: { id: true, name: true },
  });
  const orgIds = targetOrgs.map((o) => o.id);

  console.log(c.cyan('📦 Target organisations:'));
  if (targetOrgs.length === 0) {
    console.log(c.dim('   (none found)'));
  } else {
    targetOrgs.forEach((o) =>
      console.log(`   • ${o.name}  ${c.dim('(' + o.id + ')')}`),
    );
  }

  // ── STEP 2: Identify target jobs ───────────────────────────────────────────
  const targetJobs = await prisma.job.findMany({
    where: {
      OR: [
        { title:          { contains: 'Interview Test Job' } },
        { organizationId: { in: orgIds.length ? orgIds : ['__none__'] } },
      ],
    },
    select: { id: true, title: true, partnerName: true },
  });
  const jobIds = targetJobs.map((j) => j.id);

  console.log(c.cyan('\n🗂  Target jobs:'));
  if (targetJobs.length === 0) {
    console.log(c.dim('   (none found)'));
    console.log(c.green('\n✅  Nothing to delete. Exiting.\n'));
    return;
  }
  targetJobs.forEach((j) =>
    console.log(`   • "${j.title}" (${j.partnerName})  ${c.dim('(' + j.id + ')')}`),
  );

  // ── STEP 3: Count dependents (DRY RUN) ────────────────────────────────────
  const applications = await prisma.application.findMany({
    where: { jobId: { in: jobIds } },
    select: { id: true },
  });
  const appIds = applications.map((a) => a.id);

  const sessions = await prisma.interviewSession.findMany({
    where: { jobId: { in: jobIds } },
    select: { id: true },
  });
  const sessionIds = sessions.map((s) => s.id);

  const [
    summaryCount,
    messageCount,
    scheduledInterviewCount,
    savedJobCount,
    notificationCount,
  ] = await Promise.all([
    prisma.interviewSummary.count({ where: { sessionId: { in: sessionIds } } }),
    prisma.interviewMessage.count({ where: { sessionId: { in: sessionIds } } }),
    prisma.interview.count({ where: { applicationId: { in: appIds } } }),
    prisma.savedJob.count({ where: { jobId: { in: jobIds } } }),
    // Count notifications via raw SQL (meta->>'jobId' is a JSON field, not a FK)
    jobIds.length > 0
      ? prisma.$queryRaw<[{ count: bigint }]>`
          SELECT COUNT(*)::bigint AS count
          FROM "Notification"
          WHERE meta->>'jobId' = ANY(${jobIds}::text[])
        `.then((r) => Number(r[0].count))
      : Promise.resolve(0),
  ]);

  console.log(c.yellow('\n📊 Records that WILL BE DELETED:'));
  console.log(c.bold('   ┌─────────────────────────────────┬────────┐'));
  const row = (label: string, n: number) =>
    console.log(`   │ ${label.padEnd(33)}│ ${String(n).padStart(5)}  │`);
  row('InterviewSummary',  summaryCount);
  row('InterviewMessage',  messageCount);
  row('InterviewSession',  sessions.length);
  row('Interview (scheduled)', scheduledInterviewCount);
  row('Notification (meta.jobId match)', notificationCount);
  row('SavedJob',          savedJobCount);
  row('Application',       appIds.length);
  row('Job',               jobIds.length);
  console.log(c.bold('   └─────────────────────────────────┴────────┘'));

  // ── STEP 4: Show the exact Prisma queries ──────────────────────────────────
  console.log(c.yellow('\n📝 Prisma delete queries (cascade order):'));
  console.log(c.dim(`
  // 1️⃣  InterviewSummary — deepest child of InterviewSession
  await prisma.interviewSummary.deleteMany({
    where: { sessionId: { in: sessionIds } }        // ${sessionIds.length} sessions
  });

  // 2️⃣  InterviewMessage — sibling of InterviewSummary
  await prisma.interviewMessage.deleteMany({
    where: { sessionId: { in: sessionIds } }        // ${messageCount} messages
  });

  // 3️⃣  InterviewSession — depends on both Application AND Job
  await prisma.interviewSession.deleteMany({
    where: { jobId: { in: jobIds } }                // ${sessions.length} sessions
  });

  // 4️⃣  Interview (scheduled) — depends on Application
  await prisma.interview.deleteMany({
    where: { applicationId: { in: appIds } }        // ${scheduledInterviewCount} interviews
  });

  // 5️⃣  Notification — NO FK to Job; jobId lives in meta JSON → raw SQL
  await prisma.$executeRaw\`
    DELETE FROM "Notification"
    WHERE meta->>'jobId' = ANY(\${jobIds}::text[])
  \`;                                                // ~${notificationCount} notifications

  // 6️⃣  SavedJob — depends on Job
  await prisma.savedJob.deleteMany({
    where: { jobId: { in: jobIds } }                // ${savedJobCount} saved jobs
  });

  // 7️⃣  Application — depends on Job
  await prisma.application.deleteMany({
    where: { jobId: { in: jobIds } }                // ${appIds.length} applications
  });

  // 8️⃣  Job — the target rows
  await prisma.job.deleteMany({
    where: { id: { in: jobIds } }                   // ${jobIds.length} jobs
  });
`));

  // ── STEP 5: Confirm ────────────────────────────────────────────────────────
  console.log(c.red(c.bold('⚠️   THIS WILL PERMANENTLY DELETE THE ABOVE DATA.')));
  console.log(c.dim('    Proceeding in 3 seconds — press Ctrl+C to cancel...\n'));
  await new Promise((r) => setTimeout(r, 3000));

  // ── STEP 6: Execute inside a transaction ──────────────────────────────────
  console.log(c.cyan('🚀 Executing inside a Prisma transaction...\n'));

  const result = await prisma.$transaction(async (tx) => {
    const deleted = {
      interviewSummaries: 0,
      interviewMessages: 0,
      interviewSessions: 0,
      interviews: 0,
      notifications: 0,
      savedJobs: 0,
      applications: 0,
      jobs: 0,
    };

    if (sessionIds.length > 0) {
      // 1. InterviewSummary
      const r1 = await tx.interviewSummary.deleteMany({
        where: { sessionId: { in: sessionIds } },
      });
      deleted.interviewSummaries = r1.count;
      console.log(`   ✓ InterviewSummary   deleted: ${c.green(String(r1.count))}`);

      // 2. InterviewMessage
      const r2 = await tx.interviewMessage.deleteMany({
        where: { sessionId: { in: sessionIds } },
      });
      deleted.interviewMessages = r2.count;
      console.log(`   ✓ InterviewMessage   deleted: ${c.green(String(r2.count))}`);

      // 3. InterviewSession
      const r3 = await tx.interviewSession.deleteMany({
        where: { jobId: { in: jobIds } },
      });
      deleted.interviewSessions = r3.count;
      console.log(`   ✓ InterviewSession   deleted: ${c.green(String(r3.count))}`);
    }

    if (appIds.length > 0) {
      // 4. Interview (scheduled)
      const r4 = await tx.interview.deleteMany({
        where: { applicationId: { in: appIds } },
      });
      deleted.interviews = r4.count;
      console.log(`   ✓ Interview          deleted: ${c.green(String(r4.count))}`);
    }

    // 5. Notification (raw SQL — meta JSON field, no FK)
    if (jobIds.length > 0) {
      const r5 = await tx.$executeRaw`
        DELETE FROM "Notification"
        WHERE meta->>'jobId' = ANY(${jobIds}::text[])
      `;
      deleted.notifications = r5;
      console.log(`   ✓ Notification       deleted: ${c.green(String(r5))}`);
    }

    // 6. SavedJob
    const r6 = await tx.savedJob.deleteMany({
      where: { jobId: { in: jobIds } },
    });
    deleted.savedJobs = r6.count;
    console.log(`   ✓ SavedJob           deleted: ${c.green(String(r6.count))}`);

    // 7. Application
    const r7 = await tx.application.deleteMany({
      where: { jobId: { in: jobIds } },
    });
    deleted.applications = r7.count;
    console.log(`   ✓ Application        deleted: ${c.green(String(r7.count))}`);

    // 8. Job
    const r8 = await tx.job.deleteMany({
      where: { id: { in: jobIds } },
    });
    deleted.jobs = r8.count;
    console.log(`   ✓ Job                deleted: ${c.green(String(r8.count))}`);

    return deleted;
  });

  // ── STEP 7: Summary ───────────────────────────────────────────────────────
  const total = Object.values(result).reduce((a, b) => a + b, 0);
  console.log(c.bold(c.green(`\n✅ Done! ${total} total records deleted successfully.\n`)));
  console.log(c.dim('   Breakdown:'));
  Object.entries(result).forEach(([k, v]) =>
    console.log(`   ${c.dim('•')} ${k.padEnd(22)}: ${v}`),
  );
  console.log();
}

main()
  .catch((e) => {
    console.error(c.red('\n❌ Error:'), e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
