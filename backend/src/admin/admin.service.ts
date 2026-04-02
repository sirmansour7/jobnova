import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Role, ApplicationStatus } from '@prisma/client';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  async getUsers(page = 1, limit = 20, role?: string) {
    const skip = (page - 1) * limit;
    const where: any = { deletedAt: null };
    if (role) where.role = role;
    const [items, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          fullName: true,
          email: true,
          role: true,
          emailVerified: true,
          createdAt: true,
          lockedUntil: true,
        },
      }),
      this.prisma.user.count({ where }),
    ]);
    return { items, total, page, totalPages: Math.ceil(total / limit) };
  }

  async updateUserRole(id: string, role: Role) {
    if (!role) throw new BadRequestException('Role is required');
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user || user.deletedAt) throw new NotFoundException('User not found');
    return this.prisma.user.update({
      where: { id },
      data: { role },
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        emailVerified: true,
        createdAt: true,
      },
    });
  }

  async deleteUser(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user || user.deletedAt) throw new NotFoundException('User not found');
    await this.prisma.user.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    return { message: 'User deleted successfully' };
  }

  async restoreUser(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user || !user.deletedAt) throw new NotFoundException('Deleted user not found');
    await this.prisma.user.update({ where: { id }, data: { deletedAt: null } });
    return { message: 'User restored successfully' };
  }

  async toggleUserBan(id: string) {
    const existing = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        lockedUntil: true,
        deletedAt: true,
      },
    });
    if (!existing || existing.deletedAt) throw new NotFoundException('User not found');

    const now = new Date();
    const isLocked = existing.lockedUntil != null && existing.lockedUntil > now;

    const hundredYearsMs = 100 * 365 * 24 * 60 * 60 * 1000;
    const nextLockedUntil = isLocked
      ? null
      : new Date(Date.now() + hundredYearsMs);

    const updated = await this.prisma.user.update({
      where: { id },
      data: { lockedUntil: nextLockedUntil },
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        lockedUntil: true,
      },
    });

    return updated;
  }

  async getJobs(
    page = 1,
    limit = 20,
    search?: string,
    category?: string,
    status?: string,
  ) {
    const skip = (page - 1) * limit;
    const where: any = { deletedAt: null };

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { partnerName: { contains: search, mode: 'insensitive' } },
        { organization: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }
    if (category && category !== 'all') {
      where.category = category;
    }
    if (status === 'active') where.isActive = true;
    if (status === 'inactive') where.isActive = false;

    const [items, total] = await Promise.all([
      this.prisma.job.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          title: true,
          partnerName: true,
          category: true,
          jobType: true,
          governorateId: true,
          governorateRel: { select: { name: true } },
          isActive: true,
          expiresAt: true,
          createdAt: true,
          organization: { select: { id: true, name: true } },
          _count: { select: { applications: true } },
        },
      }),
      this.prisma.job.count({ where }),
    ]);
    return { items, total, page, totalPages: Math.ceil(total / limit) };
  }

  async toggleJobActive(id: string) {
    const job = await this.prisma.job.findUnique({ where: { id } });
    if (!job || job.deletedAt) throw new NotFoundException('Job not found');
    return this.prisma.job.update({
      where: { id },
      data: { isActive: !job.isActive },
    });
  }

  async deleteJob(id: string) {
    const job = await this.prisma.job.findUnique({ where: { id } });
    if (!job || job.deletedAt) throw new NotFoundException('Job not found');
    await this.prisma.job.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    return { message: 'Job deleted' };
  }

  async restoreJob(id: string) {
    const job = await this.prisma.job.findUnique({ where: { id } });
    if (!job || !job.deletedAt) throw new NotFoundException('Deleted job not found');
    await this.prisma.job.update({ where: { id }, data: { deletedAt: null } });
    return { message: 'Job restored successfully' };
  }

  async getOrgs(page = 1, limit = 20, search?: string) {
    const skip = (page - 1) * limit;
    const where: any = { deletedAt: null };
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { industry: { contains: search, mode: 'insensitive' } },
        { location: { contains: search, mode: 'insensitive' } },
      ];
    }
    const [items, total] = await Promise.all([
      this.prisma.organization.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          slug: true,
          industry: true,
          location: true,
          size: true,
          createdAt: true,
          responsibleHr: { select: { id: true, fullName: true, email: true } },
          _count: { select: { jobs: true, memberships: true } },
        },
      }),
      this.prisma.organization.count({ where }),
    ]);
    return { items, total, page, totalPages: Math.ceil(total / limit) };
  }

  async assignHr(orgId: string, hrUserId: string | null) {
    const org = await this.prisma.organization.findUnique({ where: { id: orgId } });
    if (!org || org.deletedAt) throw new NotFoundException('Organization not found');

    if (hrUserId !== null) {
      const user = await this.prisma.user.findUnique({ where: { id: hrUserId } });
      if (!user || user.deletedAt) throw new NotFoundException('User not found');
      if (user.role !== 'hr') throw new BadRequestException('User must have HR role');
    }

    return this.prisma.organization.update({
      where: { id: orgId },
      data: { responsibleHrId: hrUserId },
      select: {
        id: true,
        responsibleHr: { select: { id: true, fullName: true, email: true } },
      },
    });
  }

  async getOneOrg(id: string) {
    const org = await this.prisma.organization.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        industry: true,
        location: true,
        size: true,
        website: true,
        createdAt: true,
        deletedAt: true,
        _count: { select: { jobs: true, memberships: true } },
      },
    });
    if (!org || org.deletedAt) throw new NotFoundException('Organization not found');
    return org;
  }

  async updateOrg(id: string, data: { name?: string; description?: string; industry?: string; website?: string; location?: string; size?: string }) {
    const org = await this.prisma.organization.findUnique({ where: { id } });
    if (!org || org.deletedAt) throw new NotFoundException('Organization not found');
    return this.prisma.organization.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.industry !== undefined && { industry: data.industry }),
        ...(data.website !== undefined && { website: data.website }),
        ...(data.location !== undefined && { location: data.location }),
        ...(data.size !== undefined && { size: data.size }),
      },
    });
  }

  async deleteOrg(id: string) {
    const org = await this.prisma.organization.findUnique({ where: { id } });
    if (!org || org.deletedAt) throw new NotFoundException('Organization not found');
    const now = new Date();
    await this.prisma.$transaction([
      this.prisma.organization.update({ where: { id }, data: { deletedAt: now } }),
      // cascade soft-delete all jobs that belong to this org
      this.prisma.job.updateMany({
        where: { organizationId: id, deletedAt: null },
        data: { deletedAt: now },
      }),
    ]);
    return { message: 'Organization deleted' };
  }

  async restoreOrg(id: string) {
    const org = await this.prisma.organization.findUnique({ where: { id } });
    if (!org || !org.deletedAt) throw new NotFoundException('Deleted organization not found');
    await this.prisma.organization.update({ where: { id }, data: { deletedAt: null } });
    return { message: 'Organization restored successfully' };
  }

  async getStats() {
    const [totalUsers, totalJobs, totalApplications, totalOrgs] =
      await Promise.all([
        this.prisma.user.count({ where: { deletedAt: null } }),
        this.prisma.job.count({ where: { deletedAt: null } }),
        this.prisma.application.count(),
        this.prisma.organization.count({ where: { deletedAt: null } }),
      ]);
    return { totalUsers, totalJobs, totalApplications, totalOrgs };
  }

  async getAnalytics() {
    const [totalOrgs, totalJobs, totalApplications, totalCandidates] =
      await Promise.all([
        this.prisma.organization.count({ where: { deletedAt: null } }),
        this.prisma.job.count({ where: { deletedAt: null } }),
        this.prisma.application.count(),
        this.prisma.user.count({ where: { role: Role.candidate, deletedAt: null } }),
      ]);

    const applicationsByStatusRaw = await this.prisma.application.groupBy({
      by: ['status'],
      _count: { _all: true },
    });
    const applicationsByStatus = applicationsByStatusRaw.map((row) => ({
      status: row.status,
      count: row._count._all,
    }));

    const jobsByCategoryRaw = await this.prisma.job.groupBy({
      by: ['category'],
      where: { deletedAt: null },
      _count: { _all: true },
    });
    const jobsByCategory = jobsByCategoryRaw.map((row) => ({
      category: row.category ?? 'غير مصنفة',
      count: row._count._all,
    }));

    // Top 5 orgs by application count — pure DB aggregation
    const topOrgsRaw = await this.prisma.organization.findMany({
      where: { deletedAt: null },
      select: {
        name: true,
        _count: { select: { jobs: true } },
        jobs: {
          select: {
            _count: { select: { applications: true } },
          },
        },
      },
      orderBy: { jobs: { _count: 'desc' } },
      take: 20,
    });
    const topOrgs = topOrgsRaw
      .map((org) => ({
        name: org.name,
        jobCount: org._count.jobs,
        applicationCount: org.jobs.reduce(
          (sum, j) => sum + j._count.applications,
          0,
        ),
      }))
      .sort((a, b) => b.applicationCount - a.applicationCount)
      .slice(0, 5);

    // Applications over last 30 days — grouped in DB
    const now = new Date();
    const fromDate = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() - 29,
    );

    const recentAppsGrouped = await this.prisma.$queryRaw<
      { date: string; count: bigint }[]
    >`
      SELECT DATE("createdAt")::text AS date, COUNT(*)::bigint AS count
      FROM "Application"
      WHERE "createdAt" >= ${fromDate}
      GROUP BY DATE("createdAt")
      ORDER BY DATE("createdAt")
    `;

    const countsByDate = new Map<string, number>(
      recentAppsGrouped.map((r) => [r.date, Number(r.count)]),
    );

    const applicationsOverTime: { date: string; count: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      applicationsOverTime.push({
        date: key,
        count: countsByDate.get(key) ?? 0,
      });
    }

    return {
      totalOrgs,
      totalJobs,
      totalCandidates,
      totalApplications,
      applicationsByStatus,
      jobsByCategory,
      topOrgs,
      applicationsOverTime,
    };
  }
}
