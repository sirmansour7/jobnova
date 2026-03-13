import {
  Controller,
  Get,
  Patch,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { NotificationsService } from './notifications.service';

@Controller('v1/notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly service: NotificationsService) {}

  @Get()
  getAll(
    @Request() req: { user: { userId: string } },
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const p = Math.max(1, parseInt(page ?? '1', 10) || 1);
    const l = Math.min(50, Math.max(1, parseInt(limit ?? '20', 10) || 20));
    return this.service.getForUser(req.user.userId, p, l);
  }

  @Patch(':id/read')
  markRead(
    @Request() req: { user: { userId: string } },
    @Param('id') id: string,
  ) {
    return this.service.markRead(req.user.userId, id);
  }

  @Patch('read-all')
  markAllRead(@Request() req: { user: { userId: string } }) {
    return this.service.markAllRead(req.user.userId);
  }
}
