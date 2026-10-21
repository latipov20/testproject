import { Body, Controller, Get, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { AuthGuard, AuthUser, CurrentUser } from '../common/auth';
import { PrismaService } from '../prisma/prisma.service';
import { AdminLoginDto, RefreshDto, TelegramDevContactDto, TelegramTokenDto, TelegramVerifyDto } from './auth.dto';
import { AuthService, publicUser } from './auth.service';

class UpdateMeDto {
  @IsOptional() @IsString() @MaxLength(100) name?: string;
  @IsOptional() @IsIn(['uz', 'ru']) locale?: 'uz' | 'ru';
}

// Tokendagi xodim roli (ADMIN/COURIER) faqat parol bilan kirilganda beriladi.
const viaOf = (user: AuthUser) => (user.role === 'CUSTOMER' ? 'telegram' : 'password');

@Controller()
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly prisma: PrismaService,
  ) {}

  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @Post('auth/telegram/start')
  start() {
    return this.auth.startTelegram();
  }

  @Get('auth/telegram/status')
  status(@Query() dto: TelegramTokenDto) {
    return this.auth.telegramStatus(dto.token);
  }

  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  @Post('auth/telegram/dev-contact')
  devContact(@Body() dto: TelegramDevContactDto) {
    return this.auth.devContact(dto.token, dto.phone);
  }

  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @Post('auth/telegram/verify')
  verify(@Body() dto: TelegramVerifyDto) {
    return this.auth.verifyTelegram(dto.token, dto.code);
  }

  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  // Admin va kuryer paneli (auth/admin/login — eski nom, saqlab qolingan).
  @Post(['auth/staff/login', 'auth/admin/login'])
  staffLogin(@Body() dto: AdminLoginDto) {
    return this.auth.staffLogin(dto.login, dto.password);
  }

  @Post('auth/refresh')
  refresh(@Body() dto: RefreshDto) {
    return this.auth.refresh(dto.refreshToken);
  }

  @UseGuards(AuthGuard)
  @Get('me')
  async me(@CurrentUser() user: AuthUser) {
    const u = await this.prisma.user.findUniqueOrThrow({ where: { id: user.id }, include: { addresses: { include: { zone: true } } } });
    return { ...publicUser(u, viaOf(user)), addresses: u.addresses };
  }

  @UseGuards(AuthGuard)
  @Patch('me')
  async updateMe(@CurrentUser() user: AuthUser, @Body() dto: UpdateMeDto) {
    return publicUser(await this.prisma.user.update({ where: { id: user.id }, data: dto }), viaOf(user));
  }
}
