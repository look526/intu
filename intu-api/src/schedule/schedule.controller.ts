import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Query,
  Body,
  UseGuards,
  Req,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ScheduleService } from './schedule.service';

@Controller('schedules')
@UseGuards(AuthGuard('jwt'))
export class ScheduleController {
  constructor(private readonly scheduleService: ScheduleService) {}

  @Get()
  findAll(
    @Query()
    query: {
      page?: number;
      pageSize?: number;
      dateFrom?: string;
      dateTo?: string;
      classroomId?: string;
      teacherId?: string;
      courseId?: string;
      classGroupId?: string;
      status?: string;
    },
  ) {
    return this.scheduleService.findAll(query);
  }

  // ===== 学员端：我的排课 =====
  // 必须在 :id 前面定义

  @Get('my-today')
  findMyToday(@Req() req: any) {
    return this.scheduleService.findMyToday(req.user.userId);
  }

  @Get('my')
  findMyByDate(
    @Query('date') date: string,
    @Req() req: any,
  ) {
    const d = date || new Date().toISOString().slice(0, 10);
    return this.scheduleService.findMyByDate(req.user.userId, d);
  }

  /** 获取学员某月有课的日期列表 */
  @Get('my-dates')
  findMyDates(
    @Query('year') year: string,
    @Query('month') month: string,
    @Req() req: any,
  ) {
    return this.scheduleService.findMyDates(
      req.user.userId,
      Number(year) || new Date().getFullYear(),
      Number(month) || new Date().getMonth() + 1,
    );
  }

  // classroom-occupied 必须在 :id 前面
  @Get('classroom-occupied')
  getClassroomOccupied(
    @Query('classroomId') classroomId: string,
    @Query('dateFrom') dateFrom: string,
  ) {
    return this.scheduleService.getClassroomOccupied(classroomId, dateFrom);
  }

  // calendar 必须在 :id 前面
  @Get('calendar')
  getCalendarEvents(
    @Query()
    query: {
      dateFrom: string;
      dateTo: string;
      classroomId?: string;
      teacherId?: string;
      classGroupId?: string;
    },
  ) {
    return this.scheduleService.getCalendarEvents(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.scheduleService.findOne(id);
  }

  @Post()
  create(
    @Body()
    body: {
      courseId: string;
      classroomId: string;
      teacherId: string;
      assistantId?: string;
      classGroupId?: string;
      startTime: string;
      endTime: string;
    },
    @Req() req: any,
  ) {
    return this.scheduleService.create(body, req.user.userId);
  }

  @Post('check-conflicts')
  checkConflicts(
    @Body()
    body: {
      classroomId: string;
      teacherId: string;
      assistantId?: string;
      startTime: string;
      endTime: string;
      excludeId?: string;
    },
  ) {
    return this.scheduleService.checkConflicts({
      ...body,
      startTime: new Date(body.startTime),
      endTime: new Date(body.endTime),
    });
  }

  @Post('batch-preview')
  batchPreview(
    @Body()
    body: {
      courseId: string;
      classroomId: string;
      teacherId: string;
      assistantId?: string;
      rules: { weekday: number; startTime: string; endTime: string }[];
      dateFrom: string;
      dateTo: string;
      skipDates?: string[];
    },
  ) {
    return this.scheduleService.batchPreview(body);
  }

  @Post('batch')
  batchCreate(
    @Body()
    body: {
      courseId: string;
      classGroupId?: string;
      classroomId: string;
      teacherId: string;
      assistantId?: string;
      rules: { weekday: number; startTime: string; endTime: string }[];
      dateFrom: string;
      dateTo: string;
      skipDates?: string[];
    },
    @Req() req: any,
  ) {
    return this.scheduleService.batchCreate(body, req.user.userId);
  }

  @Put(':id')
  update(
    @Param('id') id: string,
    @Body()
    body: {
      courseId?: string;
      classroomId?: string;
      teacherId?: string;
      assistantId?: string;
      classGroupId?: string;
      startTime?: string;
      endTime?: string;
    },
  ) {
    return this.scheduleService.update(id, body);
  }

  @Put(':id/cancel')
  cancel(@Param('id') id: string) {
    return this.scheduleService.cancel(id);
  }

  @Put(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Body('status') status: 'ongoing' | 'completed',
  ) {
    return this.scheduleService.updateStatus(id, status);
  }
}
