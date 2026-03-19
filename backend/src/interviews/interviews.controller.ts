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
import { Role } from '@prisma/client';
import type { Request } from 'express';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { InterviewsService } from './interviews.service';
import { ParseCuidPipe } from '../common/pipes/parse-cuid.pipe';
import { StartInterviewDto } from './dto/start-interview.dto';
import { AnswerInterviewDto } from './dto/answer-interview.dto';
import { UpdateInterviewDecisionDto } from './dto/update-interview-decision.dto';

const VP = new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
});

@Controller('interviews')
@UseGuards(JwtAuthGuard)
export class InterviewsController {
  constructor(private readonly interviewsService: InterviewsService) {}

  @Post('start')
  start(
    @Body(VP) dto: StartInterviewDto,
    @Req() req: Request & { user: { sub: string } },
  ) {
    return this.interviewsService.startInterview(
      dto.applicationId,
      req.user.sub,
    );
  }

  @Post(':id/answer')
  answer(
    @Param('id', ParseCuidPipe) id: string,
    @Body(VP) dto: AnswerInterviewDto,
    @Req() req: Request & { user: { sub: string } },
  ) {
    return this.interviewsService.answerInterview(
      id,
      req.user.sub,
      dto.content,
    );
  }

  @Get(':id')
  getSession(
    @Param('id', ParseCuidPipe) id: string,
    @Req() req: Request & { user: { sub: string } },
  ) {
    return this.interviewsService.getSession(id, req.user.sub);
  }
}

@Controller('hr/interviews')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.hr, Role.admin)
export class HrInterviewsController {
  constructor(private readonly interviewsService: InterviewsService) {}

  @Get()
  list(@Req() req: Request & { user: { sub: string } }) {
    return this.interviewsService.listForHr(req.user.sub);
  }

  @Get(':id')
  getOne(
    @Param('id', ParseCuidPipe) id: string,
    @Req() req: Request & { user: { sub: string } },
  ) {
    return this.interviewsService.getForHr(id, req.user.sub);
  }

  @Patch(':id/decision')
  updateDecision(
    @Param('id', ParseCuidPipe) id: string,
    @Body(VP) dto: UpdateInterviewDecisionDto,
    @Req() req: Request & { user: { sub: string } },
  ) {
    return this.interviewsService.updateDecision(
      id,
      req.user.sub,
      dto.decision,
    );
  }
}
