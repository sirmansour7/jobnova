import { Controller, Get, Param, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { ParseCuidPipe } from '../common/pipes/parse-cuid.pipe';
import { FilesService } from './files.service';

@Controller('files')
@UseGuards(JwtAuthGuard)
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Get('cv/applications/:applicationId')
  getApplicationCv(
    @Param('applicationId', ParseCuidPipe) applicationId: string,
    @Req() req: Request & { user: { sub: string; role: Role } },
  ) {
    return this.filesService.streamApplicationCvPdf(
      { sub: req.user.sub, role: req.user.role },
      applicationId,
      req,
    );
  }
}
