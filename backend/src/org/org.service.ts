import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrgDto } from './dto/create-org.dto';
import { InviteMemberDto } from './dto/invite-member.dto';

@Injectable()
export class OrgService {
  constructor(private readonly prisma: PrismaService) {}

  // Create org — creator becomes OWNER (HR only)
  async create(dto: CreateOrgDto, userId: string) {
    const existingMembership = await this.prisma.membership.findFirst({
      where: { userId },
    });
    if (existingMembership) {
      throw new ConflictException('Already has an organization');
    }

    const baseSlug = this.slugify(dto.name);
    let slug = baseSlug || 'org';
    let suffix = 0;
    while (await this.prisma.organization.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${++suffix}`;
    }

    return this.prisma.$transaction(async (tx) => {
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
      where: { userId },
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
      where: { userId },
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

    return {
      totalJobs,
      activeJobs,
      totalApplications,
      recentApplications,
    };
  }

  async getMyOrgs(userId: string) {
    const memberships = await this.prisma.membership.findMany({
      where: { userId },
      include: {
        organization: true,
      },
      orderBy: { organization: { createdAt: 'asc' } },
    });
    return memberships.map((m) => m.organization);
  }

  // Get my organizations
  async myOrgs(userId: string) {
    return this.prisma.membership.findMany({
      where: { userId },
      include: {
        organization: {
          select: { id: true, name: true, slug: true, createdAt: true },
        },
      },
    });
  }

  // Get org details (members only)
  async findOne(id: string, userId: string) {
    await this.assertMember(userId, id);
    return this.prisma.organization.findUnique({
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
