import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { VenueService } from './venue.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('venues')
export class VenueController {
  constructor(private readonly venueService: VenueService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  findAll(
    @Query() query: { page?: number; pageSize?: number; status?: string; keyword?: string },
  ) {
    return this.venueService.findAll(query);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  findOne(@Param('id') id: string) {
    return this.venueService.findOne(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@Body() data: any) {
    return this.venueService.create(data);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  update(@Param('id') id: string, @Body() data: any) {
    return this.venueService.update(id, data);
  }

  @Put(':id/audit')
  @UseGuards(JwtAuthGuard)
  audit(
    @Param('id') id: string,
    @Body() body: { status: 'approved' | 'rejected'; auditRemark?: string },
  ) {
    return this.venueService.audit(id, body.status, body.auditRemark);
  }

  @Put(':id/status')
  @UseGuards(JwtAuthGuard)
  updateStatus(
    @Param('id') id: string,
    @Body() body: { status: 'approved' | 'offline' },
  ) {
    return this.venueService.updateStatus(id, body.status);
  }

  @Put(':id/site-visit')
  @UseGuards(JwtAuthGuard)
  markSiteVisit(
    @Param('id') id: string,
    @Body() body: { note?: string },
  ) {
    return this.venueService.markSiteVisit(id, body.note);
  }

  // ==================== 教室接口 ====================

  @Get(':venueId/classrooms')
  @UseGuards(JwtAuthGuard)
  findClassrooms(@Param('venueId') venueId: string) {
    return this.venueService.findClassrooms(venueId);
  }

  @Post(':venueId/classrooms')
  @UseGuards(JwtAuthGuard)
  createClassroom(@Param('venueId') venueId: string, @Body() data: any) {
    return this.venueService.createClassroom(venueId, data);
  }
}

@Controller('classrooms')
export class ClassroomController {
  constructor(private readonly venueService: VenueService) {}

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  update(@Param('id') id: string, @Body() data: any) {
    return this.venueService.updateClassroom(id, data);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  remove(@Param('id') id: string) {
    return this.venueService.deleteClassroom(id);
  }

  @Put(':id/status')
  @UseGuards(JwtAuthGuard)
  updateStatus(
    @Param('id') id: string,
    @Body() body: { status: 'active' | 'maintenance' },
  ) {
    return this.venueService.updateClassroomStatus(id, body.status);
  }
}
