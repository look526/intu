import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';

/** 微信登录用户 phone 为 wx_ 前缀假号码，统一过滤 */
function sanitizePhone(phone: string | null | undefined): string | null {
  if (!phone || phone.startsWith('wx_')) return null;
  return phone;
}

/** 内存验证码存储（开发阶段） */
const smsCodeMap = new Map<string, { code: string; expiresAt: number }>();

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async validateAdmin(
    phone: string,
    password: string,
  ): Promise<{ id: string; phone: string | null; role: string }> {
    const user = await this.prisma.user.findUnique({
      where: { phone },
    });

    if (!user || user.role !== 'admin') {
      throw new UnauthorizedException('手机号或密码错误');
    }

    if (!user.password) {
      throw new UnauthorizedException('该账号未设置密码');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('手机号或密码错误');
    }

    if (user.status !== 'active') {
      throw new UnauthorizedException('账号已被禁用');
    }

    return { id: user.id, phone: user.phone, role: user.role };
  }

  async login(user: { id: string; phone: string | null; role: string }) {
    const payload = { sub: user.id, phone: user.phone, role: user.role };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }

  // ==================== 微信登录 ====================

  async validateByWechat(code: string, devOpenid?: string) {
    const appid = this.configService.get<string>('WECHAT_APPID');
    const secret = this.configService.get<string>('WECHAT_SECRET');

    let openid: string;

    if (appid && secret) {
      // 真实环境：调用微信 API
      const url = `https://api.weixin.qq.com/sns/jscode2session?appid=${appid}&secret=${secret}&js_code=${code}&grant_type=authorization_code`;
      const resp = await fetch(url);
      const data = (await resp.json()) as any;
      if (data.errcode) {
        throw new UnauthorizedException(`微信登录失败: ${data.errmsg}`);
      }
      openid = data.openid;
    } else {
      // 开发模式：优先使用前端传来的持久化 devOpenid，确保同一设备登录同一用户
      openid = devOpenid || `mock_openid_${code}`;
    }

    // 查找或创建用户
    let user = await this.prisma.user.findFirst({ where: { openid } });
    if (!user) {
      // 自动注册
      user = await this.prisma.user.create({
        data: {
          openid,
          nickname: `微信用户`,
          role: 'student',
          status: 'active',
        },
      });
      // 创建 Student 记录
      await this.prisma.student.create({
        data: { id: user.id, userId: user.id },
      });
    }

    const token = await this.login({ id: user.id, phone: user.phone, role: user.role });
    // 只检查昵称是否已自定义，头像为可选项
    const needProfile = !user.nickname || user.nickname === '微信用户';
    console.log('[WX-LOGIN] openid:', openid, '| userId:', user.id, '| nickname:', JSON.stringify(user.nickname), '| avatar:', JSON.stringify(user.avatar), '| needProfile:', needProfile);
    return { ...token, needProfile };
  }

  // ==================== 手机验证码登录 ====================

  async sendSmsCode(phone: string) {
    // 开发阶段：固定验证码 123456（生产环境应接入真实 SMS 并生成随机码）
    const code = '123456';
    smsCodeMap.set(phone, { code, expiresAt: Date.now() + 5 * 60 * 1000 });
    console.log(`[SMS] 验证码已发送到 ${phone}: ${code}`);
    return { message: '验证码已发送', devCode: code };
  }

  async validateByPhone(phone: string, code: string) {
    const stored = smsCodeMap.get(phone);
    if (!stored || stored.code !== code || Date.now() > stored.expiresAt) {
      throw new BadRequestException('验证码无效或已过期');
    }
    smsCodeMap.delete(phone);

    // 查找用户：优先按 phone 精确匹配
    let user = await this.prisma.user.findUnique({ where: { phone } });

    if (!user) {
      // 手机号未注册，自动注册新用户
      const randomSuffix = Math.random().toString(36).slice(2, 6);
      user = await this.prisma.user.create({
        data: {
          phone,
          nickname: `学员_${randomSuffix}`,
          role: 'student',
          status: 'active',
        },
      });
      await this.prisma.student.create({
        data: { id: user.id, userId: user.id },
      });
      console.log(`[PHONE-LOGIN] 新用户注册: ${phone}, userId: ${user.id}`);
    } else {
      console.log(`[PHONE-LOGIN] 已有用户登录: ${phone}, userId: ${user.id}`);
    }

    return this.login({ id: user.id, phone: user.phone, role: user.role });
  }

  async updateProfile(userId: string, data: { nickname?: string; avatar?: string; phone?: string }) {
    const updateData: Record<string, any> = {};
    if (data.nickname) updateData.nickname = data.nickname;
    if (data.avatar) updateData.avatar = data.avatar;
    if (data.phone !== undefined) updateData.phone = data.phone || null;

    console.log('[UPDATE-PROFILE] userId:', userId, '| input:', JSON.stringify(data), '| updateData:', JSON.stringify(updateData));

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: { id: true, nickname: true, avatar: true },
    });
    console.log('[UPDATE-PROFILE] result:', JSON.stringify(user));
    return user;
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        phone: true,
        nickname: true,
        avatar: true,
        role: true,
        status: true,
        createdAt: true,
        admin: {
          select: {
            realName: true,
            permission: true,
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('用户不存在');
    }

    return { ...user, phone: sanitizePhone(user.phone) };
  }

  /** “我的”页面聚合统计：在学课程数、笔记数、获赞数 */
  async getMyStats(userId: string) {
    const student = await this.prisma.student.findUnique({ where: { userId } });
    if (!student) return { courseCount: 0, noteCount: 0, likeCount: 0 };

    const [courseCount, noteCount, likeCount] = await Promise.all([
      // 在学课程 = 学员所在班级数
      this.prisma.classGroupStudent.count({ where: { studentId: student.id } }),
      // 笔记数
      this.prisma.note.count({ where: { studentId: student.id } }),
      // 获赞总数 = 所有笔记的 likes 之和
      this.prisma.note.aggregate({
        where: { studentId: student.id },
        _sum: { likes: true },
      }).then((r) => r._sum.likes || 0),
    ]);

    return { courseCount, noteCount, likeCount };
  }
}
