import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Put,
  Query,
  Req,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import type { Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { CvService } from './cv.service';
import { CvIntelligenceService } from './cv-intelligence.service';
import { CvExportService } from './cv-export.service';
import { UpdateCvDto } from './dto/update-cv.dto';
import { AnalyzeCvDto } from './dto/analyze-cv.dto';

const MAX_PDF_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

/** Multer config — saves PDF to uploads/cv/ with a timestamped unique filename */
const pdfUploadInterceptor = FileInterceptor('file', {
  storage: diskStorage({
    destination: (_req, _file, cb) => {
      const dest = join(process.cwd(), 'uploads', 'cv');
      if (!existsSync(dest)) mkdirSync(dest, { recursive: true });
      cb(null, dest);
    },
    filename: (_req, file, cb) => {
      const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      cb(null, `${unique}${extname(file.originalname)}`);
    },
  }),
  fileFilter: (_req, file, cb) => {
    if (file.mimetype !== 'application/pdf') {
      return cb(new BadRequestException('Only PDF files are allowed'), false);
    }
    cb(null, true);
  },
  limits: { fileSize: MAX_PDF_SIZE_BYTES },
});

@Controller('cv')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.candidate)
export class CvController {
  constructor(
    private readonly cvService: CvService,
    private readonly cvIntelligenceService: CvIntelligenceService,
    private readonly config: ConfigService,
    private readonly cvExportService: CvExportService,
  ) {}

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
   * GET /cv/me/feedback
   * Returns the stored career-advisor feedback from the last PDF upload
   * analysis (score, strengths, weaknesses, improvements, recommendedSkills).
   * Returns null (200) when no PDF has been analysed yet.
   */
  @Get('me/feedback')
  getFeedback(@Req() req: Request & { user: { sub: string } }) {
    return this.cvService.getCvFeedback(req.user.sub);
  }

  /**
   * POST /cv/upload-pdf
   * Accepts a PDF file (multipart/form-data) + applicationId body field.
   * Stores the file locally, updates Application.cvUrl, and returns the
   * public download URL.
   */
  @Post('upload-pdf')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(pdfUploadInterceptor)
  async uploadPdf(
    @Req() req: Request & { user: { sub: string } },
    @UploadedFile() file: Express.Multer.File,
    @Body('applicationId') applicationId: string,
  ) {
    if (!file) throw new BadRequestException('No PDF file received');
    if (!applicationId) throw new BadRequestException('applicationId is required');

    const baseUrl =
      this.config.get<string>('BACKEND_URL') ??
      `http://localhost:${this.config.get<string>('PORT') ?? '8080'}`;

    return this.cvService.uploadCvPdf(req.user.sub, applicationId, file, baseUrl);
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

  /**
   * POST /cv/re-analyze-pdf
   * Re-triggers Groq AI analysis on the candidate's most recently uploaded CV
   * PDF. Useful when the automatic background analysis was skipped (e.g. Groq
   * was temporarily unavailable) or when the candidate uploads a new version.
   *
   * Returns immediately with { status: 'queued' } — the analysis runs async.
   */
  @Post('re-analyze-pdf')
  @HttpCode(HttpStatus.OK)
  reAnalyzePdf(@Req() req: Request & { user: { sub: string } }) {
    return this.cvService.reAnalyzeLatestPdf(req.user.sub);
  }

  /**
   * POST /cv/intelligence
   * Runs the full CV intelligence pipeline (synchronous, ~10-15 s):
   *   structuredData + gapAnalysis + careerRecommendations + improvedCv
   * Result is persisted in cv.data.intelligence for subsequent GET calls.
   */
  @Post('intelligence')
  @HttpCode(HttpStatus.OK)
  runIntelligence(@Req() req: Request & { user: { sub: string } }) {
    return this.cvIntelligenceService.analyze(req.user.sub);
  }

  /**
   * GET /cv/me/intelligence
   * Returns the last stored CvIntelligenceResult, or null if none yet.
   */
  @Get('me/intelligence')
  getIntelligence(@Req() req: Request & { user: { sub: string } }) {
    return this.cvIntelligenceService.getStored(req.user.sub);
  }

  /**
   * GET /cv/export/pdf?template=modern|classic|ats
   * Generates a PDF of the candidate's CV using the specified template.
   * Returns the PDF as a binary attachment.
   */
  @Get('export/pdf')
  async exportPdf(
    @Req() req: Request & { user: { sub: string } },
    @Query('template') template: string,
    @Res() res: Response,
  ) {
    const validTemplate = (['modern', 'classic', 'ats'] as const).includes(
      template as 'modern' | 'classic' | 'ats',
    )
      ? (template as 'modern' | 'classic' | 'ats')
      : 'modern';

    const buffer = await this.cvExportService.exportCvAsPdf(
      req.user.sub,
      validTemplate,
    );

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="cv-${validTemplate}.pdf"`,
      'Content-Length': buffer.length,
    });
    res.end(buffer);
  }
}
