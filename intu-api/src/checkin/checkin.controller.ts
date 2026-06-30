import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CheckinService } from './checkin.service';

@Controller('checkin')
@UseGuards(AuthGuard('jwt'))
export class CheckinController {
  constructor(private readonly checkinService: CheckinService) {}

  /** 打卡 */
  @Post()
  checkin(
    @Body() body: { scheduleId: string; latitude: number; longitude: number },
    @Req() req: any,
  ) {
    return this.checkinService.checkin(
      req.user.userId,
      body.scheduleId,
      body.latitude,
      body.longitude,
    );
  }

  /** 获取排课地点信息（打卡页面用） */
  @Get('schedule-location/:scheduleId')
  getScheduleLocation(@Param('scheduleId') scheduleId: string) {
    return this.checkinService.getScheduleLocation(scheduleId);
  }

  /** 查询学分 */
  @Get('my-credits')
  getMyCredits(@Req() req: any) {
    return this.checkinService.getMyCredits(req.user.userId);
  }

  /** 打卡历史记录 */
  @Get('my-records')
  getMyRecords(
    @Query('page') page: string,
    @Query('pageSize') pageSize: string,
    @Req() req: any,
  ) {
    return this.checkinService.getMyRecords(
      req.user.userId,
      Number(page) || 1,
      Number(pageSize) || 20,
    );
  }

  /** 管理员打卡记录列表 */
  @Get('admin/list')
  adminList(
    @Query()
    query: {
      page?: number;
      pageSize?: number;
      courseId?: string;
      keyword?: string;
      startDate?: string;
      endDate?: string;
    },
  ) {
    return this.checkinService.adminFindAll(query);
  }
}
