import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { InterviewsService } from '../interviews/interviews.service';
import { ParseCuidPipe } from '../common/pipes/parse-cuid.pipe';
import { CreateScheduleInterviewDto } from '../interviews/dto/create-schedule-interview.dto';
import { UpdateScheduleInterviewDto } from '../interviews/dto/update-schedule-interview.dto';

const VP = new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
});

@Controller('hr')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.hr)
export class HrController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly interviewsService: InterviewsService,
  ) {}

  private async getHrOrganizationId(userId: string): Promise<string | null> {
    const membership = await this.prisma.membership.findFirst({
      where: { userId, roleInOrg: { in: ['OWNER', 'HR'] } },
      select: { organizationId: true },
    });
    return membership?.organizationId ?? null;
  }

  /**
   * GET /hr/jobs
   * Returns a paginated list of jobs scoped to the HR user's organisation.
   * Used by the schedule-interview modal and the pipeline job dropdown.
   */
  @Get('jobs')
  async getOrgJobs(
    @Req() req: Request & { user: { sub: string } },
    @Query('limit') limit?: string,
    @Query('page')  page?: string,
    @Query('search') search?: string,
    @Query('includeInactive') includeInactive?: string,
  ) {
    const organizationId = await this.getHrOrganizationId(req.user.sub);
    if (!organizationId) {
      return { items: [], total: 0, page: 1, totalPages: 0 };
    }

    const take = Math.min(limit ? parseInt(limit, 10) : 20, 100);
    const currentPage = Math.max(page ? parseInt(page, 10) : 1, 1);
    const skip = (currentPage - 1) * take;
    const showAll = includeInactive === 'true';

    const where = {
      organizationId,
      deletedAt: null as null,
      ...(showAll ? {} : { isActive: true }),
      ...(search
        ? { title: { contains: search, mode: 'insensitive' as const } }
        : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.job.findMany({
        where,
        select: {
          id: true,
          title: true,
          partnerName: true,
          category: true,
          jobType: true,
          isActive: true,
          createdAt: true,
          skills: true,
          minExperience: true,
          salaryMin: true,
          salaryMax: true,
          _count: { select: { applications: true } },
        },
        orderBy: { createdAt: 'desc' },
        take,
        skip,
      }),
      this.prisma.job.count({ where }),
    ]);

    return {
      items,
      total,
      page: currentPage,
      totalPages: Math.ceil(total / take) || 1,
    };
  }

  @Get('analytics')
  async getAnalytics(@Req() req: Request & { user: { sub: string } }) {
    const userId = req.user.sub;

    // Determine HR's organization (first non-member membership)
    const membership = await this.prisma.membership.findFirst({
      where: {
        userId,
        roleInOrg: {
          not: 'MEMBER',
        },
      },
      select: {
        organizationId: true,
      },
    });

    if (!membership) {
      return {
        totalJobs: 0,
        activeJobs: 0,
        totalApplications: 0,
        applicationsByStatus: [] as { status: string; count: number }[],
        topJobs: [] as { title: string; applicationCount: number }[],
        applicationsOverTime: [] as { date: string; count: number }[],
      };
    }

    const organizationId = membership.organizationId;

    const [totalJobs, activeJobs, totalApplications] = await Promise.all([
      this.prisma.job.count({ where: { organizationId } }),
      this.prisma.job.count({
        where: {
          organizationId,
          isActive: true,
        },
      }),
      this.prisma.application.count({
        where: {
          job: { organizationId },
        },
      }),
    ]);

    const applicationsByStatusRaw = await this.prisma.application.groupBy({
      by: ['status'],
      where: {
        job: { organizationId },
      },
      _count: { _all: true },
    });

    const applicationsByStatus = applicationsByStatusRaw.map((row) => ({
      status: row.status,
      count: row._count._all,
    }));

    const jobsWithCounts = await this.prisma.job.findMany({
      where: { organizationId },
      select: {
        id: true,
        title: true,
        _count: { select: { applications: true } },
      },
    });

    const topJobs = jobsWithCounts
      .map((job) => ({
        title: job.title,
        applicationCount: job._count.applications,
      }))
      .sort((a, b) => b.applicationCount - a.applicationCount)
      .slice(0, 5);

    const now = new Date();
    const fromDate = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() - 29,
    );

    const recentApps = await this.prisma.application.findMany({
      where: {
        job: { organizationId },
        createdAt: {
          gte: fromDate,
        },
      },
      select: {
        createdAt: true,
      },
    });

    const countsByDate = new Map<string, number>();
    for (const app of recentApps) {
      const d = new Date(app.createdAt);
      const key = d.toISOString().slice(0, 10);
      countsByDate.set(key, (countsByDate.get(key) ?? 0) + 1);
    }

    const applicationsOverTime: { date: string; count: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      applicationsOverTime.push({
        date: key,
        count: countsByDate.get(key) ?? 0,
      });
    }

    // ── topApplicantSkills ──────────────────────────────────────────────
    const appsWithCv = await this.prisma.application.findMany({
      where: { job: { organizationId } },
      select: {
        candidate: {
          select: {
            cv: { select: { data: true } },
          },
        },
      },
      take: 200,
    });

    const skillFreq = new Map<string, number>();
    for (const app of appsWithCv) {
      const cvData =
        app.candidate?.cv?.data as Record<string, unknown> | null;
      const skills = cvData?.skills;
      if (Array.isArray(skills)) {
        for (const skill of skills as string[]) {
          if (typeof skill === 'string' && skill.trim()) {
            const s = skill.trim().toLowerCase();
            skillFreq.set(s, (skillFreq.get(s) ?? 0) + 1);
          }
        }
      }
    }
    const topApplicantSkills = [...skillFreq.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([skill, count]) => ({ skill, count }));

    // ── applicationsByCategory ─────────────────────────────────────────
    const appsByCategoryRaw = await this.prisma.application.groupBy({
      by: ['jobId'],
      where: { job: { organizationId } },
      _count: { _all: true },
    });
    const jobsForCategory = await this.prisma.job.findMany({
      where: { organizationId },
      select: { id: true, category: true },
    });
    const jobCategoryMap = new Map(
      jobsForCategory.map((j) => [j.id, j.category ?? 'OTHER']),
    );
    const catFreq = new Map<string, number>();
    for (const row of appsByCategoryRaw) {
      const cat = jobCategoryMap.get(row.jobId) ?? 'OTHER';
      catFreq.set(cat, (catFreq.get(cat) ?? 0) + row._count._all);
    }
    const applicationsByCategory = [...catFreq.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([category, count]) => ({ category, count }));

    // ── hireRate & avgDaysToHire ───────────────────────────────────────
    const hiredApps = await this.prisma.application.findMany({
      where: { job: { organizationId }, status: 'HIRED' },
      select: { createdAt: true, updatedAt: true },
    });
    const hireRate =
      totalApplications > 0
        ? Math.round((hiredApps.length / totalApplications) * 100)
        : 0;
    const avgDaysToHire =
      hiredApps.length > 0
        ? Math.round(
            hiredApps.reduce((sum, a) => {
              return (
                sum +
                (a.updatedAt.getTime() - a.createdAt.getTime()) /
                  (1000 * 60 * 60 * 24)
              );
            }, 0) / hiredApps.length,
          )
        : 0;

    // ── hireFunnel (derived from applicationsByStatus) ─────────────────
    const statusMap = new Map(
      applicationsByStatus.map((s) => [s.status, s.count]),
    );
    const hireFunnel = [
      { stage: 'APPLIED', count: statusMap.get('APPLIED') ?? 0 },
      { stage: 'SHORTLISTED', count: statusMap.get('SHORTLISTED') ?? 0 },
      { stage: 'HIRED', count: statusMap.get('HIRED') ?? 0 },
    ];

    return {
      totalJobs,
      activeJobs,
      totalApplications,
      applicationsByStatus,
      topJobs,
      applicationsOverTime,
      hireFunnel,
      topApplicantSkills,
      applicationsByCategory,
      avgDaysToHire,
      hireRate,
    };
  }

  @Get('compare')
  async compareApplications(
    @Query('ids') ids: string,
    @Req() req: Request & { user: { sub: string } },
  ) {
    const organizationId = await this.getHrOrganizationId(req.user.sub);
    if (!organizationId) throw new ForbiddenException('No organization');

    const idList = (ids ?? '').split(',').filter(Boolean).slice(0, 3);
    if (idList.length < 2)
      throw new BadRequestException('At least 2 IDs required');

    const applications = await this.prisma.application.findMany({
      where: {
        id: { in: idList },
        job: { organizationId },
      },
      select: {
        id: true,
        status: true,
        createdAt: true,
        job: { select: { id: true, title: true } },
        candidate: {
          select: {
            id: true,
            fullName: true,
            email: true,
            cv: { select: { data: true } },
          },
        },
      },
    });

    return applications.map((app) => {
      const cvData =
        (app.candidate.cv?.data as Record<string, unknown> | null) ?? {};
      const intelligence =
        (cvData.intelligence as Record<string, unknown> | undefined) ?? {};
      const structuredData =
        (intelligence.structuredData as Record<string, unknown> | undefined) ??
        {};
      const improvedCv =
        (intelligence.improvedCv as Record<string, unknown> | undefined) ?? {};

      return {
        applicationId: app.id,
        status: app.status,
        createdAt: app.createdAt,
        job: app.job,
        candidate: {
          id: app.candidate.id,
          fullName: app.candidate.fullName,
          email: app.candidate.email,
        },
        skills:
          (cvData.skills as string[] | undefined) ??
          (structuredData.skills as string[] | undefined) ??
          [],
        yearsOfExperience:
          (structuredData.yearsOfExperience as number | undefined) ?? null,
        seniority: (structuredData.seniority as string | undefined) ?? null,
        education:
          (cvData.education as
            | Array<{ degree?: string; institution?: string; year?: string }>
            | undefined) ?? [],
        professionalSummary:
          (improvedCv.professionalSummary as string | undefined) ??
          (cvData.summary as string | undefined) ??
          '',
        matchScore: null as number | null,
      };
    });
  }

  @Post('interviews/schedule')
  async createScheduledInterview(
    @Body(VP) dto: CreateScheduleInterviewDto,
    @Req() req: Request & { user: { sub: string } },
  ) {
    const organizationId = await this.getHrOrganizationId(req.user.sub);
    if (!organizationId) throw new ForbiddenException('No organization');
    return this.interviewsService.createInterview(dto, organizationId);
  }

  @Get('interviews/schedule')
  async listScheduledInterviews(
    @Req() req: Request & { user: { sub: string } },
  ) {
    const organizationId = await this.getHrOrganizationId(req.user.sub);
    if (!organizationId) return [];
    return this.interviewsService.findInterviewsByOrg(organizationId);
  }

  @Patch('interviews/schedule/:id')
  async updateScheduledInterview(
    @Param('id', ParseCuidPipe) id: string,
    @Body(VP) dto: UpdateScheduleInterviewDto,
    @Req() req: Request & { user: { sub: string } },
  ) {
    const organizationId = await this.getHrOrganizationId(req.user.sub);
    if (!organizationId) throw new ForbiddenException('No organization');
    return this.interviewsService.updateInterview(id, dto, organizationId);
  }

  @Delete('interviews/schedule/:id')
  async deleteScheduledInterview(
    @Param('id', ParseCuidPipe) id: string,
    @Req() req: Request & { user: { sub: string } },
  ) {
    const organizationId = await this.getHrOrganizationId(req.user.sub);
    if (!organizationId) throw new ForbiddenException('No organization');
    await this.interviewsService.removeInterview(id, organizationId);
  }
}
