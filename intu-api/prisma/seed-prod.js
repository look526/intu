/**
 * 生产环境种子脚本（纯 JS，无需 ts-node）
 * 用法: node prisma/seed-prod.js
 */
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const phone = '13800000000';
  const plainPassword = 'admin123';
  const hashedPassword = await bcrypt.hash(plainPassword, 10);

  // 管理员用户
  const user = await prisma.user.upsert({
    where: { phone },
    update: { password: hashedPassword, role: 'admin' },
    create: {
      phone,
      nickname: '超级管理员',
      password: hashedPassword,
      role: 'admin',
      status: 'active',
    },
  });

  await prisma.admin.upsert({
    where: { userId: user.id },
    update: { realName: '系统管理员' },
    create: {
      userId: user.id,
      realName: '系统管理员',
      permission: ['*'],
    },
  });

  console.log(`✅ 管理员创建成功: phone=${phone}, password=${plainPassword}`);

  // 系统配置
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

  await prisma.systemConfig.upsert({
    where: { key: 'home_quick_links' },
    update: {},
    create: {
      key: 'home_quick_links',
      value: [
        { name: '养生', icon: '养', color: '#4A90D9', linkUrl: '/pages/course/list/index?categoryId=1' },
        { name: '运动', icon: '运', color: '#F5A623', linkUrl: '/pages/course/list/index?categoryId=2' },
        { name: '音乐', icon: '音', color: '#7B68EE', linkUrl: '/pages/course/list/index?categoryId=5' },
        { name: '美术', icon: '美', color: '#E8524A', linkUrl: '/pages/course/list/index?categoryId=6' },
        { name: '舞蹈', icon: '舞', color: '#2ECC71', linkUrl: '/pages/course/list/index?categoryId=3' },
      ],
    },
  });

  await prisma.systemConfig.upsert({
    where: { key: 'popups' },
    update: {},
    create: { key: 'popups', value: [] },
  });

  console.log('✅ 系统配置种子数据创建成功');

  // 课程分类
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

  console.log(`✅ 课程分类种子数据创建成功（${categories.length} 条）`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
