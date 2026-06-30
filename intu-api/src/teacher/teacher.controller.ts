import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { TeacherService } from './teacher.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('teachers')
export class TeacherController {
  constructor(private readonly teacherService: TeacherService) {}

  @Get('featured')
  findFeatured() {
    return this.teacherService.findFeatured();
  }

  @Get()
  findAll(
    @Query()
    query: {
      page?: number;
      pageSize?: number;
      trainingStatus?: string;
      status?: string;
      keyword?: string;
    },
  ) {
    return this.teacherService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.teacherService.findOne(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  create(
    @Body()
    data: {
      userId: string;
      realName: string;
      bio?: string;
      specialties?: string;
      certificateUrls?: any;
    },
  ) {
    return this.teacherService.create(data);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  update(
    @Param('id') id: string,
    @Body()
    data: {
      realName?: string;
      bio?: string;
      specialties?: string;
      certificateUrls?: any;
      avatarUrl?: string;
      phone?: string;
    },
  ) {
    return this.teacherService.update(id, data);
  }

  @Put(':id/training-status')
  @UseGuards(JwtAuthGuard)
  updateTrainingStatus(
    @Param('id') id: string,
    @Body() body: { trainingStatus: 'pending' | 'passed' | 'failed' },
  ) {
    return this.teacherService.updateTrainingStatus(id, body.trainingStatus);
  }

  @Put(':id/status')
  @UseGuards(JwtAuthGuard)
  updateStatus(
    @Param('id') id: string,
    @Body() body: { status: 'active' | 'frozen' },
  ) {
    return this.teacherService.updateStatus(id, body.status);
  }

  @Put(':id/recommend')
  @UseGuards(JwtAuthGuard)
  toggleRecommend(@Param('id') id: string) {
    return this.teacherService.toggleRecommend(id);
  }
}
