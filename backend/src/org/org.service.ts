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

  // Create org — creator becomes OWNER
  async create(dto: CreateOrgDto, userId: string) {
    const existing = await this.prisma.organization.findUnique({
      where: { slug: dto.slug },
    });
    if (existing) throw new ConflictException('Slug already in use');

    return this.prisma.$transaction(async (tx) => {
      const org = await tx.organization.create({
        data: { name: dto.name, slug: dto.slug },
      });
      await tx.membership.create({
        data: { userId, organizationId: org.id, roleInOrg: 'OWNER' },
      });
      return org;
    });
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
