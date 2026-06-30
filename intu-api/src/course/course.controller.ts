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
import { CourseService } from './course.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('courses')
export class CourseController {
  constructor(private readonly courseService: CourseService) {}

  @Get()
  async findAll(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('categoryId') categoryId?: string,
    @Query('status') status?: string,
    @Query('keyword') keyword?: string,
  ) {
    return this.courseService.findAll({
      page: page ? parseInt(page, 10) : undefined,
      pageSize: pageSize ? parseInt(pageSize, 10) : undefined,
      categoryId: categoryId ? parseInt(categoryId, 10) : undefined,
      status,
      keyword,
    });
  }

  @Get('recommended')
  async findRecommended() {
    return this.courseService.findRecommended();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.courseService.findOne(id);
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  async create(
    @Body()
    data: {
      name: string;
      categoryId: number;
      teacherId: string;
      coverImage?: string;
      description?: string;
      totalHours?: number;
      isRecommended?: boolean;
    },
  ) {
    return this.courseService.create(data);
  }

  @UseGuards(JwtAuthGuard)
  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body()
    data: {
      name?: string;
      categoryId?: number;
      teacherId?: string;
      coverImage?: string;
      description?: string;
      totalHours?: number;
      isRecommended?: boolean;
    },
  ) {
    return this.courseService.update(id, data);
  }

  @UseGuards(JwtAuthGuard)
  @Put(':id/status')
  async updateStatus(
    @Param('id') id: string,
    @Body('status') status: string,
  ) {
    return this.courseService.updateStatus(id, status as any);
  }

  @UseGuards(JwtAuthGuard)
  @Put(':id/recommend')
  async toggleRecommend(@Param('id') id: string) {
    return this.courseService.toggleRecommend(id);
  }
}
