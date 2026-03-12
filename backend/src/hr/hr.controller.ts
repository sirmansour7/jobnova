import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
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
      where: { userId },
      select: { organizationId: true },
    });
    return membership?.organizationId ?? null;
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

    return {
      totalJobs,
      activeJobs,
      totalApplications,
      applicationsByStatus,
      topJobs,
      applicationsOverTime,
    };
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
    @Param('id') id: string,
    @Body(VP) dto: UpdateScheduleInterviewDto,
    @Req() req: Request & { user: { sub: string } },
  ) {
    const organizationId = await this.getHrOrganizationId(req.user.sub);
    if (!organizationId) throw new ForbiddenException('No organization');
    return this.interviewsService.updateInterview(id, dto, organizationId);
  }

  @Delete('interviews/schedule/:id')
  async deleteScheduledInterview(
    @Param('id') id: string,
    @Req() req: Request & { user: { sub: string } },
  ) {
    const organizationId = await this.getHrOrganizationId(req.user.sub);
    if (!organizationId) throw new ForbiddenException('No organization');
    await this.interviewsService.removeInterview(id, organizationId);
  }
}
