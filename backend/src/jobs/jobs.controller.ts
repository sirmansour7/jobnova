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
import { Role } from '@prisma/client';
import { JobsService } from './jobs.service';
import { CreateJobDto } from './dto/create-job.dto';
import { UpdateJobDto } from './dto/update-job.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import type { Request } from 'express';

const VP = new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
});

@Controller('jobs')
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  // Public — anyone can browse jobs
  @Get()
  findAll(
    @Query('category') category?: string,
    @Query('governorate') governorate?: string,
  ) {
    return this.jobsService.findAll({ category, governorate });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.jobsService.findOne(id);
  }

  // Protected — HR/OWNER only
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
    @Param('id') id: string,
    @Body(VP) body: UpdateJobDto,
    @Req() req: Request & { user: { sub: string } },
  ) {
    return this.jobsService.update(id, body, req.user.sub);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.hr, Role.admin)
  remove(
    @Param('id') id: string,
    @Req() req: Request & { user: { sub: string } },
  ) {
    return this.jobsService.remove(id, req.user.sub);
  }
}
