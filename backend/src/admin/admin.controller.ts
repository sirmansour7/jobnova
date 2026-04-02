import {
  Controller,
  Get,
  Patch,
  Post,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';
import { ParseCuidPipe } from '../common/pipes/parse-cuid.pipe';

function safePage(val: unknown): number {
  const n = parseInt(String(val), 10);
  return Number.isFinite(n) && n > 0 ? n : 1;
}

function safeLimit(val: unknown, max = 100): number {
  const n = parseInt(String(val), 10);
  return Number.isFinite(n) && n > 0 ? Math.min(n, max) : 20;
}

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.admin)
export class AdminController {
  constructor(private adminService: AdminService) {}

  @Get('stats')
  getStats() {
    return this.adminService.getStats();
  }

  @Get('analytics')
  getAnalytics() {
    return this.adminService.getAnalytics();
  }

  @Get('users')
  getUsers(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('role') role?: string,
  ) {
    return this.adminService.getUsers(safePage(page), safeLimit(limit), role);
  }

  @Patch('users/:id/role')
  updateUserRole(@Param('id', ParseCuidPipe) id: string, @Body() dto: UpdateUserRoleDto) {
    return this.adminService.updateUserRole(id, dto.role);
  }

  @Delete('users/:id')
  deleteUser(@Param('id') id: string) {
    return this.adminService.deleteUser(id);
  }

  @Post('users/:id/restore')
  restoreUser(@Param('id') id: string) {
    return this.adminService.restoreUser(id);
  }

  @Patch('users/:id/ban')
  toggleUserBan(@Param('id') id: string) {
    return this.adminService.toggleUserBan(id);
  }

  @Get('jobs')
  getJobs(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('category') category?: string,
    @Query('status') status?: string,
  ) {
    return this.adminService.getJobs(
      safePage(page),
      safeLimit(limit),
      search,
      category,
      status,
    );
  }

  @Patch('jobs/:id/toggle')
  toggleJob(@Param('id') id: string) {
    return this.adminService.toggleJobActive(id);
  }

  @Delete('jobs/:id')
  deleteJob(@Param('id') id: string) {
    return this.adminService.deleteJob(id);
  }

  @Post('jobs/:id/restore')
  restoreJob(@Param('id') id: string) {
    return this.adminService.restoreJob(id);
  }

  @Get('orgs')
  getOrgs(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
  ) {
    return this.adminService.getOrgs(safePage(page), safeLimit(limit), search);
  }

  @Get('orgs/:id')
  getOneOrg(@Param('id') id: string) {
    return this.adminService.getOneOrg(id);
  }

  @Patch('orgs/:id')
  updateOrg(@Param('id') id: string, @Body() body: { name?: string; description?: string; industry?: string; website?: string; location?: string; size?: string }) {
    return this.adminService.updateOrg(id, body);
  }

  @Patch('orgs/:id/assign-hr')
  assignHr(@Param('id') id: string, @Body() body: { hrUserId: string | null }) {
    return this.adminService.assignHr(id, body.hrUserId ?? null);
  }

  @Delete('orgs/:id')
  deleteOrg(@Param('id') id: string) {
    return this.adminService.deleteOrg(id);
  }

  @Post('orgs/:id/restore')
  restoreOrg(@Param('id') id: string) {
    return this.adminService.restoreOrg(id);
  }
}
