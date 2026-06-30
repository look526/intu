import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class NoteService {
  constructor(private readonly prisma: PrismaService) {}

  // ==================== 笔记 CRUD ====================

  /** 发布笔记 */
  async create(
    userId: string,
    data: {
      content: string;
      images?: string[];
      courseId?: string;
      classGroupId?: string;
    },
  ) {
    const student = await this.getStudent(userId);

    return this.prisma.note.create({
      data: {
        student: { connect: { id: student.id } },
        content: data.content,
        images: data.images || [],
        ...(data.courseId ? { course: { connect: { id: data.courseId } } } : {}),
        ...(data.classGroupId
          ? { classGroup: { connect: { id: data.classGroupId } } }
          : {}),
      },
      include: this.noteInclude(student.id),
    });
  }

  /** 笔记流（分页） */
  async findAll(
    userId: string,
    query: {
      scope?: string; // classmates | all
      classGroupId?: string;
      courseId?: string;
      page?: number;
      pageSize?: number;
    },
  ) {
    const student = await this.prisma.student.findUnique({
      where: { userId },
    });
    const studentId = student?.id;

    const page = Number(query.page) || 1;
    const pageSize = Number(query.pageSize) || 20;
    const where: any = {};

    if (query.scope === 'classmates' && studentId) {
      // 查询同班同学的 studentIds
      const classmateIds = await this.getClassmateStudentIds(studentId);
      where.studentId = { in: classmateIds };
      if (query.classGroupId) {
        where.classGroupId = query.classGroupId;
      }
    }
    // scope=all 则不限制 studentId

    if (query.courseId) where.courseId = query.courseId;

    const [items, total] = await Promise.all([
      this.prisma.note.findMany({
        where,
        include: this.noteInclude(studentId),
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.note.count({ where }),
    ]);

    const enrichedItems = items.map((note) => ({
      ...note,
      isLiked: studentId
        ? (note as any).noteLikes?.some(
            (l: any) => l.studentId === studentId,
          ) ?? false
        : false,
      isFavorited: studentId
        ? (note as any).noteFavorites?.some(
            (f: any) => f.studentId === studentId,
          ) ?? false
        : false,
    }));

    return { items: enrichedItems, total, page, pageSize };
  }

  /** 我的笔记列表（学员端） */
  async findMy(
    userId: string,
    query: { page?: number; pageSize?: number },
  ) {
    const student = await this.prisma.student.findUnique({
      where: { userId },
    });
    if (!student) return { items: [], total: 0, page: 1, pageSize: 20 };

    const page = Number(query.page) || 1;
    const pageSize = Number(query.pageSize) || 20;
    const where = { studentId: student.id };

    const [items, total] = await Promise.all([
      this.prisma.note.findMany({
        where,
        include: {
          course: { select: { id: true, name: true } },
          classGroup: { select: { id: true, name: true } },
          _count: { select: { noteLikes: true, noteComments: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.note.count({ where }),
    ]);

    return { items, total, page, pageSize };
  }

  /** 笔记详情（含评论） */
  async findOne(userId: string, noteId: string) {
    const student = await this.prisma.student.findUnique({
      where: { userId },
    });
    const studentId = student?.id;

    const note = await this.prisma.note.findUnique({
      where: { id: noteId },
      include: {
        student: {
          select: {
            id: true,
            user: { select: { nickname: true, avatar: true } },
          },
        },
        course: { select: { id: true, name: true } },
        classGroup: { select: { id: true, name: true } },
        noteLikes: studentId
          ? { where: { studentId }, select: { studentId: true } }
          : false,
        noteFavorites: studentId
          ? { where: { studentId }, select: { studentId: true } }
          : false,
        noteComments: {
          include: {
            student: {
              select: {
                id: true,
                user: { select: { nickname: true, avatar: true } },
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!note) throw new NotFoundException('笔记不存在');

    return {
      ...note,
      isLiked: studentId
        ? (note.noteLikes as any[])?.length > 0
        : false,
      isFavorited: studentId
        ? (note as any).noteFavorites?.length > 0
        : false,
    };
  }

  /** 删除笔记 */
  async remove(userId: string, noteId: string) {
    const student = await this.getStudent(userId);
    const note = await this.prisma.note.findUnique({
      where: { id: noteId },
    });
    if (!note) throw new NotFoundException('笔记不存在');
    if (note.studentId !== student.id) {
      throw new ForbiddenException('只能删除自己的笔记');
    }

    // 先删除关联数据
    await this.prisma.noteLike.deleteMany({ where: { noteId } });
    await this.prisma.noteComment.deleteMany({ where: { noteId } });
    await this.prisma.note.delete({ where: { id: noteId } });

    return { success: true };
  }

  // ==================== 点赞 ====================

  /** 点赞 */
  async like(userId: string, noteId: string) {
    const student = await this.getStudent(userId);
    await this.ensureNoteExists(noteId);

    await this.prisma.noteLike.create({
      data: { noteId, studentId: student.id },
    }).catch(() => {
      // 已点赞则忽略
    });

    // 更新计数
    const count = await this.prisma.noteLike.count({ where: { noteId } });
    await this.prisma.note.update({
      where: { id: noteId },
      data: { likes: count },
    });

    return { liked: true, likes: count };
  }

  /** 取消点赞 */
  async unlike(userId: string, noteId: string) {
    const student = await this.getStudent(userId);

    await this.prisma.noteLike.delete({
      where: { noteId_studentId: { noteId, studentId: student.id } },
    }).catch(() => {
      // 未点赞则忽略
    });

    const count = await this.prisma.noteLike.count({ where: { noteId } });
    await this.prisma.note.update({
      where: { id: noteId },
      data: { likes: count },
    });

    return { liked: false, likes: count };
  }

  // ==================== 评论 ====================

  /** 发表评论 */
  async addComment(
    userId: string,
    noteId: string,
    content: string,
  ) {
    const student = await this.getStudent(userId);
    await this.ensureNoteExists(noteId);

    const comment = await this.prisma.noteComment.create({
      data: {
        note: { connect: { id: noteId } },
        student: { connect: { id: student.id } },
        content,
      },
      include: {
        student: {
          select: {
            id: true,
            user: { select: { nickname: true, avatar: true } },
          },
        },
      },
    });

    // 更新评论计数
    const count = await this.prisma.noteComment.count({ where: { noteId } });
    await this.prisma.note.update({
      where: { id: noteId },
      data: { comments: count },
    });

    return comment;
  }

  // ==================== 收藏 ====================

  /** 收藏 */
  async favorite(userId: string, noteId: string) {
    const student = await this.getStudent(userId);
    await this.ensureNoteExists(noteId);

    await this.prisma.noteFavorite.create({
      data: { noteId, studentId: student.id },
    }).catch(() => {
      // 已收藏则忽略
    });

    return { favorited: true };
  }

  /** 取消收藏 */
  async unfavorite(userId: string, noteId: string) {
    const student = await this.getStudent(userId);

    await this.prisma.noteFavorite.delete({
      where: { noteId_studentId: { noteId, studentId: student.id } },
    }).catch(() => {
      // 未收藏则忽略
    });

    return { favorited: false };
  }

  // ==================== 推荐 ====================

  /** 我的收藏列表 */
  async findMyFavorites(
    userId: string,
    query: { page?: number; pageSize?: number },
  ) {
    const student = await this.prisma.student.findUnique({
      where: { userId },
    });
    if (!student) return { items: [], total: 0, page: 1, pageSize: 20 };

    const page = Number(query.page) || 1;
    const pageSize = Number(query.pageSize) || 20;

    // 查收藏的 noteId 列表
    const [favorites, total] = await Promise.all([
      this.prisma.noteFavorite.findMany({
        where: { studentId: student.id },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: { noteId: true },
      }),
      this.prisma.noteFavorite.count({ where: { studentId: student.id } }),
    ]);

    const noteIds = favorites.map((f) => f.noteId);
    if (noteIds.length === 0) return { items: [], total, page, pageSize };

    const notes = await this.prisma.note.findMany({
      where: { id: { in: noteIds } },
      include: this.noteInclude(student.id),
    });

    // 保持收藏时间顺序
    const noteMap = new Map(notes.map((n) => [n.id, n]));
    const items = noteIds
      .map((id) => noteMap.get(id))
      .filter(Boolean)
      .map((note: any) => ({
        ...note,
        isLiked: (note.noteLikes?.length ?? 0) > 0,
        isFavorited: true,
      }));

    return { items, total, page, pageSize };
  }

  /** 推荐笔记流 */
  async recommend(
    userId: string,
    query: { currentNoteId?: string; pageSize?: number },
  ) {
    const student = await this.prisma.student.findUnique({
      where: { userId },
    });
    const studentId = student?.id;
    const pageSize = Number(query.pageSize) || 10;

    // 获取当前笔记上下文
    let currentNote: any = null;
    if (query.currentNoteId) {
      currentNote = await this.prisma.note.findUnique({
        where: { id: query.currentNoteId },
        select: { id: true, courseId: true, classGroupId: true },
      });
    }

    const excludeId = query.currentNoteId || '';

    // 策略：分三批查询，去重合并
    const allIds = new Set<string>();
    const results: any[] = [];

    // 1. 同课程笔记（按热度+时间）
    if (currentNote?.courseId) {
      const sameCourse = await this.prisma.note.findMany({
        where: {
          courseId: currentNote.courseId,
          id: { not: excludeId },
        },
        include: this.noteInclude(studentId),
        orderBy: [{ likes: 'desc' }, { createdAt: 'desc' }],
        take: pageSize,
      });
      for (const n of sameCourse) {
        if (!allIds.has(n.id)) { allIds.add(n.id); results.push(n); }
      }
    }

    // 2. 同班级笔记
    if (currentNote?.classGroupId && results.length < pageSize) {
      const sameClass = await this.prisma.note.findMany({
        where: {
          classGroupId: currentNote.classGroupId,
          id: { not: excludeId },
        },
        include: this.noteInclude(studentId),
        orderBy: [{ likes: 'desc' }, { createdAt: 'desc' }],
        take: pageSize,
      });
      for (const n of sameClass) {
        if (!allIds.has(n.id)) { allIds.add(n.id); results.push(n); }
      }
    }

    // 3. 全局热门补充
    if (results.length < pageSize) {
      const hot = await this.prisma.note.findMany({
        where: {
          id: { notIn: [excludeId, ...Array.from(allIds)] },
        },
        include: this.noteInclude(studentId),
        orderBy: [{ likes: 'desc' }, { createdAt: 'desc' }],
        take: pageSize - results.length,
      });
      for (const n of hot) {
        if (!allIds.has(n.id)) { allIds.add(n.id); results.push(n); }
      }
    }

    const items = results.slice(0, pageSize).map((note) => ({
      ...note,
      isLiked: studentId
        ? (note as any).noteLikes?.some((l: any) => l.studentId === studentId) ?? false
        : false,
      isFavorited: studentId
        ? (note as any).noteFavorites?.some((f: any) => f.studentId === studentId) ?? false
        : false,
    }));

    return { items, total: items.length };
  }

  // ==================== 管理员接口 ====================

  /** 管理员笔记列表 */
  async adminFindAll(query: {
    page?: number;
    pageSize?: number;
    courseId?: string;
    classGroupId?: string;
    keyword?: string;
  }) {
    const page = Number(query.page) || 1;
    const pageSize = Number(query.pageSize) || 20;
    const where: any = {};

    if (query.courseId) where.courseId = query.courseId;
    if (query.classGroupId) where.classGroupId = query.classGroupId;
    if (query.keyword) where.content = { contains: query.keyword };

    const [items, total] = await Promise.all([
      this.prisma.note.findMany({
        where,
        include: {
          student: {
            select: {
              id: true,
              user: { select: { nickname: true, avatar: true } },
            },
          },
          course: { select: { id: true, name: true } },
          classGroup: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.note.count({ where }),
    ]);

    return { items, total, page, pageSize };
  }

  /** 管理员删除笔记（无需校验归属） */
  async adminRemove(noteId: string) {
    const note = await this.prisma.note.findUnique({ where: { id: noteId } });
    if (!note) throw new NotFoundException('笔记不存在');

    await this.prisma.noteFavorite.deleteMany({ where: { noteId } });
    await this.prisma.noteLike.deleteMany({ where: { noteId } });
    await this.prisma.noteComment.deleteMany({ where: { noteId } });
    await this.prisma.note.delete({ where: { id: noteId } });

    return { success: true };
  }

  // ==================== 工具方法 ====================

  private async getStudent(userId: string) {
    const student = await this.prisma.student.findUnique({
      where: { userId },
    });
    if (!student) throw new ForbiddenException('非学员');
    return student;
  }

  private async ensureNoteExists(noteId: string) {
    const note = await this.prisma.note.findUnique({
      where: { id: noteId },
    });
    if (!note) throw new NotFoundException('笔记不存在');
    return note;
  }

  /** 获取用户所有班级的同班同学 studentIds */
  private async getClassmateStudentIds(studentId: string): Promise<string[]> {
    // 1. 我在哪些班级
    const myGroups = await this.prisma.classGroupStudent.findMany({
      where: { studentId },
      select: { classGroupId: true },
    });
    const classGroupIds = myGroups.map((g) => g.classGroupId);
    if (classGroupIds.length === 0) return [studentId]; // 仅自己

    // 2. 这些班级里所有同学
    const classmates = await this.prisma.classGroupStudent.findMany({
      where: { classGroupId: { in: classGroupIds } },
      select: { studentId: true },
    });

    return [...new Set(classmates.map((c) => c.studentId))];
  }

  private noteInclude(studentId?: string | null) {
    return {
      student: {
        select: {
          id: true,
          user: { select: { nickname: true, avatar: true } },
        },
      },
      course: { select: { id: true, name: true } },
      classGroup: { select: { id: true, name: true } },
      noteLikes: studentId
        ? { where: { studentId }, select: { studentId: true } }
        : false,
      noteFavorites: studentId
        ? { where: { studentId }, select: { studentId: true } }
        : false,
    } as any;
  }
}
