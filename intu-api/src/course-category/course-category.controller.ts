import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { CourseCategoryService } from './course-category.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('course-categories')
export class CourseCategoryController {
  constructor(private readonly categoryService: CourseCategoryService) {}

  @Get()
  async findAll() {
    return this.categoryService.findAll();
  }

  @UseGuards(JwtAuthGuard)
  @Put('sort')
  async sort(@Body('items') items: { id: number; priority: number }[]) {
    return this.categoryService.updatePriority(items);
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.categoryService.findOne(id);
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  async create(
    @Body() data: { name: string; icon?: string; priority?: number },
  ) {
    return this.categoryService.create(data);
  }

  @UseGuards(JwtAuthGuard)
  @Put(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() data: { name?: string; icon?: string; priority?: number },
  ) {
    return this.categoryService.update(id, data);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number) {
    return this.categoryService.remove(id);
  }
}
