import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  Req,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { ReviewService } from './review.service';
import { JwtAuthGuard, Public } from '../auth/jwt-auth.guard';

@Controller('reviews')
@UseGuards(JwtAuthGuard)
export class ReviewController {
  constructor(private readonly reviewService: ReviewService) {}

  /** 提交评价 */
  @Post()
  create(
    @Body()
    body: { scheduleId: string; rating: number; content?: string },
    @Req() req: any,
  ) {
    return this.reviewService.create(req.user.userId, body);
  }

  /** 我的评价列表（学员端，放在 :scheduleId 之前） */
  @Get('my')
  findMy(
    @Query('page') page: number,
    @Query('pageSize') pageSize: number,
    @Req() req: any,
  ) {
    return this.reviewService.findMy(
      req.user.userId,
      Number(page) || 1,
      Number(pageSize) || 20,
    );
  }

  /** 检查某排课是否已评价（学员端） */
  @Get('check/:scheduleId')
  check(@Param('scheduleId') scheduleId: string, @Req() req: any) {
    return this.reviewService.checkBySchedule(req.user.userId, scheduleId);
  }

  /** 课程评价列表（公开接口，供小程序课程详情页使用） */
  @Get('course/:courseId')
  @Public()
  findByCourse(
    @Param('courseId') courseId: string,
    @Query('page') page: number,
    @Query('pageSize') pageSize: number,
  ) {
    return this.reviewService.findAll({
      courseId,
      page: Number(page) || 1,
      pageSize: Number(pageSize) || 10,
    });
  }

  /** 评价列表（管理端） */
  @Get()
  findAll(
    @Query()
    query: {
      courseId?: string;
      teacherId?: string;
      studentId?: string;
      page?: number;
      pageSize?: number;
    },
    @Req() req: any,
  ) {
    if (req.user.role !== 'admin') {
      throw new ForbiddenException('仅管理员可访问');
    }
    return this.reviewService.findAll(query);
  }
}
