import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const TARGET_USER_ID = 'fa10febc-31b5-494c-835d-3327adee8e2e';

async function main() {
  // ==================== 0. 验证用户存在 ====================
  const user = await prisma.user.findUnique({ where: { id: TARGET_USER_ID } });
  if (!user) {
    throw new Error(`用户 ${TARGET_USER_ID} 不存在，请先通过微信登录注册`);
  }
  console.log(`✅ 目标用户: ${user.nickname || user.phone}`);

  // ==================== 1. 确保 Student 记录 ====================
  const student = await prisma.student.upsert({
    where: { userId: TARGET_USER_ID },
    update: {},
    create: { id: TARGET_USER_ID, userId: TARGET_USER_ID },
  });
  console.log(`✅ Student 记录就绪: ${student.id}`);

  // ==================== 2. 获取已有课程 ====================
  const courses = await prisma.course.findMany({
    where: { status: 'published' },
    orderBy: { createdAt: 'asc' },
  });
  if (courses.length < 3) {
    throw new Error('已发布课程不足3门，请先运行 npx prisma db seed');
  }
  const course1 = courses[0]; // 零基础吉他入门班
  const course2 = courses[1]; // 成人水彩画周末营
  const course3 = courses[3] || courses[2]; // 街舞 Hip-Hop 基础
  console.log(`✅ 课程: ${course1.name}, ${course2.name}, ${course3.name}`);

  // ==================== 3. 获取已有同学 ====================
  const classmateStudents = await prisma.student.findMany({
    where: { userId: { not: TARGET_USER_ID } },
    take: 2,
    include: { user: true },
  });

  // ==================== 4. 获取教室 ====================
  const classrooms = await prisma.classroom.findMany({
    where: { status: 'active' },
    take: 2,
  });
  if (classrooms.length === 0) {
    throw new Error('无可用教室，请先运行 npx prisma db seed');
  }

  // ==================== 5. 获取管理员（作为排课创建者） ====================
  const admin = await prisma.user.findFirst({ where: { role: 'admin' } });
  if (!admin) throw new Error('无管理员用户');

  // 获取教师
  const teacher = await prisma.teacher.findFirst({ where: { status: 'active' } });
  if (!teacher) throw new Error('无可用教师');

  // ==================== 6. 创建订单（3 条） ====================
  const orderConfigs = [
    { courseId: course1.id, amount: course1.price, status: 'paid' as const, paidAt: new Date(Date.now() - 7 * 86400000) },
    { courseId: course2.id, amount: course2.price, status: 'paid' as const, paidAt: new Date(Date.now() - 3 * 86400000) },
    { courseId: course3.id, amount: course3.price, status: 'pending' as const, paidAt: null },
  ];
  let newOrders = 0;
  for (const oc of orderConfigs) {
    const exists = await prisma.order.findFirst({
      where: { studentId: student.id, courseId: oc.courseId },
    });
    if (!exists) {
      await prisma.order.create({
        data: {
          studentId: student.id,
          courseId: oc.courseId,
          amount: oc.amount,
          status: oc.status,
          paidAt: oc.paidAt,
        },
      });
      newOrders++;
    }
  }
  const totalOrders = await prisma.order.count({ where: { studentId: student.id } });
  console.log(`✅ 订单就绪（新增 ${newOrders} 条，共 ${totalOrders} 条）`);

  // ==================== 7. 创建班级（2 个） ====================
  const classGroup1Name = '吉他入门 2026春季班';
  const classGroup2Name = '水彩画 周末营第3期';

  let classGroup1 = await prisma.classGroup.findFirst({ where: { name: classGroup1Name } });
  if (!classGroup1) {
    classGroup1 = await prisma.classGroup.create({
      data: {
        courseId: course1.id,
        name: classGroup1Name,
        status: 'active',
        maxStudents: 25,
        startDate: new Date(Date.now() - 14 * 86400000),
        endDate: new Date(Date.now() + 60 * 86400000),
      },
    });
  }

  let classGroup2 = await prisma.classGroup.findFirst({ where: { name: classGroup2Name } });
  if (!classGroup2) {
    classGroup2 = await prisma.classGroup.create({
      data: {
        courseId: course2.id,
        name: classGroup2Name,
        status: 'active',
        maxStudents: 20,
        startDate: new Date(Date.now() - 7 * 86400000),
        endDate: new Date(Date.now() + 30 * 86400000),
      },
    });
  }
  console.log(`✅ 班级就绪: ${classGroup1.name}, ${classGroup2.name}`);

  // ==================== 8. 加入班级（目标用户 + 同学） ====================
  const enrollPairs = [
    { classGroupId: classGroup1.id, studentId: student.id },
    { classGroupId: classGroup2.id, studentId: student.id },
  ];
  // 同学也加入班级
  for (const cs of classmateStudents) {
    enrollPairs.push({ classGroupId: classGroup1.id, studentId: cs.id });
    enrollPairs.push({ classGroupId: classGroup2.id, studentId: cs.id });
  }
  for (const pair of enrollPairs) {
    const exists = await prisma.classGroupStudent.findUnique({
      where: { classGroupId_studentId: pair },
    });
    if (!exists) {
      await prisma.classGroupStudent.create({ data: pair });
    }
  }
  console.log(`✅ 班级成员就绪（${enrollPairs.length} 条关联）`);

  // ==================== 9. 创建排课（6 条） ====================
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);

  // 过去的排课（已完成）
  const pastDates = [
    new Date(Date.now() - 5 * 86400000).toISOString().slice(0, 10),
    new Date(Date.now() - 3 * 86400000).toISOString().slice(0, 10),
    new Date(Date.now() - 1 * 86400000).toISOString().slice(0, 10),
  ];
  // 未来的排课
  const futureDates = [
    new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10),
    new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10),
    new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
  ];

  const scheduleConfigs = [
    // 已完成 x3
    { courseId: course1.id, classroomId: classrooms[0].id, date: pastDates[0], start: '09:00', end: '11:00', status: 'completed' as const, classGroupId: classGroup1.id },
    { courseId: course1.id, classroomId: classrooms[0].id, date: pastDates[1], start: '14:00', end: '16:00', status: 'completed' as const, classGroupId: classGroup1.id },
    { courseId: course2.id, classroomId: classrooms[1]?.id || classrooms[0].id, date: pastDates[2], start: '09:00', end: '11:30', status: 'completed' as const, classGroupId: classGroup2.id },
    // 未来 x3
    { courseId: course1.id, classroomId: classrooms[0].id, date: futureDates[0], start: '09:00', end: '11:00', status: 'scheduled' as const, classGroupId: classGroup1.id },
    { courseId: course2.id, classroomId: classrooms[1]?.id || classrooms[0].id, date: futureDates[1], start: '14:00', end: '16:00', status: 'scheduled' as const, classGroupId: classGroup2.id },
    { courseId: course1.id, classroomId: classrooms[0].id, date: futureDates[2], start: '09:00', end: '11:00', status: 'scheduled' as const, classGroupId: classGroup1.id },
  ];

  const createdSchedules: any[] = [];
  for (const sc of scheduleConfigs) {
    const startTime = new Date(`${sc.date}T${sc.start}:00`);
    const endTime = new Date(`${sc.date}T${sc.end}:00`);
    let schedule = await prisma.schedule.findFirst({
      where: { courseId: sc.courseId, classroomId: sc.classroomId, startTime },
    });
    if (!schedule) {
      schedule = await prisma.schedule.create({
        data: {
          courseId: sc.courseId,
          classroomId: sc.classroomId,
          teacherId: teacher.id,
          startTime,
          endTime,
          status: sc.status,
          createdBy: admin.id,
          classGroupId: sc.classGroupId,
        },
      });
    }
    createdSchedules.push({ ...schedule, originalStatus: sc.status });
  }
  const completedSchedules = createdSchedules.filter((s) => s.originalStatus === 'completed');
  console.log(`✅ 排课就绪（${createdSchedules.length} 条：completed x${completedSchedules.length}, scheduled x${createdSchedules.length - completedSchedules.length}）`);

  // ==================== 10. 创建打卡记录（3 条） ====================
  const checkinConfigs = [
    { scheduleId: completedSchedules[0]?.id, locationValid: true, creditEarned: 1 },
    { scheduleId: completedSchedules[1]?.id, locationValid: true, creditEarned: 1 },
    { scheduleId: completedSchedules[2]?.id, locationValid: false, creditEarned: 0 },
  ];

  let newCheckins = 0;
  for (const cc of checkinConfigs) {
    if (!cc.scheduleId) continue;
    const exists = await prisma.checkinRecord.findFirst({
      where: { studentId: student.id, scheduleId: cc.scheduleId },
    });
    if (!exists) {
      await prisma.checkinRecord.create({
        data: {
          studentId: student.id,
          scheduleId: cc.scheduleId,
          locationValid: cc.locationValid,
          creditEarned: cc.creditEarned,
        },
      });
      newCheckins++;
    }
  }
  // 更新学分
  await prisma.student.update({
    where: { id: student.id },
    data: { credits: 2 },
  });
  console.log(`✅ 打卡记录就绪（新增 ${newCheckins} 条），学分已更新为 2`);

  // ==================== 11. 创建课后评价（2 条） ====================
  const reviewConfigs = [
    { scheduleId: completedSchedules[0]?.id, rating: 5, content: '老师讲解非常细致，吉他指法练习很有收获，期待下节课！' },
    { scheduleId: completedSchedules[1]?.id, rating: 4, content: '课堂氛围很好，就是时间稍微短了一点，希望能延长半小时。' },
  ];

  for (const rc of reviewConfigs) {
    if (!rc.scheduleId) continue;
    const exists = await prisma.courseReview.findFirst({
      where: { studentId: student.id, scheduleId: rc.scheduleId },
    });
    if (!exists) {
      await prisma.courseReview.create({
        data: {
          studentId: student.id,
          scheduleId: rc.scheduleId,
          rating: rc.rating,
          content: rc.content,
        },
      });
    }
  }
  console.log('✅ 课后评价就绪（2 条）');

  // ==================== 12. 创建学习笔记（3 条） ====================
  const noteConfigs = [
    {
      contentType: 'text' as const,
      content: '今天学了C大调和弦，Am、C、G、F四个基本和弦的按法。手指有点酸但很有成就感！老师说坚持练习一周就能流畅切换了。加油💪',
      images: [],
      courseId: course1.id,
      classGroupId: classGroup1.id,
      likes: 2,
      comments: 1,
    },
    {
      contentType: 'image' as const,
      content: '水彩画第一次尝试，画了一幅日落风景。颜色调配比想象中难很多，但出来的效果还不错！分享一下我的作品~',
      images: [
        'https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?w=400',
        'https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=400',
      ],
      courseId: course2.id,
      classGroupId: classGroup2.id,
      likes: 3,
      comments: 1,
    },
    {
      contentType: 'text' as const,
      content: '学了快两周了，感觉兴趣班真的能让人放松下来。不管是弹吉他还是画水彩，都是一种很好的解压方式。推荐大家也来试试！',
      images: [],
      courseId: null,
      classGroupId: null,
      likes: 1,
      comments: 0,
    },
  ];

  const createdNotes: any[] = [];
  for (const nc of noteConfigs) {
    const existingNote = await prisma.note.findFirst({
      where: { studentId: student.id, content: { startsWith: nc.content.slice(0, 20) } },
    });
    if (!existingNote) {
      const note = await prisma.note.create({
        data: {
          studentId: student.id,
          contentType: nc.contentType,
          content: nc.content,
          images: nc.images,
          courseId: nc.courseId,
          classGroupId: nc.classGroupId,
          likes: nc.likes,
          comments: nc.comments,
        },
      });
      createdNotes.push(note);
    } else {
      createdNotes.push(existingNote);
    }
  }
  console.log(`✅ 学习笔记就绪（${createdNotes.length} 条）`);

  // ==================== 13. 创建笔记互动数据 ====================
  if (classmateStudents.length >= 2 && createdNotes.length >= 2) {
    const s1 = classmateStudents[0];
    const s2 = classmateStudents[1];
    const note1 = createdNotes[0];
    const note2 = createdNotes[1];

    // 点赞
    const likePairs = [
      { noteId: note1.id, studentId: s1.id },
      { noteId: note1.id, studentId: s2.id },
      { noteId: note2.id, studentId: s1.id },
      { noteId: note2.id, studentId: s2.id },
      { noteId: note2.id, studentId: student.id }, // 自己也点赞了笔记2
    ];
    for (const lp of likePairs) {
      const exists = await prisma.noteLike.findUnique({
        where: { noteId_studentId: lp },
      });
      if (!exists) {
        await prisma.noteLike.create({ data: lp });
      }
    }

    // 评论
    const commentConfigs = [
      { noteId: note1.id, studentId: s1.id, content: '写得真好！我也在练C大调，一起加油！' },
      { noteId: note2.id, studentId: s2.id, content: '好漂亮的水彩画，学习了～' },
    ];
    for (const cc of commentConfigs) {
      const exists = await prisma.noteComment.findFirst({
        where: { noteId: cc.noteId, studentId: cc.studentId },
      });
      if (!exists) {
        await prisma.noteComment.create({ data: cc });
      }
    }
    console.log('✅ 笔记互动数据就绪（点赞 5 条，评论 2 条）');
  } else {
    console.log('⚠️ 同学不足，跳过笔记互动数据');
  }

  // ==================== 汇总 ====================
  console.log('\n🎉 全链路测试数据创建完成！');
  console.log(`   用户: ${user.nickname || user.phone} (${TARGET_USER_ID})`);
  console.log(`   订单: 3 条（paid x2, pending x1）`);
  console.log(`   班级: 2 个（含同学 ${classmateStudents.length} 人）`);
  console.log(`   排课: 6 条（completed x3, scheduled x3）`);
  console.log(`   打卡: 3 条（学分 2）`);
  console.log(`   评价: 2 条`);
  console.log(`   笔记: 3 条（含互动数据）`);
}

main()
  .catch((e) => {
    console.error('❌ 执行失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
