import { Body, Controller, Get, Patch, Post, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { AuthGuard, AuthUser, CurrentUser } from '../common/auth';
import { PrismaService } from '../prisma/prisma.service';
import { RefreshDto, SendOtpDto, VerifyOtpDto } from './auth.dto';
import { AuthService } from './auth.service';

class UpdateMeDto {
  @IsOptional() @IsString() @MaxLength(100) name?: string;
  @IsOptional() @IsIn(['uz', 'ru']) locale?: 'uz' | 'ru';
}

@Controller()
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly prisma: PrismaService,
  ) {}

  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  @Post('auth/otp/send')
  send(@Body() dto: SendOtpDto) {
    return this.auth.sendOtp(dto.phone);
  }

  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @Post('auth/otp/verify')
  verify(@Body() dto: VerifyOtpDto) {
    return this.auth.verifyOtp(dto.phone, dto.code);
  }

  @Post('auth/refresh')
  refresh(@Body() dto: RefreshDto) {
    return this.auth.refresh(dto.refreshToken);
  }

  @UseGuards(AuthGuard)
  @Get('me')
  me(@CurrentUser() user: AuthUser) {
    return this.prisma.user.findUniqueOrThrow({ where: { id: user.id }, include: { addresses: { include: { zone: true } } } });
  }

  @UseGuards(AuthGuard)
  @Patch('me')
  updateMe(@CurrentUser() user: AuthUser, @Body() dto: UpdateMeDto) {
    return this.prisma.user.update({ where: { id: user.id }, data: dto });
  }
}
