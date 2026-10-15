import { Injectable, Logger } from '@nestjs/common';

// SMS yuborish: SMS_PROVIDER=console bo'lsa logga yozadi, eskiz bo'lsa Eskiz.uz orqali yuboradi.
@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);
  private eskizToken?: string;

  async send(phone: string, text: string): Promise<void> {
    if (process.env.SMS_PROVIDER !== 'eskiz') {
      this.logger.log(`SMS -> ${phone}: ${text}`);
      return;
    }
    const res = await this.eskizSend(phone, text);
    if (res.status === 401) {
      this.eskizToken = undefined;
      await this.eskizSend(phone, text);
    }
  }

  private async eskizSend(phone: string, text: string) {
    const token = await this.eskizLogin();
    const body = new FormData();
    body.set('mobile_phone', phone.replace(/\D/g, ''));
    body.set('message', text);
    body.set('from', process.env.ESKIZ_FROM ?? '4546');
    return fetch('https://notify.eskiz.uz/api/message/sms/send', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body,
    });
  }

  private async eskizLogin(): Promise<string> {
    if (this.eskizToken) return this.eskizToken;
    const body = new FormData();
    body.set('email', process.env.ESKIZ_EMAIL ?? '');
    body.set('password', process.env.ESKIZ_PASSWORD ?? '');
    const res = await fetch('https://notify.eskiz.uz/api/auth/login', { method: 'POST', body });
    const json = (await res.json()) as { data?: { token?: string } };
    if (!json.data?.token) throw new Error('Eskiz login failed');
    this.eskizToken = json.data.token;
    return this.eskizToken;
  }
}
