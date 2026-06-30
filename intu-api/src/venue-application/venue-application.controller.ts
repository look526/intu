import {
  Controller,
  Post,
  Get,
  Put,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { VenueApplicationService } from './venue-application.service';

@Controller('venue-applications')
@UseGuards(JwtAuthGuard)
export class VenueApplicationController {
  constructor(private readonly service: VenueApplicationService) {}

  /** 提交申请（学员端） */
  @Post()
  submit(
    @Req() req: any,
    @Body()
    body: {
      name: string;
      address: string;
      latitude: number;
      longitude: number;
      trafficInfo?: string;
      area?: number;
      photos?: string[];
    },
  ) {
    return this.service.submit(req.user.userId, body);
  }

  /** 查询我的申请进度（学员端） */
  @Get('my')
  findMy(@Req() req: any) {
    return this.service.findMyLatest(req.user.userId);
  }

  /** 申请列表（管理端） */
  @Get()
  findAll(
    @Query() query: { status?: string; page?: number; pageSize?: number },
    @Req() req: any,
  ) {
    if (req.user.role !== 'admin') {
      throw new ForbiddenException('仅管理员可访问');
    }
    return this.service.findAll(query);
  }

  /** 申请详情（管理端） */
  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: any) {
    if (req.user.role !== 'admin') {
      throw new ForbiddenException('仅管理员可访问');
    }
    return this.service.findOne(id);
  }

  /** 审核（管理端） */
  @Put(':id/audit')
  audit(
    @Param('id') id: string,
    @Body() body: { status: 'approved' | 'rejected'; auditRemark?: string },
    @Req() req: any,
  ) {
    if (req.user.role !== 'admin') {
      throw new ForbiddenException('仅管理员可访问');
    }
    return this.service.audit(id, body);
  }
}
