import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { OrderService } from './order.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('orders')
@UseGuards(JwtAuthGuard)
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  /** 学员下单 */
  @Post()
  create(
    @Body() body: { courseId: string; scheduleIds?: string[] },
    @Req() req: any,
  ) {
    return this.orderService.create(body, req.user.userId);
  }

  /** 学员查看自己的订单 */
  @Get('my')
  findMyOrders(
    @Query() query: { page?: number; pageSize?: number; status?: string },
    @Req() req: any,
  ) {
    return this.orderService.findAllByStudent(req.user.userId, query);
  }

  /** 管理后台查看所有订单 */
  @Get()
  findAll(
    @Query()
    query: { page?: number; pageSize?: number; status?: string; keyword?: string },
    @Req() req: any,
  ) {
    if (req.user.role !== 'admin') {
      throw new ForbiddenException('仅管理员可访问');
    }
    return this.orderService.findAll(query);
  }

  /** 订单详情 */
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.orderService.findOne(id);
  }

  /** 确认收款 */
  @Put(':id/confirm-paid')
  confirmPaid(@Param('id') id: string, @Req() req: any) {
    if (req.user.role !== 'admin') {
      throw new ForbiddenException('仅管理员可操作');
    }
    return this.orderService.confirmPaid(id);
  }

  /** 取消订单 */
  @Put(':id/cancel')
  cancel(@Param('id') id: string, @Req() req: any) {
    return this.orderService.cancel(id, req.user.userId);
  }
}
