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
  create(
    @Body(VP) body: CreateOrgDto,
    @Req() req: Request & { user: { sub: string } },
  ) {
    return this.orgService.create(body, req.user.sub);
  }

  @Get('my')
  myOrgs(@Req() req: Request & { user: { sub: string } }) {
    return this.orgService.myOrgs(req.user.sub);
  }

  @Get(':id')
  findOne(
    @Param('id') id: string,
    @Req() req: Request & { user: { sub: string } },
  ) {
    return this.orgService.findOne(id, req.user.sub);
  }

  @Post(':id/members')
  inviteMember(
    @Param('id') id: string,
    @Body(VP) body: InviteMemberDto,
    @Req() req: Request & { user: { sub: string } },
  ) {
    return this.orgService.inviteMember(id, body, req.user.sub);
  }

  @Delete(':id/members/:memberId')
  removeMember(
    @Param('id') id: string,
    @Param('memberId') memberId: string,
    @Req() req: Request & { user: { sub: string } },
  ) {
    return this.orgService.removeMember(id, memberId, req.user.sub);
  }
}
