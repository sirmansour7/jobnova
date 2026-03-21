import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { JobCategory, JobType, Role } from '@prisma/client';
import { JobsService } from './jobs.service';
import { JobMatchService } from './job-match.service';
import { CreateJobDto } from './dto/create-job.dto';
import { UpdateJobDto } from './dto/update-job.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../common/guards/optional-jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { ParseCuidPipe } from '../common/pipes/parse-cuid.pipe';
import type { Request } from 'express';

const VP = new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
});

// Valid enum values for safe query-string coercion.
const VALID_CATEGORIES = new Set(Object.values(JobCategory));
const VALID_JOB_TYPES = new Set(Object.values(JobType));

function toCategory(raw?: string): JobCategory | undefined {
  return raw && VALID_CATEGORIES.has(raw as JobCategory)
    ? (raw as JobCategory)
    : undefined;
}

function toJobType(raw?: string): JobType | undefined {
  return raw && VALID_JOB_TYPES.has(raw as JobType)
    ? (raw as JobType)
    : undefined;
}

@Controller('jobs')
export class JobsController {
  constructor(
    private readonly jobsService: JobsService,
    private readonly jobMatchService: JobMatchService,
  ) {}

  // ─── Public browse ────────────────────────────────────────────────────────

  @Get()
  @UseGuards(OptionalJwtAuthGuard)
  async findAll(
    @Query('search') search?: string,
    @Query('category') category?: string,
    @Query('jobType') jobType?: string,
    @Query('governorate') governorate?: string,
    @Query('salaryMin') salaryMin?: string,
    @Query('salaryMax') salaryMax?: string,
    @Query('maxExperience') maxExperience?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Req() req?: Request & { user?: { sub: string; role: string } },
  ) {
    const result = await this.jobsService.findAll(
      {
        search,
        category:      toCategory(category),
        jobType:       toJobType(jobType),
        governorate,
        salaryMin:     salaryMin     ? parseInt(salaryMin, 10)     : undefined,
        salaryMax:     salaryMax     ? parseInt(salaryMax, 10)     : undefined,
        maxExperience: maxExperience ? parseInt(maxExperience, 10) : undefined,
        page:          page          ? parseInt(page, 10)          : undefined,
        limit:         limit         ? parseInt(limit, 10)         : undefined,
      },
      req?.user,
    );

    // Enrich jobs with CV match scores for authenticated candidates.
    // This is done in the controller so the cached public feed is untouched.
    if (req?.user?.role === 'candidate') {
      const enriched = await this.jobMatchService.enrichWithMatchScores(
        req.user.sub,
        result.items,
      );
      return { ...result, items: enriched };
    }

    return result;
  }

  // ─── Recommended jobs — must come before /:id ─────────────────────────────

  /**
   * GET /jobs/recommended
   * Returns the top matching jobs for the authenticated candidate's CV.
   *
   * Query parameters:
   *   limit       — max results to return (1–50, default 10)
   *   governorate — optional case-insensitive governorate name filter
   *   city        — optional case-insensitive city name filter
   *   category    — optional JobCategory enum filter
   *   jobType     — optional JobType enum filter
   *   salaryMin   — optional minimum salary filter
   *   salaryMax   — optional maximum salary filter
   */
  @Get('recommended')
  @UseGuards(JwtAuthGuard)
  getRecommended(
    @Req() req: Request & { user: { sub: string } },
    @Query('limit') limit?: string,
    @Query('governorate') governorate?: string,
    @Query('city') city?: string,
  ) {
    return this.jobMatchService.getRecommendedJobs(
      req.user.sub,
      limit ? parseInt(limit, 10) : undefined,
      {
        governorate: governorate?.trim() || undefined,
        city: city?.trim() || undefined,
      },
    );
  }

  // ─── Single-job CV match ──────────────────────────────────────────────────

  @Get(':id/match')
  @UseGuards(JwtAuthGuard)
  matchJob(
    @Param('id', ParseCuidPipe) id: string,
    @Req() req: Request & { user: { sub: string } },
  ) {
    return this.jobMatchService.matchCvToJob(req.user.sub, id);
  }

  // ─── Job detail ───────────────────────────────────────────────────────────

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.jobsService.findOne(id);
  }

  // ─── HR / admin mutations ─────────────────────────────────────────────────

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.hr, Role.admin)
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  create(
    @Body(VP) body: CreateJobDto,
    @Req() req: Request & { user: { sub: string } },
  ) {
    return this.jobsService.create(body, req.user.sub);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.hr, Role.admin)
  update(
    @Param('id', ParseCuidPipe) id: string,
    @Body(VP) body: UpdateJobDto,
    @Req() req: Request & { user: { sub: string } },
  ) {
    return this.jobsService.update(id, body, req.user.sub);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.hr, Role.admin)
  remove(
    @Param('id', ParseCuidPipe) id: string,
    @Req() req: Request & { user: { sub: string } },
  ) {
    return this.jobsService.remove(id, req.user.sub);
  }
}
