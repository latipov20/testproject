import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthGuard } from '../common/auth';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { TelegramService } from './telegram.service';

@Global()
@Module({
  imports: [JwtModule.register({})],
  controllers: [AuthController],
  providers: [AuthService, TelegramService, AuthGuard],
  exports: [JwtModule, AuthGuard],
})
export class AuthModule {}
