import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { GovernoratesService } from './governorates.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { ParseCuidPipe } from '../common/pipes/parse-cuid.pipe';

@Controller('governorates')
export class GovernoratesController {
  constructor(private readonly govService: GovernoratesService) {}

  // Public endpoints — anyone can read governorates/cities
  @Get()
  getAll(@Query('search') search?: string) {
    return this.govService.getAll(search);
  }

  @Get(':id')
  getOne(@Param('id', ParseCuidPipe) id: string) {
    return this.govService.getOne(id);
  }

  @Get(':id/cities')
  getCities(@Param('id', ParseCuidPipe) id: string, @Query('search') search?: string) {
    return this.govService.getCities(id, search);
  }

  // Admin-only write endpoints
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.admin)
  createGovernorate(@Body('name') name: string) {
    return this.govService.createGovernorate(name);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.admin)
  updateGovernorate(@Param('id', ParseCuidPipe) id: string, @Body('name') name: string) {
    return this.govService.updateGovernorate(id, name);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.admin)
  deleteGovernorate(@Param('id', ParseCuidPipe) id: string) {
    return this.govService.deleteGovernorate(id);
  }

  @Post(':id/cities')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.admin)
  createCity(@Param('id') governorateId: string, @Body('name') name: string) {
    return this.govService.createCity(governorateId, name);
  }

  @Patch('cities/:cityId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.admin)
  updateCity(@Param('cityId', ParseCuidPipe) cityId: string, @Body('name') name: string) {
    return this.govService.updateCity(cityId, name);
  }

  @Delete('cities/:cityId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.admin)
  deleteCity(@Param('cityId', ParseCuidPipe) cityId: string) {
    return this.govService.deleteCity(cityId);
  }
}
