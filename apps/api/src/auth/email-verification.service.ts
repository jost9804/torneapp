import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { createHmac, randomInt, timingSafeEqual } from 'crypto';
import { MailService } from '../mail/mail.service';
import { PrismaService } from '../prisma/prisma.service';

const CODE_MINUTES = 15;
export const CODE_DIGITS = 4;
const MAX_ATTEMPTS = 3;
const RESEND_AFTER_SECONDS = 60;
/**
 * A 4-digit code has 10,000 values, so guesses are capped per day: 3 attempts on each of
 * at most 8 codes leaves about a 0.24% chance of guessing someone else's in a day.
 */
const MAX_SENDS_PER_DAY = 8;
const WINDOW_MS = 24 * 3_600_000;

/** Short codes sent by email; only their HMAC is stored. */
@Injectable()
export class EmailVerificationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
  ) {}

  private hash(userId: string, code: string) {
    return createHmac('sha256', process.env.JWT_SECRET ?? '')
      .update(`${userId}:${code}`)
      .digest('hex');
  }

  /** Sends a new code, replacing the previous one, within the resend limits. */
  async send(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { emailCode: true },
    });
    if (!user) throw new NotFoundException('La cuenta ya no existe');
    if (user.emailVerifiedAt) return { sent: false, alreadyVerified: true };

    const now = new Date();
    const previous = user.emailCode;
    let sendsInWindow = 1;
    let windowStartedAt = now;
    if (previous) {
      const waited = (now.getTime() - previous.sentAt.getTime()) / 1000;
      if (waited < RESEND_AFTER_SECONDS) {
        throw new HttpException(
          `Espera ${Math.ceil(RESEND_AFTER_SECONDS - waited)} segundos para pedir otro código`,
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
      const sameWindow =
        now.getTime() - previous.windowStartedAt.getTime() < WINDOW_MS;
      if (sameWindow) {
        if (previous.sendsInWindow >= MAX_SENDS_PER_DAY) {
          throw new HttpException(
            'Pediste demasiados códigos. Inténtalo de nuevo mañana.',
            HttpStatus.TOO_MANY_REQUESTS,
          );
        }
        sendsInWindow = previous.sendsInWindow + 1;
        windowStartedAt = previous.windowStartedAt;
      }
    }

    const code = randomInt(0, 10 ** CODE_DIGITS)
      .toString()
      .padStart(CODE_DIGITS, '0');
    const data = {
      codeHash: this.hash(userId, code),
      expiresAt: new Date(now.getTime() + CODE_MINUTES * 60_000),
      attempts: 0,
      sentAt: now,
      sendsInWindow,
      windowStartedAt,
    };
    await this.prisma.emailCode.upsert({
      where: { userId },
      create: { userId, ...data },
      update: data,
    });
    await this.mail.sendVerificationCode(
      user.email,
      user.name,
      code,
      CODE_MINUTES,
    );
    return { sent: true, alreadyVerified: false };
  }

  async verify(userId: string, code: string) {
    const record = await this.prisma.emailCode.findUnique({
      where: { userId },
    });
    if (!record) throw new BadRequestException('Pide un código nuevo');
    if (record.expiresAt < new Date()) {
      throw new BadRequestException('El código venció. Pide uno nuevo.');
    }
    if (record.attempts >= MAX_ATTEMPTS) {
      throw new BadRequestException(
        'Demasiados intentos. Pide un código nuevo.',
      );
    }
    const expected = Buffer.from(record.codeHash, 'hex');
    const given = Buffer.from(this.hash(userId, code.trim()), 'hex');
    if (!timingSafeEqual(expected, given)) {
      await this.prisma.emailCode.update({
        where: { userId },
        data: { attempts: { increment: 1 } },
      });
      const left = MAX_ATTEMPTS - record.attempts - 1;
      throw new BadRequestException(
        left > 0
          ? `Código incorrecto. Te ${left === 1 ? 'queda 1 intento' : `quedan ${left} intentos`}.`
          : 'Código incorrecto. Pide uno nuevo.',
      );
    }
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: { emailVerifiedAt: new Date() },
      }),
      this.prisma.emailCode.delete({ where: { userId } }),
    ]);
  }
}
