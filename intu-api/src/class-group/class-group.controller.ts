import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  Req,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { ClassGroupService } from './class-group.service';
import { JwtAuthGuard, Public } from '../auth/jwt-auth.guard';

@Controller('class-groups')
@UseGuards(JwtAuthGuard)
export class ClassGroupController {
  constructor(private readonly classGroupService: ClassGroupService) {}

  /** 班级列表 */
  @Get()
  findAll(
    @Query()
    query: {
      page?: number;
      pageSize?: number;
      courseId?: string;
      status?: string;
      keyword?: string;
    },
    @Req() req: any,
  ) {
    this.ensureAdmin(req);
    return this.classGroupService.findAll(query);
  }

  /** 待分班学员 — 必须放在 :id 路由之前 */
  @Get('unassigned-students')
  findUnassignedStudents(
    @Query('courseId') courseId: string,
    @Req() req: any,
  ) {
    this.ensureAdmin(req);
    return this.classGroupService.findUnassignedStudents(courseId);
  }

  // ===== 学员端接口（不需要 admin） =====

  /** 优秀班级排名（公开接口） */
  @Get('ranking')
  @Public()
  getRanking(
    @Query() query: { categoryId?: string; courseId?: string },
  ) {
    return this.classGroupService.getRanking(query);
  }

  /** 我的班级列表 */
  @Get('my')
  findMyClassGroups(@Req() req: any) {
    return this.classGroupService.findMyClassGroups(req.user.userId);
  }

  /** 学员端班级详情 */
  @Get(':id/detail')
  findStudentDetail(@Param('id') id: string, @Req() req: any) {
    return this.classGroupService.findStudentClassGroupDetail(id, req.user.userId);
  }

  /** 班级同学列表 */
  @Get(':id/classmates')
  findClassmates(@Param('id') id: string, @Req() req: any) {
    return this.classGroupService.findClassmates(id, req.user.userId);
  }

  /** 班级完整课表（学员端） */
  @Get(':id/schedules')
  findClassGroupSchedules(@Param('id') id: string, @Req() req: any) {
    return this.classGroupService.findClassGroupSchedules(id, req.user.userId);
  }

  /** 班级详情（管理员） */
  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: any) {
    this.ensureAdmin(req);
    return this.classGroupService.findOne(id);
  }

  /** 创建班级 */
  @Post()
  create(
    @Body()
    data: {
      name: string;
      courseId: string;
      maxStudents?: number;
      startDate?: string;
      endDate?: string;
      studentIds?: string[];
      status?: string;
    },
    @Req() req: any,
  ) {
    this.ensureAdmin(req);
    return this.classGroupService.create(data as any);
  }

  /** 班级状态变更 */
  @Put(':id/status')
  changeStatus(
    @Param('id') id: string,
    @Body('status') status: string,
    @Req() req: any,
  ) {
    this.ensureAdmin(req);
    return this.classGroupService.changeStatus(id, status as any);
  }

  /** 修改班级 */
  @Put(':id')
  update(
    @Param('id') id: string,
    @Body()
    data: {
      name?: string;
      maxStudents?: number;
      startDate?: string;
      endDate?: string;
      status?: string;
    },
    @Req() req: any,
  ) {
    this.ensureAdmin(req);
    return this.classGroupService.update(id, data as any);
  }

  /** 添加学员到班级 */
  @Post(':id/students')
  addStudents(
    @Param('id') id: string,
    @Body() body: { studentIds: string[] },
    @Req() req: any,
  ) {
    this.ensureAdmin(req);
    return this.classGroupService.addStudents(id, body.studentIds);
  }

  /** 移除学员 */
  @Delete(':id/students/:studentId')
  removeStudent(
    @Param('id') id: string,
    @Param('studentId') studentId: string,
    @Req() req: any,
  ) {
    this.ensureAdmin(req);
    return this.classGroupService.removeStudent(id, studentId);
  }

  private ensureAdmin(req: any) {
    if (req.user.role !== 'admin') {
      throw new ForbiddenException('仅管理员可访问');
    }
  }
}
