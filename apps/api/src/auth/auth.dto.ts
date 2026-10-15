import { IsString, Length, Matches } from 'class-validator';

export class SendOtpDto {
  @Matches(/^\+998\d{9}$/, { message: 'Telefon +998XXXXXXXXX formatida bo‘lishi kerak' })
  phone: string;
}

export class VerifyOtpDto extends SendOtpDto {
  @Length(6, 6)
  code: string;
}

export class RefreshDto {
  @IsString()
  refreshToken: string;
}
