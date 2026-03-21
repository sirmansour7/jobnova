import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InterviewStatus, OrgRoleInOrg } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { EmailService } from '../email/email.service';

// ── Inline type helpers (avoids deep ReturnType inference issues) ─────────────
type HrUser = { id: string; fullName: string; email: string };
type HrMembership = { user: HrUser };
type OrgWithMembers = { memberships: HrMembership[] };

type JobWithOrg = {
  id: string;
  title: string;
  organizationId: string;
  organization: OrgWithMembers;
};

type CandidateUser = { id: string; fullName: string; email: string };
type AppWithJobAndCandidate = {
  application: {
    candidate: CandidateUser;
    job: JobWithOrg;
  };
};

type InterviewRow = {
  id: string;
  scheduledAt: Date;
} & AppWithJobAndCandidate;

type PendingAppRow = {
  id: string;
  jobId: string;
  createdAt: Date;
  job: JobWithOrg;
};

type JobExpiryRow = {
  id: string;
  title: string;
  expiresAt: Date | null;
  organization: OrgWithMembers;
};

@Injectable()
export class RemindersService {
  private readonly logger = new Logger(RemindersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly email: EmailService,
  ) {}

  // ── 1. Interview Reminder — runs every hour ────────────────────────────────
  @Cron(CronExpression.EVERY_HOUR)
  async sendInterviewReminders(): Promise<void> {
    this.logger.log('Running interview reminder cron');

    const in24h = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const in23h = new Date(Date.now() + 23 * 60 * 60 * 1000);

    let interviews: InterviewRow[];

    try {
      interviews = (await this.prisma.interview.findMany({
        where: {
          status: InterviewStatus.SCHEDULED,
          scheduledAt: { gte: in23h, lte: in24h },
        },
        include: {
          application: {
            include: {
              candidate: { select: { id: true, fullName: true, email: true } },
              job: {
                select: {
                  id: true,
                  title: true,
                  organizationId: true,
                  organization: {
                    include: {
                      memberships: {
                        where: {
                          roleInOrg: {
                            in: [OrgRoleInOrg.OWNER, OrgRoleInOrg.HR],
                          },
                        },
                        include: {
                          user: {
                            select: {
                              id: true,
                              fullName: true,
                              email: true,
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      })) as unknown as InterviewRow[];
    } catch (err) {
      this.logger.error(
        `Interview reminder cron failed to query DB: ${(err as Error).message}`,
      );
      return;
    }

    this.logger.log(`Interview reminder: found ${interviews.length} interviews`);

    for (const interview of interviews) {
      const { application } = interview;
      const { candidate, job } = application;
      const scheduledAt = interview.scheduledAt;

      // Notify candidate
      try {
        await this.notifications.create(
          candidate.id,
          'INTERVIEW_REMINDER',
          'تذكير بموعد مقابلتك',
          `لديك مقابلة عمل لوظيفة "${job.title}" غداً`,
          { interviewId: interview.id, jobId: job.id },
        );
        await this.email.sendInterviewReminderEmail(
          candidate.email,
          candidate.fullName,
          job.title,
          scheduledAt,
          'candidate',
        );
      } catch (err) {
        this.logger.error(
          `Failed to notify candidate ${candidate.id} for interview ${interview.id}: ${(err as Error).message}`,
        );
      }

      // Notify HR members
      for (const membership of job.organization.memberships) {
        const hrUser = membership.user;
        try {
          await this.notifications.create(
            hrUser.id,
            'INTERVIEW_REMINDER',
            'تذكير: مقابلة مجدولة غداً',
            `مقابلة مجدولة لوظيفة "${job.title}" مع المرشح ${candidate.fullName}`,
            {
              interviewId: interview.id,
              jobId: job.id,
              candidateId: candidate.id,
            },
          );
          await this.email.sendInterviewReminderEmail(
            hrUser.email,
            hrUser.fullName,
            job.title,
            scheduledAt,
            'hr',
          );
        } catch (err) {
          this.logger.error(
            `Failed to notify HR ${hrUser.id} for interview ${interview.id}: ${(err as Error).message}`,
          );
        }
      }
    }

    this.logger.log('Interview reminder cron complete');
  }

  // ── 2. Pending Applications — daily at 9AM ─────────────────────────────────
  @Cron('0 9 * * *')
  async notifyPendingApplications(): Promise<void> {
    this.logger.log('Running pending applications cron');

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    let pending: PendingAppRow[];

    try {
      pending = (await this.prisma.application.findMany({
        where: {
          status: 'APPLIED',
          createdAt: { lt: sevenDaysAgo },
        },
        include: {
          job: {
            select: {
              id: true,
              title: true,
              organizationId: true,
              organization: {
                include: {
                  memberships: {
                    where: {
                      roleInOrg: {
                        in: [OrgRoleInOrg.OWNER, OrgRoleInOrg.HR],
                      },
                    },
                    include: {
                      user: {
                        select: { id: true, fullName: true, email: true },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      })) as unknown as PendingAppRow[];
    } catch (err) {
      this.logger.error(
        `Pending applications cron failed to query DB: ${(err as Error).message}`,
      );
      return;
    }

    this.logger.log(
      `Pending applications: found ${pending.length} applications pending >7 days`,
    );

    // Group by organizationId then by jobId
    const byOrg = new Map<
      string,
      Map<string, { job: JobWithOrg; count: number }>
    >();

    for (const app of pending) {
      const orgId = app.job.organizationId;
      if (!byOrg.has(orgId)) {
        byOrg.set(orgId, new Map());
      }
      const byJob = byOrg.get(orgId)!;
      const existing = byJob.get(app.jobId);
      if (existing) {
        existing.count += 1;
      } else {
        byJob.set(app.jobId, { job: app.job, count: 1 });
      }
    }

    for (const [, jobMap] of byOrg) {
      for (const [, { job, count }] of jobMap) {
        for (const membership of job.organization.memberships) {
          const hrUser = membership.user;
          try {
            await this.notifications.create(
              hrUser.id,
              'PENDING_APPLICATIONS',
              'طلبات توظيف معلقة',
              `يوجد ${count} طلب توظيف معلق لوظيفة "${job.title}" منذ أكثر من 7 أيام`,
              { jobId: job.id, pendingCount: count },
            );
            await this.email.sendPendingApplicationsEmail(
              hrUser.email,
              hrUser.fullName,
              count,
              job.title,
            );
          } catch (err) {
            this.logger.error(
              `Failed to notify HR ${hrUser.id} about pending applications for job ${job.id}: ${(err as Error).message}`,
            );
          }
        }
      }
    }

    this.logger.log('Pending applications cron complete');
  }

  // ── 3. Job Expiry — daily at 6AM ───────────────────────────────────────────
  @Cron('0 6 * * *')
  async notifyJobExpiry(): Promise<void> {
    this.logger.log('Running job expiry cron');

    const now = new Date();
    const in3days = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);

    let jobs: JobExpiryRow[];

    try {
      jobs = (await this.prisma.job.findMany({
        where: {
          isActive: true,
          deletedAt: null,
          expiresAt: { gte: now, lte: in3days },
        },
        include: {
          organization: {
            include: {
              memberships: {
                where: {
                  roleInOrg: { in: [OrgRoleInOrg.OWNER, OrgRoleInOrg.HR] },
                },
                include: {
                  user: {
                    select: { id: true, fullName: true, email: true },
                  },
                },
              },
            },
          },
        },
      })) as unknown as JobExpiryRow[];
    } catch (err) {
      this.logger.error(
        `Job expiry cron failed to query DB: ${(err as Error).message}`,
      );
      return;
    }

    this.logger.log(`Job expiry: found ${jobs.length} jobs expiring in 3 days`);

    for (const job of jobs) {
      // expiresAt is guaranteed non-null by the query filter (gte: now)
      const expiresAt = job.expiresAt as Date;

      for (const membership of job.organization.memberships) {
        const hrUser = membership.user;
        try {
          await this.notifications.create(
            hrUser.id,
            'JOB_EXPIRY',
            'تنبيه: وظيفة ستنتهي قريباً',
            `وظيفة "${job.title}" ستنتهي صلاحيتها خلال 3 أيام`,
            { jobId: job.id, expiresAt: expiresAt.toISOString() },
          );
          await this.email.sendJobExpiryEmail(
            hrUser.email,
            hrUser.fullName,
            job.title,
            expiresAt,
          );
        } catch (err) {
          this.logger.error(
            `Failed to notify HR ${hrUser.id} about job expiry for job ${job.id}: ${(err as Error).message}`,
          );
        }
      }
    }

    this.logger.log('Job expiry cron complete');
  }
}
