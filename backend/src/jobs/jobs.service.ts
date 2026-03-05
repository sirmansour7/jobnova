import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OrgAuthService } from '../org/org-auth.service';
import { CreateJobDto } from './dto/create-job.dto';
import { UpdateJobDto } from './dto/update-job.dto';

@Injectable()
export class JobsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly orgAuth: OrgAuthService,
  ) {}

  async findAll(filters?: {
    category?: string;
    governorate?: string;
    isActive?: boolean;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const page = Math.max(1, filters?.page ?? 1);
    const limit = Math.min(50, Math.max(1, filters?.limit ?? 20));
    const skip = (page - 1) * limit;

    const where = {
      isActive: filters?.isActive ?? true,
      ...(filters?.category && { category: filters.category }),
      ...(filters?.governorate && { governorate: filters.governorate }),
      ...(filters?.search && {
        OR: [
          { title: { contains: filters.search, mode: 'insensitive' as const } },
          {
            partnerName: {
              contains: filters.search,
              mode: 'insensitive' as const,
            },
          },
          {
            description: {
              contains: filters.search,
              mode: 'insensitive' as const,
            },
          },
        ],
      }),
    };

    const [items, total] = await Promise.all([
      this.prisma.job.findMany({
        where,
        select: {
          id: true,
          title: true,
          partnerName: true,
          description: true,
          governorate: true,
          city: true,
          category: true,
          jobType: true,
          salaryMin: true,
          salaryMax: true,
          currency: true,
          expiresAt: true,
          isActive: true,
          createdAt: true,
          organization: { select: { id: true, name: true } },
          _count: { select: { applications: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.job.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
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
    await this.orgAuth.assertOrgAccess(userId, dto.organizationId);

    return this.prisma.job.create({
      data: {
        organizationId: dto.organizationId,
        title: dto.title,
        partnerName: dto.partnerName,
        description: dto.description,
        governorate: dto.governorate,
        city: dto.city,
        category: dto.category,
        jobType: dto.jobType,
        salaryMin: dto.salaryMin,
        salaryMax: dto.salaryMax,
        currency: dto.currency,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
      },
    });
  }

  async update(id: string, dto: UpdateJobDto, userId: string) {
    const job = await this.prisma.job.findUnique({ where: { id } });
    if (!job) throw new NotFoundException('Job not found');

    await this.orgAuth.assertOrgAccess(userId, job.organizationId);

    const { expiresAt, ...rest } = dto;
    const data = {
      ...rest,
      ...(expiresAt !== undefined && {
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      }),
    };
    return this.prisma.job.update({ where: { id }, data });
  }

  async remove(id: string, userId: string) {
    const job = await this.prisma.job.findUnique({ where: { id } });
    if (!job) throw new NotFoundException('Job not found');

    await this.orgAuth.assertOrgAccess(userId, job.organizationId);

    await this.prisma.job.delete({ where: { id } });
    return { message: 'Job deleted successfully' };
  }
}
