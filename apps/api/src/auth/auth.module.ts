import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthGuard } from '../common/auth';
import { SmsService } from '../sms/sms.service';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

@Global()
@Module({
  imports: [JwtModule.register({})],
  controllers: [AuthController],
  providers: [AuthService, SmsService, AuthGuard],
  exports: [JwtModule, AuthGuard],
})
export class AuthModule {}
