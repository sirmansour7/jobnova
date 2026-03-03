import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateApplicationDto } from './dto/create-application.dto';
import { UpdateApplicationStatusDto } from './dto/update-application-status.dto';

@Injectable()
export class ApplicationsService {
  constructor(private readonly prisma: PrismaService) {}

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

  // Candidate: view my applications
  async myApplications(candidateId: string) {
    return this.prisma.application.findMany({
      where: { candidateId },
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
    });
  }

  // HR/OWNER: view applications for a job
  async jobApplications(jobId: string, userId: string) {
    const job = await this.prisma.job.findUnique({ where: { id: jobId } });
    if (!job) throw new NotFoundException('Job not found');

    await this.assertOrgAccess(userId, job.organizationId);

    return this.prisma.application.findMany({
      where: { jobId },
      include: {
        candidate: { select: { id: true, fullName: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
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

    await this.assertOrgAccess(userId, application.job.organizationId);

    return this.prisma.application.update({
      where: { id },
      data: { status: dto.status },
    });
  }

  private async assertOrgAccess(userId: string, organizationId: string) {
    const membership = await this.prisma.membership.findUnique({
      where: { userId_organizationId: { userId, organizationId } },
    });
    if (!membership || membership.roleInOrg === 'MEMBER') {
      throw new ForbiddenException('Not authorized for this organization');
    }
  }
}
