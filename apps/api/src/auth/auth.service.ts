import { HttpException, HttpStatus, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { User } from '@prisma/client';
import { createHash, randomInt } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { SmsService } from '../sms/sms.service';

const OTP_TTL_MS = 5 * 60_000;
const OTP_MAX_PER_WINDOW = 3;
const OTP_MAX_ATTEMPTS = 5;

const hash = (s: string) => createHash('sha256').update(s).digest('hex');

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly sms: SmsService,
  ) {}

  async sendOtp(phone: string) {
    const since = new Date(Date.now() - OTP_TTL_MS);
    const recent = await this.prisma.otpCode.count({ where: { phone, createdAt: { gte: since } } });
    if (recent >= OTP_MAX_PER_WINDOW) {
      throw new HttpException('Juda ko‘p urinish, 5 daqiqadan keyin qayta urinib ko‘ring', HttpStatus.TOO_MANY_REQUESTS);
    }
    const code = String(randomInt(100000, 1000000));
    await this.prisma.otpCode.create({
      data: { phone, codeHash: hash(phone + code), expiresAt: new Date(Date.now() + OTP_TTL_MS) },
    });
    await this.sms.send(phone, `Vet Products: tasdiqlash kodi ${code}`);
    // Ishlab chiqish rejimida kodni javobda qaytaramiz, shunda SMS'siz sinash mumkin.
    return process.env.SMS_PROVIDER === 'eskiz' ? { sent: true } : { sent: true, devCode: code };
  }

  async verifyOtp(phone: string, code: string) {
    const otp = await this.prisma.otpCode.findFirst({
      where: { phone, usedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
    });
    if (!otp || otp.attempts >= OTP_MAX_ATTEMPTS) throw new UnauthorizedException('Kod eskirgan, qayta so‘rang');
    if (otp.codeHash !== hash(phone + code)) {
      await this.prisma.otpCode.update({ where: { id: otp.id }, data: { attempts: { increment: 1 } } });
      throw new UnauthorizedException('Kod noto‘g‘ri');
    }
    await this.prisma.otpCode.update({ where: { id: otp.id }, data: { usedAt: new Date() } });
    const user = await this.prisma.user.upsert({ where: { phone }, update: {}, create: { phone } });
    return { user, ...this.issueTokens(user) };
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
