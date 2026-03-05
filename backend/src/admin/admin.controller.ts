import {
  Controller,
  Get,
  Patch,
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

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.admin)
export class AdminController {
  constructor(private adminService: AdminService) {}

  @Get('stats')
  getStats() {
    return this.adminService.getStats();
  }

  @Get('users')
  getUsers(@Query('page') page?: string, @Query('limit') limit?: string) {
    return this.adminService.getUsers(
      page ? parseInt(page, 10) : undefined,
      limit ? parseInt(limit, 10) : undefined,
    );
  }

  @Patch('users/:id/role')
  updateUserRole(@Param('id') id: string, @Body('role') role: Role) {
    return this.adminService.updateUserRole(id, role);
  }

  @Delete('users/:id')
  deleteUser(@Param('id') id: string) {
    return this.adminService.deleteUser(id);
  }

  @Get('jobs')
  getJobs(@Query('page') page?: string, @Query('limit') limit?: string) {
    return this.adminService.getJobs(
      page ? parseInt(page, 10) : undefined,
      limit ? parseInt(limit, 10) : undefined,
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

  @Get('orgs')
  getOrgs(@Query('page') page?: string, @Query('limit') limit?: string) {
    return this.adminService.getOrgs(
      page ? parseInt(page, 10) : undefined,
      limit ? parseInt(limit, 10) : undefined,
    );
  }

  @Delete('orgs/:id')
  deleteOrg(@Param('id') id: string) {
    return this.adminService.deleteOrg(id);
  }
}
