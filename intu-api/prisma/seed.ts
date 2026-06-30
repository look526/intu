import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const phone = '13800000000';
  const plainPassword = 'admin123';
  const hashedPassword = await bcrypt.hash(plainPassword, 10);

  // Upsert 默认管理员用户
  const user = await prisma.user.upsert({
    where: { phone },
    update: {
      password: hashedPassword,
      role: 'admin',
    },
    create: {
      phone,
      nickname: '超级管理员',
      password: hashedPassword,
      role: 'admin',
      status: 'active',
    },
  });

  // Upsert 管理员扩展信息
  await prisma.admin.upsert({
    where: { userId: user.id },
    update: {
      realName: '系统管理员',
    },
    create: {
      userId: user.id,
      realName: '系统管理员',
      permission: JSON.parse('["*"]'),
    },
  });

  console.log(`✅ 种子管理员创建成功：phone=${phone}, password=${plainPassword}`);

  // ==================== 系统配置种子数据 ====================

  // Banner 配置
  await prisma.systemConfig.upsert({
    where: { key: 'banners' },
    update: {},
    create: {
      key: 'banners',
      value: [
        { imageUrl: 'https://picsum.photos/750/320?random=1', linkUrl: '', title: '春季招生进行中' },
        { imageUrl: 'https://picsum.photos/750/320?random=2', linkUrl: '', title: '发现你的新兴趣' },
      ],
    },
  });

  // 金刚区配置
  const quickLinksValue = [
    { name: '养生', icon: '养', color: '#4A90D9', linkUrl: '/pages/course/list/index?categoryId=1' },
    { name: '运动', icon: '运', color: '#F5A623', linkUrl: '/pages/course/list/index?categoryId=2' },
    { name: '音乐', icon: '音', color: '#7B68EE', linkUrl: '/pages/course/list/index?categoryId=5' },
    { name: '美术', icon: '美', color: '#E8524A', linkUrl: '/pages/course/list/index?categoryId=6' },
    { name: '舞蹈', icon: '舞', color: '#2ECC71', linkUrl: '/pages/course/list/index?categoryId=3' },
  ];
  await prisma.systemConfig.upsert({
    where: { key: 'home_quick_links' },
    update: { value: quickLinksValue },
    create: {
      key: 'home_quick_links',
      value: quickLinksValue,
    },
  });

  // 运营弹窗配置（初始空数组）
  await prisma.systemConfig.upsert({
    where: { key: 'popups' },
    update: {},
    create: {
      key: 'popups',
      value: [],
    },
  });

  console.log('✅ 系统配置种子数据创建成功');

  // ==================== 课程分类种子数据 ====================

  const categories = [
    { id: 1, name: '养生', priority: 1, icon: '🧘' },
    { id: 2, name: '运动', priority: 2, icon: '⚽' },
    { id: 3, name: '舞蹈', priority: 3, icon: '💃' },
    { id: 4, name: '朗诵', priority: 4, icon: '🎤' },
    { id: 5, name: '音乐', priority: 5, icon: '🎵' },
    { id: 6, name: '美术', priority: 6, icon: '🎨' },
    { id: 7, name: '书法', priority: 7, icon: '✍️' },
    { id: 8, name: '摄影', priority: 8, icon: '📷' },
  ];

  for (const cat of categories) {
    await prisma.courseCategory.upsert({
      where: { id: cat.id },
      update: { name: cat.name, priority: cat.priority, icon: cat.icon },
      create: cat,
    });
  }

  console.log(`\u2705 \u8bfe\u7a0b\u5206\u7c7b\u79cd\u5b50\u6570\u636e\u521b\u5efa\u6210\u529f\uff08${categories.length} \u6761\uff09`);
  
  // ==================== 测试教师种子数据 ====================
  
  const teacherId = '00000000-0000-0000-0000-000000000001';
  
  await prisma.teacher.upsert({
    where: { id: teacherId },
    update: { realName: '\u5f20\u660e\u5fb7' },
    create: {
      id: teacherId,
      userId: user.id,
      realName: '\u5f20\u660e\u5fb7',
      bio: '\u8d44\u6df1\u5174\u8da3\u57f9\u8bad\u8bb2\u5e08\uff0c10\u5e74\u6559\u5b66\u7ecf\u9a8c',
      specialties: '\u97f3\u4e50,\u7f8e\u672f,\u745c\u4f3d',
      trainingStatus: 'passed',
      status: 'active',
      rating: 4.8,
    },
  });
  
  console.log('\u2705 \u6d4b\u8bd5\u6559\u5e08\u521b\u5efa\u6210\u529f');
  
  // ==================== \u6d4b\u8bd5\u8bfe\u7a0b\u79cd\u5b50\u6570\u636e ====================
  
  const testCourses = [
    {
      name: '\u96f6\u57fa\u7840\u5409\u4ed6\u5165\u95e8\u73ed',
      categoryId: 5,
      coverImage: 'https://images.unsplash.com/photo-1510915361894-db8b60106cb1?w=600&h=400&fit=crop',
      description: '\u4ece\u96f6\u5f00\u59cb\uff0c\u638c\u63e1\u5409\u4ed6\u57fa\u672c\u6307\u6cd5\u4e0e\u5f39\u5531\u6280\u5de7\u3002\u9002\u5408\u5b8c\u5168\u6ca1\u6709\u97f3\u4e50\u57fa\u7840\u7684\u521d\u5b66\u8005\u3002',
      totalHours: 10,
      teacherId,
      isRecommended: true,
      status: 'published',
      price: 299,
    },
    {
      name: '\u6210\u4eba\u6c34\u5f69\u753b\u5468\u672b\u8425',
      categoryId: 6,
      coverImage: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600&h=400&fit=crop',
      description: '\u5468\u672b\u653e\u677e\u8eab\u5fc3\uff0c\u4f53\u9a8c\u6c34\u5f69\u7684\u9b45\u529b\u3002\u8ba9\u8272\u5f69\u5728\u7eb8\u4e0a\u6d41\u6dcc\u3002',
      totalHours: 8,
      teacherId,
      isRecommended: true,
      status: 'published',
      price: 199,
    },
    {
      name: '\u6838\u5fc3\u529b\u91cf\u71c3\u8102\u745c\u4f3d',
      categoryId: 2,
      coverImage: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?w=600&h=400&fit=crop',
      description: '\u5f3a\u5316\u6838\u5fc3\uff0c\u5851\u5f62\u71c3\u8102\uff0c\u9002\u5408\u6240\u6709\u4eba\u7fa4\u3002\u6bcf\u5468\u4e09\u6b21\uff0c\u6301\u7eed\u8fdb\u6b65\u3002',
      totalHours: 12,
      teacherId,
      isRecommended: false,
      status: 'published',
      price: 399,
    },
    {
      name: '\u8857\u821e Hip-Hop \u57fa\u7840',
      categoryId: 3,
      coverImage: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=600&h=400&fit=crop',
      description: '\u611f\u53d7\u8857\u821e\u8282\u594f\uff0c\u91ca\u653e\u8eab\u4f53\u80fd\u91cf\u3002\u96f6\u57fa\u7840\u53ef\u5b66\uff0c\u8ba9\u4f60\u821e\u8d77\u6765\uff01',
      totalHours: 10,
      teacherId,
      isRecommended: true,
      status: 'published',
      price: 259,
    },
    {
      name: '\u4e2d\u8001\u5e74\u592a\u6781\u517b\u751f\u73ed',
      categoryId: 1,
      coverImage: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=600&h=400&fit=crop',
      description: '\u592a\u6781\u62f3\u517b\u751f\uff0c\u5f3a\u8eab\u5065\u4f53\u3002\u9002\u5408\u4e2d\u8001\u5e74\u4eba\u7fa4\uff0c\u52a8\u4f5c\u8f7b\u67d4\u3002',
      totalHours: 16,
      teacherId,
      isRecommended: false,
      status: 'published',
      price: 159,
    },
    {
      name: '\u7ecf\u5178\u8bd7\u8bcd\u6717\u8bf5\u73ed',
      categoryId: 4,
      coverImage: 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=600&h=400&fit=crop',
      description: '\u54c1\u8bfb\u7ecf\u5178\u8bd7\u8bcd\uff0c\u63d0\u5347\u6717\u8bf5\u6280\u5de7\u4e0e\u6587\u5316\u7d20\u517b\u3002',
      totalHours: 8,
      teacherId,
      isRecommended: false,
      status: 'published',
      price: 129,
    },
  ];
  
  for (const course of testCourses) {
    const existing = await prisma.course.findFirst({
      where: { name: course.name },
    });
    if (!existing) {
      await prisma.course.create({ data: course as any });
    } else {
      // 更新已有课程的 price
      await prisma.course.update({
        where: { id: existing.id },
        data: { price: (course as any).price },
      });
    }
  }
  
  console.log(`\u2705 \u6d4b\u8bd5\u8bfe\u7a0b\u79cd\u5b50\u6570\u636e\u521b\u5efa\u6210\u529f\uff08${testCourses.length} \u6761\uff09`);

  // ==================== \u5b66\u5458\u79cd\u5b50\u6570\u636e ====================

  const studentUser1 = await prisma.user.upsert({
    where: { phone: '13900001111' },
    update: {},
    create: {
      phone: '13900001111',
      nickname: '\u5f20\u5c0f\u660e',
      role: 'student',
      status: 'active',
    },
  });
  await prisma.student.upsert({
    where: { userId: studentUser1.id },
    update: {},
    create: { id: studentUser1.id, userId: studentUser1.id },
  });

  const studentUser2 = await prisma.user.upsert({
    where: { phone: '13900002222' },
    update: {},
    create: {
      phone: '13900002222',
      nickname: '\u674e\u5c0f\u7ea2',
      role: 'student',
      status: 'active',
    },
  });
  await prisma.student.upsert({
    where: { userId: studentUser2.id },
    update: {},
    create: { id: studentUser2.id, userId: studentUser2.id },
  });

  console.log('\u2705 \u5b66\u5458\u79cd\u5b50\u6570\u636e\u521b\u5efa\u6210\u529f');

  // ==================== \u8ba2\u5355\u79cd\u5b50\u6570\u636e ====================

  const seedCourses = await prisma.course.findMany({ where: { status: 'published' }, take: 3 });
  const student1 = await prisma.student.findUnique({ where: { userId: studentUser1.id } });
  const student2 = await prisma.student.findUnique({ where: { userId: studentUser2.id } });

  if (seedCourses.length > 0 && student1 && student2) {
    const existingOrders = await prisma.order.count();
    if (existingOrders === 0) {
      await prisma.order.create({
        data: {
          student: { connect: { id: student1.id } },
          course: { connect: { id: seedCourses[0].id } },
          amount: seedCourses[0].price,
          status: 'pending',
        },
      });
      await prisma.order.create({
        data: {
          student: { connect: { id: student1.id } },
          course: { connect: { id: seedCourses[1]?.id || seedCourses[0].id } },
          amount: seedCourses[1]?.price || seedCourses[0].price,
          status: 'paid',
          paidAt: new Date(),
        },
      });
      await prisma.order.create({
        data: {
          student: { connect: { id: student2.id } },
          course: { connect: { id: seedCourses[2]?.id || seedCourses[0].id } },
          amount: seedCourses[2]?.price || seedCourses[0].price,
          status: 'pending',
        },
      });
      console.log('\u2705 \u8ba2\u5355\u79cd\u5b50\u6570\u636e\u521b\u5efa\u6210\u529f\uff083 \u6761\uff09');
    } else {
      console.log('\u2139\ufe0f \u8ba2\u5355\u5df2\u5b58\u5728\uff0c\u8df3\u8fc7\u79cd\u5b50\u6570\u636e');
    }
  }

  // ==================== 场地和教室种子数据 ====================

  const venueId1 = '00000000-0000-0000-0000-000000000010';
  const venueId2 = '00000000-0000-0000-0000-000000000011';

  await prisma.venue.upsert({
    where: { id: venueId1 },
    update: { name: '\u9633\u5149\u793e\u533a\u6d3b\u52a8\u4e2d\u5fc3' },
    create: {
      id: venueId1,
      ownerId: user.id,
      name: '\u9633\u5149\u793e\u533a\u6d3b\u52a8\u4e2d\u5fc3',
      address: '\u5317\u4eac\u5e02\u671d\u9633\u533a\u5efa\u56fd\u8def88\u53f7',
      latitude: 39.9042,
      longitude: 116.4074,
      trafficInfo: '\u5730\u94c11\u53f7\u7ebf\u5efa\u56fd\u95e8\u7ad9B\u53e3\u51fa\uff0c\u6b65\u884c5\u5206\u949f',
      area: 500,
      photos: [],
      status: 'approved',
      isSiteVisited: true,
      siteVisitNote: '\u573a\u5730\u5bbd\u655e\uff0c\u8bbe\u65bd\u9f50\u5168',
      siteVisitDate: new Date(),
    },
  });

  await prisma.venue.upsert({
    where: { id: venueId2 },
    update: { name: '\u548c\u8c10\u6587\u5316\u9986' },
    create: {
      id: venueId2,
      ownerId: user.id,
      name: '\u548c\u8c10\u6587\u5316\u9986',
      address: '\u5317\u4eac\u5e02\u6d77\u6dc0\u533a\u4e2d\u5173\u6751\u5927\u885712\u53f7',
      latitude: 39.9842,
      longitude: 116.3074,
      trafficInfo: '\u5730\u94c14\u53f7\u7ebf\u4e2d\u5173\u6751\u7ad9A\u53e3\u51fa',
      area: 300,
      photos: [],
      status: 'pending',
    },
  });

  // \u6559\u5ba4
  const classroomData = [
    { venueId: venueId1, name: '\u821e\u8e48\u5ba4A', capacity: 30, resources: ['\u97f3\u54cd', '\u7a7a\u8c03', '\u6295\u5f71\u4eea'], timeSlots: [{ weekday: 1, startTime: '09:00', endTime: '12:00' }, { weekday: 3, startTime: '14:00', endTime: '17:00' }] },
    { venueId: venueId1, name: '\u7f8e\u672f\u5ba4B', capacity: 20, resources: ['\u684c\u6905', '\u767d\u677f', '\u7a7a\u8c03', '\u996e\u6c34\u673a'], timeSlots: [{ weekday: 2, startTime: '09:00', endTime: '12:00' }, { weekday: 4, startTime: '09:00', endTime: '12:00' }] },
    { venueId: venueId1, name: '\u591a\u529f\u80fd\u5385C', capacity: 50, resources: ['\u6295\u5f71\u4eea', '\u97f3\u54cd', '\u7a7a\u8c03', '\u684c\u6905', '\u94a2\u7434'], timeSlots: [{ weekday: 5, startTime: '09:00', endTime: '17:00' }, { weekday: 6, startTime: '09:00', endTime: '17:00' }] },
    { venueId: venueId2, name: '\u4e66\u6cd5\u6559\u5ba4', capacity: 25, resources: ['\u684c\u6905', '\u767d\u677f', '\u7a7a\u8c03'], timeSlots: [{ weekday: 1, startTime: '14:00', endTime: '17:00' }] },
    { venueId: venueId2, name: '\u97f3\u4e50\u6559\u5ba4', capacity: 15, resources: ['\u94a2\u7434', '\u97f3\u54cd', '\u7a7a\u8c03'], timeSlots: [{ weekday: 3, startTime: '09:00', endTime: '12:00' }, { weekday: 5, startTime: '14:00', endTime: '17:00' }] },
  ];

  for (const cr of classroomData) {
    const existing = await prisma.classroom.findFirst({
      where: { venueId: cr.venueId, name: cr.name },
    });
    if (!existing) {
      await prisma.classroom.create({ data: cr as any });
    }
  }

  console.log('\u2705 \u573a\u5730\u548c\u6559\u5ba4\u79cd\u5b50\u6570\u636e\u521b\u5efa\u6210\u529f');

  // ==================== 排课种子数据 ====================

  // 获取已有课程和教室
  const allCourses = await prisma.course.findMany({ where: { status: 'published' }, take: 3 });
  const allClassrooms = await prisma.classroom.findMany({ where: { venueId: venueId1, status: 'active' }, take: 3 });

  if (allCourses.length > 0 && allClassrooms.length > 0) {
    const now = new Date();
    const nextMonday = new Date(now);
    nextMonday.setDate(now.getDate() + ((1 + 7 - now.getDay()) % 7 || 7));

    const scheduleData = [
      {
        courseId: allCourses[0].id,
        classroomId: allClassrooms[0].id,
        teacherId,
        startTime: new Date(`${nextMonday.toISOString().slice(0, 10)}T09:00:00`),
        endTime: new Date(`${nextMonday.toISOString().slice(0, 10)}T11:00:00`),
        status: 'scheduled' as const,
        createdBy: user.id,
      },
      {
        courseId: allCourses[1]?.id || allCourses[0].id,
        classroomId: allClassrooms[1]?.id || allClassrooms[0].id,
        teacherId,
        startTime: new Date(`${nextMonday.toISOString().slice(0, 10)}T14:00:00`),
        endTime: new Date(`${nextMonday.toISOString().slice(0, 10)}T16:00:00`),
        status: 'scheduled' as const,
        createdBy: user.id,
      },
      {
        courseId: allCourses[2]?.id || allCourses[0].id,
        classroomId: allClassrooms[0].id,
        teacherId,
        startTime: new Date(`${new Date(nextMonday.getTime() + 2 * 86400000).toISOString().slice(0, 10)}T09:00:00`),
        endTime: new Date(`${new Date(nextMonday.getTime() + 2 * 86400000).toISOString().slice(0, 10)}T11:30:00`),
        status: 'completed' as const,
        createdBy: user.id,
      },
    ];

    for (const sd of scheduleData) {
      const existing = await prisma.schedule.findFirst({
        where: { courseId: sd.courseId, classroomId: sd.classroomId, startTime: sd.startTime },
      });
      if (!existing) {
        await prisma.schedule.create({ data: sd });
      }
    }

    console.log(`\u2705 \u6392\u8bfe\u79cd\u5b50\u6570\u636e\u521b\u5efa\u6210\u529f\uff08${scheduleData.length} \u6761\uff09`);

    // ===== 今日排课（用于学员端 my-today 测试）=====
    // 张小明的已付款订单对应 allCourses[1]（第二门课）
    const todayStr = new Date().toISOString().slice(0, 10);
    const todayScheduleData = [
      {
        courseId: allCourses[1]?.id || allCourses[0].id,
        classroomId: allClassrooms[0].id,
        teacherId,
        startTime: new Date(`${todayStr}T09:00:00`),
        endTime: new Date(`${todayStr}T11:00:00`),
        status: 'scheduled' as const,
        createdBy: user.id,
      },
      {
        courseId: allCourses[1]?.id || allCourses[0].id,
        classroomId: allClassrooms[1]?.id || allClassrooms[0].id,
        teacherId,
        startTime: new Date(`${todayStr}T14:00:00`),
        endTime: new Date(`${todayStr}T16:00:00`),
        status: 'scheduled' as const,
        createdBy: user.id,
      },
    ];

    for (const sd of todayScheduleData) {
      const existing = await prisma.schedule.findFirst({
        where: { courseId: sd.courseId, classroomId: sd.classroomId, startTime: sd.startTime },
      });
      if (!existing) {
        await prisma.schedule.create({ data: sd });
      }
    }

    console.log(`\u2705 \u4eca\u65e5\u6392\u8bfe\u79cd\u5b50\u6570\u636e\u521b\u5efa\u6210\u529f\uff08${todayScheduleData.length} \u6761\uff09`);

    // ===== 打卡种子数据（张小明对今日第一节课打卡）=====
    if (student1) {
      const todaySchedule = await prisma.schedule.findFirst({
        where: {
          courseId: allCourses[1]?.id || allCourses[0].id,
          startTime: { gte: new Date(`${todayStr}T00:00:00`), lte: new Date(`${todayStr}T23:59:59`) },
        },
      });
      if (todaySchedule) {
        const existingCheckin = await prisma.checkinRecord.findFirst({
          where: { studentId: student1.id, scheduleId: todaySchedule.id },
        });
        if (!existingCheckin) {
          await prisma.checkinRecord.create({
            data: {
              studentId: student1.id,
              scheduleId: todaySchedule.id,
              locationValid: true,
              creditEarned: 1,
            },
          });
          await prisma.student.update({
            where: { id: student1.id },
            data: { credits: { increment: 1 } },
          });
          console.log('\u2705 \u6253\u5361\u79cd\u5b50\u6570\u636e\u521b\u5efa\u6210\u529f\uff081 \u6761\uff09');
        } else {
          console.log('\u2139\ufe0f \u6253\u5361\u8bb0\u5f55\u5df2\u5b58\u5728\uff0c\u8df3\u8fc7');
        }
      }
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
