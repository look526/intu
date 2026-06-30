import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { StudentService } from './student.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('students')
@UseGuards(JwtAuthGuard)
export class StudentController {
  constructor(private readonly studentService: StudentService) {}

  @Get()
  findAll(
    @Query() query: { page?: number; pageSize?: number; keyword?: string },
  ) {
    return this.studentService.findAll(query);
  }

  /** 用户搜索（手机号/昵称，供场地主选择等场景） */
  @Get('search')
  searchUsers(@Query('keyword') keyword: string) {
    return this.studentService.searchUsers(keyword);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.studentService.findOne(id);
  }
}
