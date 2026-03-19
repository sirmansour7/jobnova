import { Controller, Get, Post, Param, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { SavedJobsService } from './saved-jobs.service';
import { ParseCuidPipe } from '../common/pipes/parse-cuid.pipe';

@Controller('saved-jobs')
@UseGuards(JwtAuthGuard)
export class SavedJobsController {
  constructor(private readonly savedJobsService: SavedJobsService) {}

  @Get()
  @UseGuards(RolesGuard)
  @Roles(Role.candidate)
  findAll(@Req() req: Request & { user: { sub: string } }) {
    return this.savedJobsService.findAll(req.user.sub);
  }

  @Get(':jobId/status')
  isSaved(
    @Param('jobId', ParseCuidPipe) jobId: string,
    @Req() req: Request & { user: { sub: string } },
  ) {
    return this.savedJobsService.isSaved(req.user.sub, jobId);
  }

  @Post(':jobId')
  @UseGuards(RolesGuard)
  @Roles(Role.candidate)
  toggle(
    @Param('jobId', ParseCuidPipe) jobId: string,
    @Req() req: Request & { user: { sub: string } },
  ) {
    return this.savedJobsService.toggle(req.user.sub, jobId);
  }
}
