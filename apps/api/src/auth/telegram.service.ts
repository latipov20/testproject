import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { createHash, randomInt } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

export const LOGIN_TTL_MS = 10 * 60_000;
export const hash = (s: string) => createHash('sha256').update(s).digest('hex');

interface TgUser {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
}
interface TgMessage {
  chat: { id: number };
  from?: TgUser;
  text?: string;
  contact?: { phone_number: string; user_id?: number; first_name?: string; last_name?: string };
}

// "Vet Register" boti: long polling (webhook va ochiq domen shart emas).
// /start <token> -> raqamni so'raydi -> raqam kelganda 6 xonali kod yuboradi.
// TELEGRAM_BOT_TOKEN bo'lmasa bot ishlamaydi va sayt sinov rejimiga o'tadi (kod sahifada ko'rsatiladi).
@Injectable()
export class TelegramService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger('VetRegisterBot');
  private readonly token = process.env.TELEGRAM_BOT_TOKEN;
  private username = process.env.TELEGRAM_BOT_USERNAME ?? '';
  private running = false;
  private offset = 0;

  constructor(private readonly prisma: PrismaService) {}

  get enabled() {
    return !!this.token;
  }

  botUrl(loginToken: string) {
    return `https://t.me/${this.username}?start=${loginToken}`;
  }

  async onModuleInit() {
    if (!this.token) {
      this.logger.warn('TELEGRAM_BOT_TOKEN berilmagan: Telegram orqali kirish sinov rejimida');
      return;
    }
    try {
      const me = await this.call<{ username: string }>('getMe');
      this.username = me.username;
      // Webhook o'rnatilgan bo'lsa getUpdates ishlamaydi.
      await this.call('deleteWebhook');
      this.logger.log(`@${this.username} ishga tushdi`);
    } catch (e) {
      this.logger.error(`Bot ishga tushmadi: ${(e as Error).message}`);
      return;
    }
    this.running = true;
    void this.poll();
  }

  onModuleDestroy() {
    this.running = false;
  }

  private async poll() {
    while (this.running) {
      try {
        const updates = await this.call<{ update_id: number; message?: TgMessage }[]>('getUpdates', {
          offset: this.offset,
          timeout: 25,
          allowed_updates: ['message'],
        });
        for (const u of updates) {
          this.offset = u.update_id + 1;
          if (u.message) await this.onMessage(u.message).catch((e) => this.logger.error(e));
        }
      } catch (e) {
        this.logger.warn(`getUpdates: ${(e as Error).message}`);
        await new Promise((r) => setTimeout(r, 5000));
      }
    }
  }

  private async onMessage(m: TgMessage) {
    const chatId = m.chat.id;
    const text = m.text?.trim() ?? '';

    if (text.startsWith('/start')) {
      const loginToken = text.split(/\s+/)[1];
      const login = loginToken
        ? await this.prisma.telegramLogin.findFirst({ where: { token: loginToken, usedAt: null, expiresAt: { gt: new Date() } } })
        : null;
      if (!login) {
        return this.send(
          chatId,
          'Assalomu alaykum! Bu Vet Products do‘koniga kirish boti.\nSaytda «Telegram orqali kirish» tugmasini bosing — u sizni shu yerga qaytaradi.\n\nЗдравствуйте! Это бот для входа в магазин Vet Products. Нажмите «Войти через Telegram» на сайте.',
        );
      }
      await this.prisma.telegramLogin.update({ where: { id: login.id }, data: { chatId: BigInt(chatId) } });

      // Ilgari raqam yuborgan foydalanuvchidan qayta so'ramaymiz.
      const known = m.from && (await this.prisma.user.findUnique({ where: { telegramId: BigInt(m.from.id) } }));
      if (known) return this.issueCode(login.id, chatId, known.phone, m.from!);

      return this.send(chatId, 'Kirish uchun telefon raqamingizni yuboring 👇\nОтправьте номер телефона для входа 👇', {
        keyboard: [[{ text: '📱 Raqamni yuborish / Отправить номер', request_contact: true }]],
        resize_keyboard: true,
        one_time_keyboard: true,
      });
    }

    if (m.contact) {
      // Faqat o'z raqamini yuborish mumkin (boshqa odamning kontaktini emas).
      if (!m.from || m.contact.user_id !== m.from.id) {
        return this.send(chatId, 'Iltimos, tugma orqali o‘zingizning raqamingizni yuboring.\nПожалуйста, отправьте свой номер кнопкой.');
      }
      const login = await this.prisma.telegramLogin.findFirst({
        where: { chatId: BigInt(chatId), usedAt: null, expiresAt: { gt: new Date() } },
        orderBy: { createdAt: 'desc' },
      });
      if (!login) return this.send(chatId, 'Kirish muddati tugagan. Saytda qaytadan «Telegram orqali kirish» tugmasini bosing.', { remove_keyboard: true });
      const digits = m.contact.phone_number.replace(/\D/g, '');
      return this.issueCode(login.id, chatId, `+${digits}`, { ...m.from, first_name: m.contact.first_name ?? m.from.first_name, last_name: m.contact.last_name ?? m.from.last_name });
    }

    return this.send(chatId, 'Saytdagi «Telegram orqali kirish» tugmasidan foydalaning.\nИспользуйте кнопку «Войти через Telegram» на сайте.');
  }

  private async issueCode(loginId: number, chatId: number, phone: string, from: TgUser) {
    const code = String(randomInt(100000, 1000000));
    await this.prisma.telegramLogin.update({
      where: { id: loginId },
      data: {
        phone,
        firstName: from.first_name,
        lastName: from.last_name,
        username: from.username,
        codeHash: hash(`${loginId}:${code}`),
        attempts: 0,
        expiresAt: new Date(Date.now() + LOGIN_TTL_MS),
      },
    });
    await this.send(chatId, `🔐 Tasdiqlash kodi / Код подтверждения: <b>${code}</b>\n\nKodni saytga kiriting. Uni hech kimga bermang.\nВведите код на сайте. Никому его не сообщайте.`, {
      remove_keyboard: true,
    });
  }

  private send(chatId: number, text: string, reply_markup?: object) {
    return this.call('sendMessage', { chat_id: chatId, text, parse_mode: 'HTML', reply_markup });
  }

  private async call<T = unknown>(method: string, body?: object): Promise<T> {
    const res = await fetch(`https://api.telegram.org/bot${this.token}/${method}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body ?? {}),
      signal: AbortSignal.timeout(35_000),
    });
    const json = (await res.json()) as { ok: boolean; result: T; description?: string };
    if (!json.ok) throw new Error(json.description ?? `HTTP ${res.status}`);
    return json.result;
  }
}
