import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  Inject,
} from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrgDto } from './dto/create-org.dto';
import { InviteMemberDto } from './dto/invite-member.dto';
import { CacheKeys, CacheTTL } from '../common/cache-keys';

@Injectable()
export class OrgService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
  ) {}

  // Create org — creator becomes OWNER (HR only)
  async create(dto: CreateOrgDto, userId: string) {
    const existingMembership = await this.prisma.membership.findFirst({
      where: { userId },
    });
    if (existingMembership) {
      throw new ConflictException('Already has an organization');
    }

    const baseSlug = this.slugify(dto.name);

    // Retry loop: attempt the insert, and if a concurrent request grabs the
    // same slug first (P2002 unique violation), increment the suffix and retry.
    // This eliminates the check-then-act race condition of the previous
    // while-loop approach where the uniqueness check ran outside the transaction.
    const MAX_SLUG_RETRIES = 10;
    for (let suffix = 0; suffix <= MAX_SLUG_RETRIES; suffix++) {
      const slug = suffix === 0 ? baseSlug : `${baseSlug}-${suffix}`;
      try {
        return await this.prisma.$transaction(async (tx) => {
          const org = await tx.organization.create({
            data: {
              name: dto.name,
              slug,
              description: dto.description ?? undefined,
              industry: dto.industry ?? undefined,
              website: dto.website ?? undefined,
              location: dto.location ?? undefined,
            },
          });
          await tx.membership.create({
            data: { userId, organizationId: org.id, roleInOrg: 'OWNER' },
          });
          return org;
        });
      } catch (e) {
        const isSlugConflict =
          e instanceof Prisma.PrismaClientKnownRequestError &&
          e.code === 'P2002' &&
          Array.isArray(e.meta?.target) &&
          (e.meta.target as string[]).includes('slug');

        if (isSlugConflict && suffix < MAX_SLUG_RETRIES) {
          continue;
        }
        throw e;
      }
    }
    // Unreachable — loop always returns or throws, but satisfies TypeScript.
    throw new ConflictException('Could not generate a unique organization slug');
  }

  private slugify(value: string): string {
    return (
      value
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '') || 'org'
    );
  }

  async getMyFirstOrg(userId: string) {
    const membership = await this.prisma.membership.findFirst({
      where: { userId, organization: { deletedAt: null } },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
            createdAt: true,
            _count: { select: { jobs: true, memberships: true } },
          },
        },
      },
      orderBy: { organization: { createdAt: 'asc' } },
    });
    return membership?.organization ?? null;
  }

  async getDashboardStats(userId: string) {
    const membership = await this.prisma.membership.findFirst({
      where: { userId, organization: { deletedAt: null } },
      select: { organizationId: true },
    });
    if (!membership)
      return {
        totalJobs: 0,
        activeJobs: 0,
        totalApplications: 0,
        recentApplications: [],
      };

    const orgId = membership.organizationId;
    const key = CacheKeys.orgDashboard(orgId);
    const cached = await this.cache.get(key);
    if (cached) return cached;

    const [totalJobs, activeJobs, totalApplications, recentApplications] =
      await Promise.all([
        this.prisma.job.count({ where: { organizationId: orgId } }),
        this.prisma.job.count({
          where: { organizationId: orgId, isActive: true },
        }),
        this.prisma.application.count({
          where: { job: { organizationId: orgId } },
        }),
        this.prisma.application.findMany({
          where: { job: { organizationId: orgId } },
          orderBy: { createdAt: 'desc' },
          take: 10,
          select: {
            id: true,
            status: true,
            createdAt: true,
            candidate: {
              select: { id: true, fullName: true, email: true },
            },
            job: { select: { id: true, title: true } },
          },
        }),
      ]);

    const result = {
      totalJobs,
      activeJobs,
      totalApplications,
      recentApplications,
    };
    await this.cache.set(key, result, CacheTTL.THIRTY_SECONDS);
    return result;
  }

  async getMyOrgs(userId: string) {
    const memberships = await this.prisma.membership.findMany({
      where: { userId, organization: { deletedAt: null } },
      include: {
        organization: true,
      },
      orderBy: { organization: { createdAt: 'asc' } },
    });
    return memberships.map((m) => m.organization);
  }

  // Get org details (members only)
  async findOne(id: string, userId: string) {
    const org = await this.prisma.organization.findUnique({
      where: { id },
      include: {
        memberships: {
          include: {
            user: { select: { id: true, fullName: true, email: true } },
          },
        },
        _count: { select: { jobs: true } },
      },
    });
    if (!org || org.deletedAt) throw new NotFoundException('Organization not found');
    await this.assertMember(userId, id);
    return org;
  }

  // Invite member (OWNER only)
  async inviteMember(orgId: string, dto: InviteMemberDto, userId: string) {
    await this.assertOwner(userId, orgId);

    const invitee = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });
    if (!invitee) throw new NotFoundException('User not found');

    const existing = await this.prisma.membership.findUnique({
      where: {
        userId_organizationId: { userId: invitee.id, organizationId: orgId },
      },
    });
    if (existing) throw new ConflictException('User already a member');

    return this.prisma.membership.create({
      data: { userId: invitee.id, organizationId: orgId, roleInOrg: dto.role },
    });
  }

  // Remove member (OWNER only)
  async removeMember(orgId: string, memberId: string, userId: string) {
    await this.assertOwner(userId, orgId);
    if (memberId === userId)
      throw new ForbiddenException('Cannot remove yourself');

    const membership = await this.prisma.membership.findUnique({
      where: {
        userId_organizationId: { userId: memberId, organizationId: orgId },
      },
    });
    if (!membership) throw new NotFoundException('Member not found');

    await this.prisma.membership.delete({
      where: {
        userId_organizationId: { userId: memberId, organizationId: orgId },
      },
    });
    return { message: 'Member removed successfully' };
  }

  private async assertMember(userId: string, orgId: string) {
    const m = await this.prisma.membership.findUnique({
      where: { userId_organizationId: { userId, organizationId: orgId } },
    });
    if (!m) throw new ForbiddenException('Not a member of this organization');
  }

  private async assertOwner(userId: string, orgId: string) {
    const m = await this.prisma.membership.findUnique({
      where: { userId_organizationId: { userId, organizationId: orgId } },
    });
    if (!m || m.roleInOrg !== 'OWNER')
      throw new ForbiddenException('Only OWNER can perform this action');
  }
}
