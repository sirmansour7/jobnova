import {
  Body,
  Controller,
  Get,
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
@Controller('cv')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.candidate)
export class CvController {
  constructor(private readonly cvService: CvService) {}
  @Get('me')
  async getMe(@Req() req: Request & { user: { sub: string } }) {
    return this.cvService.getMyCv(req.user.sub);
  }
  @Put('me')
  async upsertMe(
    @Req() req: Request & { user: { sub: string } },
    @Body() body: unknown,
  ) {
    return this.cvService.upsertMyCv(req.user.sub, body);
  }
  @Post('me/analyze')
  async analyzeMe(@Req() req: Request & { user: { sub: string } }) {
    return this.cvService.analyzeMyCv(req.user.sub);
  }
}
