import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SystemConfigService {
  constructor(private readonly prisma: PrismaService) {}

  async getByKey(key: string) {
    const config = await this.prisma.systemConfig.findUnique({
      where: { key },
    });
    if (!config) {
      return [];
    }
    return config.value;
  }

  async getAll() {
    const configs = await this.prisma.systemConfig.findMany();
    const result: Record<string, unknown> = {};
    for (const config of configs) {
      result[config.key] = config.value;
    }
    return result;
  }

  async getByKeys(keys: string[]) {
    const configs = await this.prisma.systemConfig.findMany({
      where: { key: { in: keys } },
    });
    const result: Record<string, unknown> = {};
    for (const config of configs) {
      result[config.key] = config.value;
    }
    return result;
  }

  async upsert(key: string, value: unknown) {
    return this.prisma.systemConfig.upsert({
      where: { key },
      update: { value: value as any },
      create: { key, value: value as any },
    });
  }
}
