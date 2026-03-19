import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { JobCategory, JobType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { OrgAuthService } from '../org/org-auth.service';
import { CreateJobDto } from './dto/create-job.dto';
import { UpdateJobDto } from './dto/update-job.dto';
import { sanitizeInput } from '../common/utils/sanitize-input.util';
import { CacheKeys, CacheTTL } from '../common/cache-keys';

export interface JobFilters {
  category?: JobCategory;
  jobType?: JobType;
  governorate?: string;
  isActive?: boolean;
  search?: string;
  /** Include only jobs whose salaryMax is >= this value (or salaryMax is null) */
  salaryMin?: number;
  /** Include only jobs whose salaryMin is <= this value (or salaryMin is null) */
  salaryMax?: number;
  page?: number;
  limit?: number;
}

@Injectable()
export class JobsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly orgAuth: OrgAuthService,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
  ) {}

  async findAll(
    filters?: JobFilters,
    user?: { sub: string; role: string },
  ) {
    const page = Math.max(1, filters?.page ?? 1);
    const limit = Math.min(50, Math.max(1, filters?.limit ?? 20));
    const skip = (page - 1) * limit;

    // Cache only the fully unfiltered public first page.
    const isPublicP1 =
      !user &&
      page === 1 &&
      !filters?.search &&
      !filters?.category &&
      !filters?.jobType &&
      !filters?.governorate &&
      filters?.salaryMin === undefined &&
      filters?.salaryMax === undefined &&
      filters?.isActive !== false;

    if (isPublicP1) {
      const cached = await this.cache.get(CacheKeys.JOBS_PUBLIC_P1);
      if (cached) return cached;
    }

    let orgId: string | null = null;
    if (user?.role === 'hr') {
      const membership = await this.prisma.membership.findFirst({
        where: { userId: user.sub },
        select: { organizationId: true },
      });
      if (!membership) {
        return { items: [], total: 0, page, totalPages: 0 };
      }
      orgId = membership.organizationId;
    }

    // Build AND conditions so multiple OR-based clauses don't conflict.
    const andConditions: Record<string, unknown>[] = [];

    // Full-text search across title, partnerName, description
    if (filters?.search) {
      andConditions.push({
        OR: [
          { title: { contains: filters.search, mode: 'insensitive' } },
          { partnerName: { contains: filters.search, mode: 'insensitive' } },
          { description: { contains: filters.search, mode: 'insensitive' } },
        ],
      });
    }

    // Only include non-expired jobs (or jobs with no expiry)
    if (filters?.isActive !== false) {
      andConditions.push({
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      });
    }

    // Salary range — include null-salary jobs so they surface in all searches.
    // "salaryMin" filter means: I want jobs that pay at least this much
    //   → job's salaryMax must be >= the requested minimum (or be unset).
    if (filters?.salaryMin !== undefined) {
      andConditions.push({
        OR: [
          { salaryMax: { gte: filters.salaryMin } },
          { salaryMax: null },
        ],
      });
    }
    // "salaryMax" filter means: I don't want jobs above this rate
    //   → job's salaryMin must be <= the requested maximum (or be unset).
    if (filters?.salaryMax !== undefined) {
      andConditions.push({
        OR: [
          { salaryMin: { lte: filters.salaryMax } },
          { salaryMin: null },
        ],
      });
    }

    const where: Record<string, unknown> = {
      deletedAt: null,
      isActive: filters?.isActive ?? true,
      ...(filters?.category && { category: filters.category }),
      ...(filters?.jobType && { jobType: filters.jobType }),
      ...(filters?.governorate && {
        governorateRel: { name: filters.governorate },
      }),
      ...(orgId != null && { organizationId: orgId }),
      ...(andConditions.length > 0 && { AND: andConditions }),
    };

    const [items, total] = await Promise.all([
      this.prisma.job.findMany({
        where,
        select: {
          id: true,
          title: true,
          partnerName: true,
          description: true,
          governorateId: true,
          cityId: true,
          governorateRel: { select: { name: true } },
          cityRel: { select: { name: true } },
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

    const result = { items, total, page, totalPages: Math.ceil(total / limit) };

    if (isPublicP1) {
      await this.cache.set(
        CacheKeys.JOBS_PUBLIC_P1,
        result,
        CacheTTL.SIXTY_SECONDS,
      );
    }

    return result;
  }

  async findOne(id: string) {
    const job = await this.prisma.job.findUnique({
      where: { id },
      include: {
        organization: { select: { id: true, name: true } },
        _count: { select: { applications: true } },
      },
    });
    if (!job || job.deletedAt) throw new NotFoundException('Job not found');
    return job;
  }

  async create(dto: CreateJobDto, userId: string) {
    await this.orgAuth.assertOrgAccess(userId, dto.organizationId);

    const job = await this.prisma.job.create({
      data: {
        organizationId: dto.organizationId,
        title: sanitizeInput(dto.title, 150),
        partnerName: sanitizeInput(dto.partnerName, 150),
        description: dto.description
          ? sanitizeInput(dto.description, 2000)
          : undefined,
        governorateId: dto.governorate
          ? ((
              await this.prisma.governorate.findUnique({
                where: { name: dto.governorate },
              })
            )?.id ?? undefined)
          : undefined,
        category: dto.category,
        jobType: dto.jobType,
        skills: dto.skills ?? [],
        minExperience: dto.minExperience,
        salaryMin: dto.salaryMin,
        salaryMax: dto.salaryMax,
        currency: dto.currency,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
      },
    });
    await this.cache.del(CacheKeys.JOBS_PUBLIC_P1);
    return job;
  }

  async update(id: string, dto: UpdateJobDto, userId: string) {
    const job = await this.prisma.job.findUnique({ where: { id } });
    if (!job || job.deletedAt) throw new NotFoundException('Job not found');

    await this.orgAuth.assertOrgAccess(userId, job.organizationId);

    const {
      expiresAt,
      title,
      partnerName,
      description,
      governorate,
      city,
      ...rest
    } = dto;

    // Resolve governorate name → ID (null clears the field, undefined = no change)
    let governorateId: string | null | undefined;
    if (governorate !== undefined) {
      governorateId = governorate
        ? ((await this.prisma.governorate.findUnique({ where: { name: governorate } }))?.id ?? null)
        : null;
    }

    // Resolve city name → ID (null clears the field, undefined = no change)
    let cityId: string | null | undefined;
    if (city !== undefined) {
      cityId = city
        ? ((await this.prisma.city.findFirst({ where: { name: city } }))?.id ?? null)
        : null;
    }

    const data = {
      ...rest,
      ...(title !== undefined && { title: sanitizeInput(title, 150) }),
      ...(partnerName !== undefined && {
        partnerName: sanitizeInput(partnerName, 150),
      }),
      ...(description !== undefined && {
        description: description ? sanitizeInput(description, 2000) : null,
      }),
      ...(expiresAt !== undefined && {
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      }),
      ...(governorateId !== undefined && { governorateId }),
      ...(cityId !== undefined && { cityId }),
    };

    const updated = await this.prisma.job.update({ where: { id }, data });
    await this.cache.del(CacheKeys.JOBS_PUBLIC_P1);
    return updated;
  }

  async remove(id: string, userId: string) {
    const job = await this.prisma.job.findUnique({ where: { id } });
    if (!job || job.deletedAt) throw new NotFoundException('Job not found');

    await this.orgAuth.assertOrgAccess(userId, job.organizationId);

    await this.prisma.job.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    await this.cache.del(CacheKeys.JOBS_PUBLIC_P1);
    return { message: 'Job deleted successfully' };
  }
}
