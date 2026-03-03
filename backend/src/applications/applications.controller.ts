import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import { ApplicationsService } from './applications.service';
import { CreateApplicationDto } from './dto/create-application.dto';
import { UpdateApplicationStatusDto } from './dto/update-application-status.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import type { Request } from 'express';

const VP = new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
});

@Controller('applications')
@UseGuards(JwtAuthGuard)
export class ApplicationsController {
  constructor(private readonly applicationsService: ApplicationsService) {}

  @Post()
  apply(
    @Body(VP) body: CreateApplicationDto,
    @Req() req: Request & { user: { sub: string } },
  ) {
    return this.applicationsService.apply(body, req.user.sub);
  }

  @Get('my')
  myApplications(@Req() req: Request & { user: { sub: string } }) {
    return this.applicationsService.myApplications(req.user.sub);
  }

  @Get('job/:jobId')
  jobApplications(
    @Param('jobId') jobId: string,
    @Req() req: Request & { user: { sub: string } },
  ) {
    return this.applicationsService.jobApplications(jobId, req.user.sub);
  }

  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Body(VP) body: UpdateApplicationStatusDto,
    @Req() req: Request & { user: { sub: string } },
  ) {
    return this.applicationsService.updateStatus(id, body, req.user.sub);
  }
}
