import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { CvService } from './cv.service';
import { UpdateCvDto } from './dto/update-cv.dto';
import { AnalyzeCvDto } from './dto/analyze-cv.dto';

@Controller('cv')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.candidate)
export class CvController {
  constructor(private readonly cvService: CvService) {}

  /** GET /cv/me — return raw CV data */
  @Get('me')
  getMe(@Req() req: Request & { user: { sub: string } }) {
    return this.cvService.getMyCv(req.user.sub);
  }

  /** PUT /cv/me — upsert CV content */
  @Put('me')
  upsertMe(
    @Req() req: Request & { user: { sub: string } },
    @Body() body: UpdateCvDto,
  ) {
    return this.cvService.upsertMyCv(req.user.sub, body);
  }

  /**
   * GET /cv/me/analysis
   * Returns the last stored CombinedCvAnalysisResult from cv.data.analysis.
   * Returns null (200) if no analysis has been run yet.
   */
  @Get('me/analysis')
  getAnalysis(@Req() req: Request & { user: { sub: string } }) {
    return this.cvService.getMyAnalysis(req.user.sub);
  }

  /**
   * POST /cv/me/analyze
   * Runs a synchronous combined analysis (rules + job-aware + optional AI)
   * against the supplied target role title.
   * Returns CombinedCvAnalysisResult immediately and persists it for GET above.
   */
  @Post('me/analyze')
  @HttpCode(HttpStatus.OK)
  analyzeMe(
    @Req() req: Request & { user: { sub: string } },
    @Body() dto: AnalyzeCvDto,
  ) {
    return this.cvService.analyzeMyCvForRole(
      req.user.sub,
      dto?.targetRoleTitle ?? '',
    );
  }
}
