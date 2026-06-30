import { Controller, Get, UseGuards, Req, ForbiddenException } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('dashboard')
@UseGuards(JwtAuthGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('stats')
  getStats(@Req() req: any) {
    if (req.user.role !== 'admin') {
      throw new ForbiddenException('仅管理员可访问');
    }
    return this.dashboardService.getStats();
  }
}
