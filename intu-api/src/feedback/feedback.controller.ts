import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Body,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { FeedbackService } from './feedback.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('feedback')
export class FeedbackController {
  constructor(private readonly feedbackService: FeedbackService) {}

  // 小程序端：提交反馈
  @UseGuards(JwtAuthGuard)
  @Post()
  async create(
    @Request() req: { user: { userId: string } },
    @Body() body: { type: string; content: string; images?: string[]; contact?: string },
  ) {
    return this.feedbackService.create(req.user.userId, body);
  }

  // 管理后台：查看反馈列表
  @UseGuards(JwtAuthGuard)
  @Get()
  async findAll(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('status') status?: string,
  ) {
    return this.feedbackService.findAll({
      page: page ? parseInt(page) : 1,
      pageSize: pageSize ? parseInt(pageSize) : 20,
      status,
    });
  }

  // 管理后台：回复反馈
  @UseGuards(JwtAuthGuard)
  @Put(':id/reply')
  async reply(@Param('id') id: string, @Body('reply') reply: string) {
    return this.feedbackService.reply(id, reply);
  }

  // 管理后台：更新状态
  @UseGuards(JwtAuthGuard)
  @Put(':id/status')
  async updateStatus(@Param('id') id: string, @Body('status') status: string) {
    return this.feedbackService.updateStatus(id, status);
  }
}
