import { Global, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { AuthGuard } from './auth.guard';
import { AuthService } from './auth.service';
import { EmailVerificationService } from './email-verification.service';
import { MailService } from '../mail/mail.service';

@Global()
@Module({
  imports: [
    JwtModule.registerAsync({
      useFactory: () => {
        const secret = process.env.JWT_SECRET;
        if (!secret) throw new Error('JWT_SECRET is not set');
        return { secret, signOptions: { expiresIn: '30d' } };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    EmailVerificationService,
    MailService,
    { provide: APP_GUARD, useClass: AuthGuard },
  ],
  exports: [MailService],
})
export class AuthModule {}
