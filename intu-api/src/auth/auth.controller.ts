import { Controller, Post, Get, Patch, Body, UseGuards, Request } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { LoginDto } from './dto/login.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('admin/login')
  async adminLogin(@Body() loginDto: LoginDto) {
    const user = await this.authService.validateAdmin(
      loginDto.phone,
      loginDto.password,
    );
    return this.authService.login(user);
  }

  @Post('wx-login')
  async wxLogin(@Body() body: { code: string; devOpenid?: string }) {
    return this.authService.validateByWechat(body.code, body.devOpenid);
  }

  @Post('send-code')
  async sendCode(@Body() body: { phone: string }) {
    return this.authService.sendSmsCode(body.phone);
  }

  @Post('phone-login')
  async phoneLogin(@Body() body: { phone: string; code: string }) {
    return this.authService.validateByPhone(body.phone, body.code);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('profile')
  async updateProfile(
    @Request() req: { user: { userId: string } },
    @Body() body: { nickname?: string; avatar?: string; phone?: string },
  ) {
    return this.authService.updateProfile(req.user.userId, body);
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  async getProfile(@Request() req: { user: { userId: string } }) {
    return this.authService.getProfile(req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('my-stats')
  async getMyStats(@Request() req: { user: { userId: string } }) {
    return this.authService.getMyStats(req.user.userId);
  }
}
