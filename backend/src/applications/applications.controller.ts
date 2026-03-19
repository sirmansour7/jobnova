import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import { ApplicationsService } from './applications.service';
import { CreateApplicationDto } from './dto/create-application.dto';
import { UpdateApplicationStatusDto } from './dto/update-application-status.dto';
import { ScreeningAnswersDto } from './dto/screening-answers.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { ParseCuidPipe } from '../common/pipes/parse-cuid.pipe';
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
  myApplications(
    @Req() req: Request & { user: { sub: string } },
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.applicationsService.myApplications(
      req.user.sub,
      page ? parseInt(page, 10) : undefined,
      limit ? parseInt(limit, 10) : undefined,
    );
  }

  @Get('job/:jobId')
  jobApplications(
    @Param('jobId', ParseCuidPipe) jobId: string,
    @Req() req: Request & { user: { sub: string } },
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.applicationsService.jobApplications(
      jobId,
      req.user.sub,
      page ? parseInt(page, 10) : undefined,
      limit ? parseInt(limit, 10) : undefined,
    );
  }

  @Get(':id')
  findOne(
    @Param('id', ParseCuidPipe) id: string,
    @Req() req: Request & { user: { sub: string } },
  ) {
    return this.applicationsService.findOne(id, req.user.sub);
  }

  @Patch(':id/screening')
  submitScreening(
    @Param('id', ParseCuidPipe) id: string,
    @Body(VP) dto: ScreeningAnswersDto,
    @Req() req: Request & { user: { sub: string } },
  ) {
    return this.applicationsService.submitScreening(
      id,
      req.user.sub,
      dto.screeningAnswers,
    );
  }

  @Patch(':id/status')
  updateStatus(
    @Param('id', ParseCuidPipe) id: string,
    @Body(VP) body: UpdateApplicationStatusDto,
    @Req() req: Request & { user: { sub: string } },
  ) {
    return this.applicationsService.updateStatus(id, body, req.user.sub);
  }
}
