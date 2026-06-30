import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Query,
  Body,
  Req,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { JwtAuthGuard, Public } from '../auth/jwt-auth.guard';
import { TrialBookingService } from './trial-booking.service';

@Controller('trial-bookings')
@UseGuards(JwtAuthGuard)
export class TrialBookingController {
  constructor(
    private readonly service: TrialBookingService,
    private readonly jwtService: JwtService,
  ) {}

  /** 创建试听预约（公开接口，未登录也可提交；已登录则自动关联用户） */
  @Post()
  @Public()
  create(
    @Body() body: { courseId: string; name: string; phone: string; preferDate?: string },
    @Req() req: any,
  ) {
    // @Public() 跳过了 JWT 守卫，手动尝试解析 token 获取 userId
    let userId: string | undefined;
    const auth = req.headers.authorization;
    if (auth?.startsWith('Bearer ')) {
      try {
        const decoded = this.jwtService.verify(auth.slice(7));
        userId = decoded.userId || decoded.sub;
      } catch {}
    }
    return this.service.create({ ...body, userId });
  }

  /** 用户端 - 我的试听预约列表 */
  @Get('my')
  findMy(
    @Query('page') page: number,
    @Query('pageSize') pageSize: number,
    @Req() req: any,
  ) {
    return this.service.findMy(req.user.userId, {
      page: Number(page) || 1,
      pageSize: Number(pageSize) || 20,
    });
  }

  /** 管理员 - 试听预约列表 */
  @Get()
  findAll(
    @Query('page') page: number,
    @Query('pageSize') pageSize: number,
    @Query('status') status: string,
    @Query('courseId') courseId: string,
    @Query('keyword') keyword: string,
    @Req() req: any,
  ) {
    if (req.user.role !== 'admin') throw new ForbiddenException('仅管理员可访问');
    return this.service.findAll({
      page: Number(page) || 1,
      pageSize: Number(pageSize) || 20,
      status,
      courseId,
      keyword,
    });
  }

  /** 管理员 - 试听预约详情 */
  @Get(':id')
  async findOne(@Param('id') id: string, @Req() req: any) {
    if (req.user.role !== 'admin') throw new ForbiddenException('仅管理员可访问');
    return this.service.findOne(id);
  }

  /** 管理员 - 更新状态 */
  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Body() body: { status: string; remark?: string },
    @Req() req: any,
  ) {
    if (req.user.role !== 'admin') throw new ForbiddenException('仅管理员可访问');
    return this.service.updateStatus(id, body.status, body.remark);
  }

  /** 管理员 - 添加跟进记录 */
  @Post(':id/follow-ups')
  addFollowUp(
    @Param('id') id: string,
    @Body() body: { content: string },
    @Req() req: any,
  ) {
    if (req.user.role !== 'admin') throw new ForbiddenException('仅管理员可访问');
    return this.service.addFollowUp(id, req.user.userId, body.content);
  }
}
