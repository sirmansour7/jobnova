import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import { OrgService } from './org.service';
import { CreateOrgDto } from './dto/create-org.dto';
import { InviteMemberDto } from './dto/invite-member.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { ParseCuidPipe } from '../common/pipes/parse-cuid.pipe';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import type { Request } from 'express';

const VP = new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
});

@Controller('orgs')
@UseGuards(JwtAuthGuard)
export class OrgController {
  constructor(private readonly orgService: OrgService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(Role.hr)
  create(
    @Body(VP) body: CreateOrgDto,
    @Req() req: Request & { user: { sub: string } },
  ) {
    return this.orgService.create(body, req.user.sub);
  }

  @Get('my/profile')
  getMyProfile(@Req() req: Request & { user: { sub: string } }) {
    return this.orgService.getMyFirstOrg(req.user.sub);
  }

  @Get('my')
  myOrgs(@Req() req: Request & { user: { sub: string } }) {
    return this.orgService.getMyOrgs(req.user.sub);
  }

  @Get('dashboard-stats')
  getDashboardStats(@Req() req: Request & { user: { sub: string } }) {
    return this.orgService.getDashboardStats(req.user.sub);
  }

  @Get(':id')
  findOne(
    @Param('id', ParseCuidPipe) id: string,
    @Req() req: Request & { user: { sub: string } },
  ) {
    return this.orgService.findOne(id, req.user.sub);
  }

  @Post(':id/members')
  inviteMember(
    @Param('id', ParseCuidPipe) id: string,
    @Body(VP) body: InviteMemberDto,
    @Req() req: Request & { user: { sub: string } },
  ) {
    return this.orgService.inviteMember(id, body, req.user.sub);
  }

  @Delete(':id/members/:memberId')
  removeMember(
    @Param('id', ParseCuidPipe) id: string,
    @Param('memberId', ParseCuidPipe) memberId: string,
    @Req() req: Request & { user: { sub: string } },
  ) {
    return this.orgService.removeMember(id, memberId, req.user.sub);
  }
}
