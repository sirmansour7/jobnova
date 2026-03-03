import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateJobDto } from './dto/create-job.dto';
import { UpdateJobDto } from './dto/update-job.dto';

@Injectable()
export class JobsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(filters?: {
    category?: string;
    governorate?: string;
    isActive?: boolean;
  }) {
    return this.prisma.job.findMany({
      where: {
        isActive: filters?.isActive ?? true,
        ...(filters?.category && { category: filters.category }),
        ...(filters?.governorate && { governorate: filters.governorate }),
      },
      select: {
        id: true,
        title: true,
        partnerName: true,
        description: true,
        governorate: true,
        city: true,
        category: true,
        isActive: true,
        createdAt: true,
        organization: { select: { id: true, name: true } },
        _count: { select: { applications: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const job = await this.prisma.job.findUnique({
      where: { id },
      include: {
        organization: { select: { id: true, name: true } },
        _count: { select: { applications: true } },
      },
    });
    if (!job) throw new NotFoundException('Job not found');
    return job;
  }

  async create(dto: CreateJobDto, userId: string) {
    // Verify user is OWNER or HR in this organization
    await this.assertOrgAccess(userId, dto.organizationId);

    return this.prisma.job.create({
      data: {
        organizationId: dto.organizationId,
        title: dto.title,
        partnerName: dto.partnerName,
        description: dto.description,
        governorate: dto.governorate,
        city: dto.city,
        category: dto.category,
      },
    });
  }

  async update(id: string, dto: UpdateJobDto, userId: string) {
    const job = await this.prisma.job.findUnique({ where: { id } });
    if (!job) throw new NotFoundException('Job not found');

    await this.assertOrgAccess(userId, job.organizationId);

    return this.prisma.job.update({ where: { id }, data: dto });
  }

  async remove(id: string, userId: string) {
    const job = await this.prisma.job.findUnique({ where: { id } });
    if (!job) throw new NotFoundException('Job not found');

    await this.assertOrgAccess(userId, job.organizationId);

    await this.prisma.job.delete({ where: { id } });
    return { message: 'Job deleted successfully' };
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
