import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { NoteService } from './note.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('notes')
@UseGuards(JwtAuthGuard)
export class NoteController {
  constructor(private readonly noteService: NoteService) {}

  /** 发布笔记 */
  @Post()
  create(
    @Body()
    body: {
      content: string;
      images?: string[];
      courseId?: string;
      classGroupId?: string;
    },
    @Req() req: any,
  ) {
    return this.noteService.create(req.user.userId, body);
  }

  /** 笔记流 */
  @Get()
  findAll(
    @Query()
    query: {
      scope?: string;
      classGroupId?: string;
      courseId?: string;
      page?: number;
      pageSize?: number;
    },
    @Req() req: any,
  ) {
    return this.noteService.findAll(req.user.userId, query);
  }

  /** 我的笔记列表（必须放在 :id 之前） */
  @Get('my')
  findMy(
    @Query('page') page: number,
    @Query('pageSize') pageSize: number,
    @Req() req: any,
  ) {
    return this.noteService.findMy(req.user.userId, {
      page: Number(page) || 1,
      pageSize: Number(pageSize) || 20,
    });
  }

  /** 推荐笔记流（必须放在 :id 之前） */
  @Get('recommend')
  recommend(
    @Query() query: { currentNoteId?: string; pageSize?: number },
    @Req() req: any,
  ) {
    return this.noteService.recommend(req.user.userId, query);
  }

  /** 我的收藏列表（必须放在 :id 之前） */
  @Get('my-favorites')
  findMyFavorites(
    @Query('page') page: number,
    @Query('pageSize') pageSize: number,
    @Req() req: any,
  ) {
    return this.noteService.findMyFavorites(req.user.userId, {
      page: Number(page) || 1,
      pageSize: Number(pageSize) || 20,
    });
  }

  /** 笔记详情 */
  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: any) {
    return this.noteService.findOne(req.user.userId, id);
  }

  /** 删除笔记 */
  @Delete(':id')
  remove(@Param('id') id: string, @Req() req: any) {
    return this.noteService.remove(req.user.userId, id);
  }

  /** 点赞 */
  @Post(':id/like')
  like(@Param('id') id: string, @Req() req: any) {
    return this.noteService.like(req.user.userId, id);
  }

  /** 取消点赞 */
  @Delete(':id/like')
  unlike(@Param('id') id: string, @Req() req: any) {
    return this.noteService.unlike(req.user.userId, id);
  }

  /** 收藏 */
  @Post(':id/favorite')
  favorite(@Param('id') id: string, @Req() req: any) {
    return this.noteService.favorite(req.user.userId, id);
  }

  /** 取消收藏 */
  @Delete(':id/favorite')
  unfavorite(@Param('id') id: string, @Req() req: any) {
    return this.noteService.unfavorite(req.user.userId, id);
  }

  /** 发表评论 */
  @Post(':id/comments')
  addComment(
    @Param('id') id: string,
    @Body('content') content: string,
    @Req() req: any,
  ) {
    return this.noteService.addComment(req.user.userId, id, content);
  }

  // ==================== 管理员接口 ====================

  /** 管理员笔记列表 */
  @Get('admin/list')
  adminList(
    @Query()
    query: {
      page?: number;
      pageSize?: number;
      courseId?: string;
      classGroupId?: string;
      keyword?: string;
    },
  ) {
    return this.noteService.adminFindAll(query);
  }

  /** 管理员删除笔记 */
  @Delete('admin/:id')
  adminRemove(@Param('id') id: string) {
    return this.noteService.adminRemove(id);
  }
}
