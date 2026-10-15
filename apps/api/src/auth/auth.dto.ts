import { IsHexadecimal, IsString, Length, Matches } from 'class-validator';

export class TelegramTokenDto {
  @IsHexadecimal() @Length(32, 32) token: string;
}

export class TelegramVerifyDto extends TelegramTokenDto {
  @Matches(/^\d{6}$/, { message: 'Kod 6 ta raqamdan iborat' }) code: string;
}

export class TelegramDevContactDto extends TelegramTokenDto {
  @Matches(/^\+998\d{9}$/, { message: 'Telefon +998XXXXXXXXX formatida bo‘lishi kerak' }) phone: string;
}

export class RefreshDto {
  @IsString()
  refreshToken: string;
}
