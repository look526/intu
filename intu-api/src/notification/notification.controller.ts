import {
  Controller,
  Get,
  Put,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { NotificationService } from './notification.service';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  /** 我的通知列表 */
  @Get()
  findAll(
    @Request() req: { user: { userId: string } },
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.notificationService.findByUser(
      req.user.userId,
      Number(page) || 1,
      Number(pageSize) || 20,
    );
  }

  /** 未读数量 */
  @Get('unread-count')
  getUnreadCount(@Request() req: { user: { userId: string } }) {
    return this.notificationService.getUnreadCount(req.user.userId);
  }

  /** 标记单条已读 */
  @Put(':id/read')
  markAsRead(
    @Param('id') id: string,
    @Request() req: { user: { userId: string } },
  ) {
    return this.notificationService.markAsRead(id, req.user.userId);
  }

  /** 全部标记已读 */
  @Put('read-all')
  markAllAsRead(@Request() req: { user: { userId: string } }) {
    return this.notificationService.markAllAsRead(req.user.userId);
  }
}
