import {
  Controller,
  Get,
  Put,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { SystemConfigService } from './system-config.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('system-config')
export class SystemConfigController {
  constructor(private readonly configService: SystemConfigService) {}

  @Get()
  async getAll(@Query('keys') keys?: string) {
    if (keys) {
      const keyArr = keys.split(',').map((k) => k.trim());
      return this.configService.getByKeys(keyArr);
    }
    return this.configService.getAll();
  }

  @Get(':key')
  async getByKey(@Param('key') key: string) {
    return this.configService.getByKey(key);
  }

  @UseGuards(JwtAuthGuard)
  @Put(':key')
  async upsert(@Param('key') key: string, @Body('value') value: unknown) {
    await this.configService.upsert(key, value);
    return { success: true };
  }
}
