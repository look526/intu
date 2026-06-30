import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class WechatMessageService {
  private readonly logger = new Logger(WechatMessageService.name);

  private accessToken = '';
  private tokenExpiresAt = 0;

  constructor(private readonly configService: ConfigService) {}

  /**
   * 获取微信 access_token（内存缓存，提前 5 分钟刷新）
   */
  async getAccessToken(): Promise<string> {
    if (this.accessToken && Date.now() < this.tokenExpiresAt) {
      return this.accessToken;
    }

    const appid = this.configService.get<string>('WECHAT_APPID');
    const secret = this.configService.get<string>('WECHAT_SECRET');
    if (!appid || !secret) {
      this.logger.warn('WECHAT_APPID 或 WECHAT_SECRET 未配置，跳过 access_token 获取');
      return '';
    }

    try {
      const url = `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${appid}&secret=${secret}`;
      const resp = await fetch(url);
      const data = (await resp.json()) as any;

      if (data.access_token) {
        this.accessToken = data.access_token;
        // 提前 5 分钟过期
        this.tokenExpiresAt = Date.now() + (data.expires_in - 300) * 1000;
        this.logger.log('access_token 刷新成功');
        return this.accessToken;
      }

      this.logger.error(`获取 access_token 失败: ${JSON.stringify(data)}`);
      return '';
    } catch (err) {
      this.logger.error('获取 access_token 网络异常', err);
      return '';
    }
  }

  /**
   * 发送微信订阅消息
   */
  async sendSubscribeMessage(
    openid: string,
    templateId: string,
    data: Record<string, { value: string }>,
    page?: string,
  ): Promise<boolean> {
    if (!templateId) {
      this.logger.debug('模板 ID 为空，跳过发送');
      return false;
    }

    const token = await this.getAccessToken();
    if (!token) {
      this.logger.warn('无可用 access_token，跳过消息发送');
      return false;
    }

    try {
      const url = `https://api.weixin.qq.com/cgi-bin/message/subscribe/send?access_token=${token}`;
      const body: any = {
        touser: openid,
        template_id: templateId,
        data,
      };
      if (page) body.page = page;

      const resp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const result = (await resp.json()) as any;

      if (result.errcode === 0) {
        this.logger.log(`订阅消息发送成功: openid=${openid}, tpl=${templateId}`);
        return true;
      }

      // 43101 = 用户拒绝接受消息，不算错误
      if (result.errcode === 43101) {
        this.logger.debug(`用户未订阅该消息: openid=${openid}`);
        return false;
      }

      this.logger.warn(`订阅消息发送失败: ${JSON.stringify(result)}`);
      return false;
    } catch (err) {
      this.logger.error('订阅消息发送异常', err);
      return false;
    }
  }
}
