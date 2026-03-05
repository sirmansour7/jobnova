import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { OrgAuthService } from '../org/org-auth.service';
import { CreateApplicationDto } from './dto/create-application.dto';
import { UpdateApplicationStatusDto } from './dto/update-application-status.dto';

@Injectable()
export class ApplicationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly orgAuth: OrgAuthService,
  ) {}

  // Candidate: apply for a job
  async apply(dto: CreateApplicationDto, candidateId: string) {
    const job = await this.prisma.job.findUnique({ where: { id: dto.jobId } });
    if (!job || !job.isActive)
      throw new NotFoundException('Job not found or inactive');

    const existing = await this.prisma.application.findUnique({
      where: { jobId_candidateId: { jobId: dto.jobId, candidateId } },
    });
    if (existing) throw new ConflictException('Already applied to this job');

    return this.prisma.application.create({
      data: {
        jobId: dto.jobId,
        candidateId,
        coverLetter: dto.coverLetter,
      },
    });
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

  // HR/OWNER: view applications for a job
  async jobApplications(jobId: string, userId: string, page = 1, limit = 20) {
    const job = await this.prisma.job.findUnique({ where: { id: jobId } });
    if (!job) throw new NotFoundException('Job not found');
    await this.orgAuth.assertOrgAccess(userId, job.organizationId);

    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      this.prisma.application.findMany({
        where: { jobId },
        include: {
          candidate: { select: { id: true, fullName: true, email: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.application.count({ where: { jobId } }),
    ]);

    return { items, total, page, totalPages: Math.ceil(total / limit) };
  }

  // HR/OWNER: update application status
  async updateStatus(
    id: string,
    dto: UpdateApplicationStatusDto,
    userId: string,
  ) {
    const application = await this.prisma.application.findUnique({
      where: { id },
      include: { job: true },
    });
    if (!application) throw new NotFoundException('Application not found');

    await this.orgAuth.assertOrgAccess(userId, application.job.organizationId);

    return this.prisma.application.update({
      where: { id },
      data: { status: dto.status },
    });
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
