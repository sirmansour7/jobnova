import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class OrgAuthService {
  constructor(private readonly prisma: PrismaService) {}

  async assertOrgAccess(userId: string, organizationId: string): Promise<void> {
    const membership = await this.prisma.membership.findUnique({
      where: { userId_organizationId: { userId, organizationId } },
    });
    if (!membership || membership.roleInOrg === 'MEMBER') {
      throw new ForbiddenException('Not authorized for this organization');
    }
  }
}
