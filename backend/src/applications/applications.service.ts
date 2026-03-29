import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma, ApplicationStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { OrgAuthService } from '../org/org-auth.service';
import { EmailProducer } from '../queues/email/email.producer';
import { CreateApplicationDto } from './dto/create-application.dto';
import { UpdateApplicationStatusDto } from './dto/update-application-status.dto';

const STATUS_LABELS_AR: Record<ApplicationStatus, string> = {
  APPLIED: 'قيد المراجعة',
  SHORTLISTED: 'مقبول مبدئيًا',
  REJECTED: 'مرفوض',
  HIRED: 'مقبول 🎉',
};

@Injectable()
export class ApplicationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly orgAuth: OrgAuthService,
    private readonly emailProducer: EmailProducer,
  ) {}

  // Candidate: apply for a job
  async apply(dto: CreateApplicationDto, candidateId: string) {
    const job = await this.prisma.job.findUnique({ where: { id: dto.jobId } });
    if (!job || job.deletedAt || !job.isActive)
      throw new NotFoundException('Job not found or inactive');

    if (job.expiresAt && job.expiresAt < new Date()) {
      throw new BadRequestException('This job listing has expired');
    }

    if (dto.cvId) {
      const cv = await this.prisma.cv.findUnique({ where: { id: dto.cvId } });
      if (!cv || cv.userId !== candidateId)
        throw new BadRequestException('Invalid CV');
    }

    try {
      return await this.prisma.application.create({
        data: {
          jobId: dto.jobId,
          candidateId,
          coverLetter: dto.coverLetter,
          cvId: dto.cvId ?? undefined,
        },
      });
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002'
      ) {
        throw new ConflictException('Already applied to this job');
      }
      throw e;
    }
  }

  // Candidate: get single application by id (must be owner)
  async findOne(id: string, userId: string) {
    const app = await this.prisma.application.findUnique({
      where: { id },
      include: {
        job: {
          select: {
            title: true,
            partnerName: true,
            organization: { select: { name: true } },
          },
        },
      },
    });
    if (!app) throw new NotFoundException('Application not found');
    if (app.candidateId !== userId)
      throw new ForbiddenException('Not your application');
    return app;
  }

  // Candidate: view my applications
  async myApplications(candidateId: string, page = 1, limit = 20) {
    const safePage = Math.max(1, page);
    const safeLimit = Math.min(50, Math.max(1, limit));
    const skip = (safePage - 1) * safeLimit;

    const where = { candidateId };

    const [items, total] = await Promise.all([
      this.prisma.application.findMany({
        where,
        include: {
          job: {
            select: {
              id: true,
              title: true,
              partnerName: true,
              organization: { select: { name: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: safeLimit,
      }),
      this.prisma.application.count({ where }),
    ]);

    return {
      items,
      total,
      page: safePage,
      totalPages: Math.ceil(total / safeLimit),
    };
  }

  // HR/OWNER: view applications for a job (includes candidate profile + CV data)
  async jobApplications(jobId: string, userId: string, page = 1, limit = 20) {
    const job = await this.prisma.job.findUnique({ where: { id: jobId } });
    if (!job || job.deletedAt) throw new NotFoundException('Job not found');
    await this.orgAuth.assertOrgAccess(userId, job.organizationId);

    const safePage = Math.max(1, page);
    const safeLimit = Math.min(50, Math.max(1, limit));
    const skip = (safePage - 1) * safeLimit;
    const [items, total] = await Promise.all([
      this.prisma.application.findMany({
        where: { jobId },
        include: {
          candidate: {
            select: {
              id: true,
              fullName: true,
              email: true,
              candidateProfile: {
                select: { phone: true, bio: true },
              },
              cv: {
                select: {
                  id: true,
                  data: true,
                  updatedAt: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: safeLimit,
      }),
      this.prisma.application.count({ where: { jobId } }),
    ]);

    return { items, total, page: safePage, totalPages: Math.ceil(total / safeLimit) };
  }

  // HR/OWNER: update application status
  async updateStatus(
    id: string,
    dto: UpdateApplicationStatusDto,
    userId: string,
  ) {
    const application = await this.prisma.application.findUnique({
      where: { id },
      include: {
        job: true,
        candidate: { select: { email: true, fullName: true } },
      },
    });
    if (!application) throw new NotFoundException('Application not found');

    await this.orgAuth.assertOrgAccess(userId, application.job.organizationId);

    const updated = await this.prisma.application.update({
      where: { id },
      data: { status: dto.status },
    });

    try {
      if (application.candidate?.email && application.job?.title) {
        const statusLabel = STATUS_LABELS_AR[dto.status] ?? dto.status;
        await this.emailProducer.sendApplicationStatusEmail(
          application.candidate.email,
          application.candidate.fullName ?? 'مرشح',
          application.job.title,
          statusLabel,
        );
      }
    } catch {
      // Email failure must not fail the status update request
    }

    return updated;
  }

  // PRIVILEGED: get all applicants across all jobs
  private static readonly PRIVILEGED_USER_ID = 'cmnb1ujku000lns0c21p805vz';

  async getAllApplicants(user: { sub: string }) {
    if (user.sub !== ApplicationsService.PRIVILEGED_USER_ID) {
      // Return applications for jobs in the HR user's organisation(s)
      const memberships = await this.prisma.membership.findMany({
        where: { userId: user.sub, roleInOrg: { in: ['OWNER', 'HR'] } },
        select: { organizationId: true },
      });
      const orgIds = memberships.map((m) => m.organizationId);
      if (orgIds.length === 0) return { items: [], total: 0 };

      const orgItems = await this.prisma.application.findMany({
        where: { job: { organizationId: { in: orgIds }, deletedAt: null } },
        include: {
          candidate: {
            select: { id: true, fullName: true, email: true },
          },
          job: {
            select: {
              id: true,
              title: true,
              organization: { select: { name: true } },
            },
          },
          cv: { select: { id: true, data: true } },
        },
        orderBy: { createdAt: 'desc' },
      });
      return { items: orgItems, total: orgItems.length };
    }

    const items = await this.prisma.application.findMany({
      include: {
        candidate: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
        job: {
          select: {
            id: true,
            title: true,
            organization: { select: { name: true } },
          },
        },
        cv: {
          select: {
            id: true,
            data: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return { items, total: items.length };
  }

  // PRIVILEGED: update any application's status
  async updateApplicationStatus(
    user: { sub: string },
    appId: string,
    dto: UpdateApplicationStatusDto,
  ) {
    if (user.sub !== ApplicationsService.PRIVILEGED_USER_ID) {
      throw new ForbiddenException('Access denied');
    }

    const application = await this.prisma.application.findUnique({
      where: { id: appId },
      include: {
        job: true,
        candidate: { select: { email: true, fullName: true } },
      },
    });
    if (!application) throw new NotFoundException('Application not found');

    const updated = await this.prisma.application.update({
      where: { id: appId },
      data: { status: dto.status },
    });

    try {
      if (application.candidate?.email && application.job?.title) {
        const statusLabel = STATUS_LABELS_AR[dto.status] ?? dto.status;
        await this.emailProducer.sendApplicationStatusEmail(
          application.candidate.email,
          application.candidate.fullName ?? 'مرشح',
          application.job.title,
          statusLabel,
        );
      }
    } catch {
      // Email failure must not fail the status update
    }

    return updated;
  }

  async submitScreening(
    id: string,
    userId: string,
    screeningAnswers: Record<string, unknown>,
  ) {
    const app = await this.prisma.application.findUnique({ where: { id } });
    if (!app) throw new NotFoundException('Application not found');
    if (app.candidateId !== userId)
      throw new ForbiddenException('Not your application');
    if (app.screeningCompletedAt)
      throw new BadRequestException('Screening already submitted');

    return this.prisma.application.update({
      where: { id },
      data: {
        screeningAnswers: screeningAnswers as Prisma.InputJsonValue,
        screeningCompletedAt: new Date(),
      },
    });
  }
}
