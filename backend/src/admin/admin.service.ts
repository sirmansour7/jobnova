import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from '@prisma/client';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  async getUsers(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      this.prisma.user.findMany({
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
      this.prisma.user.count(),
    ]);
    return { items, total, page, totalPages: Math.ceil(total / limit) };
  }

  async updateUserRole(id: string, role: Role) {
    if (!role) throw new BadRequestException('Role is required');
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
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
    if (!user) throw new NotFoundException('User not found');
    await this.prisma.user.delete({ where: { id } });
    return { message: 'User deleted successfully' };
  }

  async getJobs(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      this.prisma.job.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          title: true,
          partnerName: true,
          category: true,
          governorate: true,
          isActive: true,
          createdAt: true,
          organization: { select: { id: true, name: true } },
          _count: { select: { applications: true } },
        },
      }),
      this.prisma.job.count(),
    ]);
    return { items, total, page, totalPages: Math.ceil(total / limit) };
  }

  async toggleJobActive(id: string) {
    const job = await this.prisma.job.findUnique({ where: { id } });
    if (!job) throw new NotFoundException('Job not found');
    return this.prisma.job.update({
      where: { id },
      data: { isActive: !job.isActive },
    });
  }

  async deleteJob(id: string) {
    const job = await this.prisma.job.findUnique({ where: { id } });
    if (!job) throw new NotFoundException('Job not found');
    await this.prisma.job.delete({ where: { id } });
    return { message: 'Job deleted' };
  }

  async getOrgs(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      this.prisma.organization.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          slug: true,
          createdAt: true,
          _count: { select: { jobs: true, memberships: true } },
        },
      }),
      this.prisma.organization.count(),
    ]);
    return { items, total, page, totalPages: Math.ceil(total / limit) };
  }

  async deleteOrg(id: string) {
    const org = await this.prisma.organization.findUnique({ where: { id } });
    if (!org) throw new NotFoundException('Organization not found');
    await this.prisma.organization.delete({ where: { id } });
    return { message: 'Organization deleted' };
  }

  async getStats() {
    const [totalUsers, totalJobs, totalApplications, totalOrgs] =
      await Promise.all([
        this.prisma.user.count(),
        this.prisma.job.count(),
        this.prisma.application.count(),
        this.prisma.organization.count(),
      ]);
    return { totalUsers, totalJobs, totalApplications, totalOrgs };
  }
}
