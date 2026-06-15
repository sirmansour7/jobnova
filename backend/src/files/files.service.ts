import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  StreamableFile,
} from '@nestjs/common';
import { createReadStream } from 'fs';
import { stat } from 'fs/promises';
import { basename } from 'path';
import { AuditEvent, Role } from '@prisma/client';
import type { Request } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { OrgAuthService } from '../org/org-auth.service';
import { AuditService } from '../audit/audit.service';
import {
  absoluteCvFilePathFromStorageKey,
  normalizeApplicationCvStorageKey,
} from '../common/utils/cv-storage-path.util';

type JwtUser = { sub: string; role: Role };

@Injectable()
export class FilesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly orgAuth: OrgAuthService,
    private readonly audit: AuditService,
  ) {}

  async streamApplicationCvPdf(
    user: JwtUser,
    applicationId: string,
    req: Request,
  ): Promise<StreamableFile> {
    const application = await this.prisma.application.findUnique({
      where: { id: applicationId },
      select: {
        id: true,
        cvUrl: true,
        candidateId: true,
        job: {
          select: { organizationId: true, deletedAt: true },
        },
      },
    });

    if (!application?.job || application.job.deletedAt) {
      throw new NotFoundException('Application not found');
    }

    const storageKey = normalizeApplicationCvStorageKey(application.cvUrl);
    if (!storageKey) {
      throw new NotFoundException('No CV file for this application');
    }

    const access = await this.resolveAccess(user, application);
    if (!access) {
      throw new ForbiddenException('Not authorized to access this file');
    }

    const absPath = absoluteCvFilePathFromStorageKey(storageKey);
    try {
      const s = await stat(absPath);
      if (!s.isFile()) throw new NotFoundException('CV file not found');
    } catch (e) {
      if (e instanceof NotFoundException) throw e;
      throw new NotFoundException('CV file not found');
    }

    const filename = basename(absPath) || 'cv.pdf';

    this.audit.log({
      event: AuditEvent.CV_FILE_ACCESSED,
      userId: user.sub,
      ip: req.ip,
      userAgent: req.get('user-agent') ?? undefined,
      meta: {
        applicationId,
        organizationId: application.job.organizationId,
        candidateId: application.candidateId,
        access,
      },
    });

    const stream = createReadStream(absPath);
    return new StreamableFile(stream, {
      type: 'application/pdf',
      disposition: `attachment; filename="${filename}"`,
    });
  }

  private async resolveAccess(
    user: JwtUser,
    application: {
      candidateId: string;
      job: { organizationId: string };
    },
  ): Promise<'owner' | 'org_hr' | 'admin' | null> {
    if (user.role === Role.admin) return 'admin';
    if (user.sub === application.candidateId) return 'owner';
    try {
      await this.orgAuth.assertOrgAccess(
        user.sub,
        application.job.organizationId,
      );
      return 'org_hr';
    } catch {
      return null;
    }
  }
}
