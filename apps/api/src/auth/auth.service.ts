import { BadRequestException, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { User } from '@prisma/client';
import { randomBytes, randomInt } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { hash, LOGIN_TTL_MS, TelegramService } from './telegram.service';

const MAX_ATTEMPTS = 5;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly telegram: TelegramService,
  ) {}

  // 1-qadam: sayt kirish sessiyasini ochadi va foydalanuvchini botga yuboradi.
  async startTelegram() {
    const token = randomBytes(16).toString('hex');
    await this.prisma.telegramLogin.create({ data: { token, expiresAt: new Date(Date.now() + LOGIN_TTL_MS) } });
    return { token, botUrl: this.telegram.enabled ? this.telegram.botUrl(token) : null, dev: this.devMode };
  }

  // Sinov rejimi faqat aniq yoqilganda: aks holda bot sozlanmagan serverda istalgan raqam bilan kirib bo'lardi.
  private get devMode() {
    return !this.telegram.enabled && process.env.AUTH_DEV_MODE === 'true' && process.env.NODE_ENV !== 'production';
  }

  // Sayt shu orqali "kod botga yuborildi" holatini ko'rsatadi.
  async telegramStatus(token: string) {
    const login = await this.prisma.telegramLogin.findUnique({ where: { token } });
    if (!login || login.usedAt || login.expiresAt < new Date()) return { state: 'expired' as const };
    return { state: login.codeHash ? ('code_sent' as const) : login.chatId ? ('opened' as const) : ('waiting' as const) };
  }

  // Bot ulanmagan (sinov) rejimi: "raqamni yuborish" qadamini taqlid qiladi va kodni qaytaradi.
  async devContact(token: string, phone: string) {
    if (!this.devMode) throw new ForbiddenException();
    const login = await this.prisma.telegramLogin.findFirst({ where: { token, usedAt: null, expiresAt: { gt: new Date() } } });
    if (!login) throw new BadRequestException('Kirish muddati tugagan');
    const code = String(randomInt(100000, 1000000));
    await this.prisma.telegramLogin.update({ where: { id: login.id }, data: { phone, codeHash: hash(`${login.id}:${code}`), attempts: 0 } });
    return { devCode: code };
  }

  // 3-qadam: botdan kelgan kodni tekshiradi; foydalanuvchi telefon raqami bo'yicha topiladi yoki yaratiladi.
  async verifyTelegram(token: string, code: string) {
    const login = await this.prisma.telegramLogin.findUnique({ where: { token } });
    if (!login || login.usedAt || login.expiresAt < new Date() || !login.codeHash || !login.phone) {
      throw new UnauthorizedException('Kod eskirgan, qaytadan kiring');
    }
    if (login.attempts >= MAX_ATTEMPTS) throw new UnauthorizedException('Urinishlar tugadi, qaytadan kiring');
    if (login.codeHash !== hash(`${login.id}:${code}`)) {
      await this.prisma.telegramLogin.update({ where: { id: login.id }, data: { attempts: { increment: 1 } } });
      throw new UnauthorizedException('Kod noto‘g‘ri');
    }
    await this.prisma.telegramLogin.update({ where: { id: login.id }, data: { usedAt: new Date() } });

    const name = [login.firstName, login.lastName].filter(Boolean).join(' ') || undefined;
    const tg = login.chatId ? { telegramId: login.chatId, telegramUsername: login.username } : {};
    // Shu Telegram akkaunti boshqa raqamga bog'langan bo'lsa, eskisidan uziladi.
    if (login.chatId) await this.prisma.user.updateMany({ where: { telegramId: login.chatId, NOT: { phone: login.phone } }, data: { telegramId: null } });
    const existing = await this.prisma.user.findUnique({ where: { phone: login.phone } });
    const user = existing
      ? await this.prisma.user.update({ where: { id: existing.id }, data: { ...tg, name: existing.name ?? name } })
      : await this.prisma.user.create({ data: { phone: login.phone, name, ...tg } });
    return { user: publicUser(user), ...this.issueTokens(user) };
  }

  async refresh(refreshToken: string) {
    try {
      const payload = this.jwt.verify(refreshToken, { secret: process.env.JWT_REFRESH_SECRET });
      const user = await this.prisma.user.findUniqueOrThrow({ where: { id: payload.sub } });
      return this.issueTokens(user);
    } catch {
      throw new UnauthorizedException();
    }
  }

  private issueTokens(user: User) {
    const payload = { sub: user.id, role: user.role };
    return {
      accessToken: this.jwt.sign(payload, { secret: process.env.JWT_ACCESS_SECRET, expiresIn: '1h' }),
      refreshToken: this.jwt.sign(payload, { secret: process.env.JWT_REFRESH_SECRET, expiresIn: '30d' }),
    };
  }
}

export function publicUser(u: User) {
  return { id: u.id, phone: u.phone, name: u.name, role: u.role, locale: u.locale, telegramUsername: u.telegramUsername, telegramLinked: u.telegramId !== null };
}
