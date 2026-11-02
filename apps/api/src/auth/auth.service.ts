import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { OAuth2Client } from 'google-auth-library';
import { PrismaService } from '../prisma/prisma.service';
import type { JwtPayload } from './auth.guard';
import { LoginDto, RegisterDto } from './dto/auth.dto';
import { hashPassword, verifyPassword } from './password';

const PUBLIC_USER = {
  id: true,
  email: true,
  name: true,
  avatarUrl: true,
  createdAt: true,
} as const;

type SocialProfile = {
  provider: 'googleId' | 'facebookId';
  providerId: string;
  email: string;
  name: string;
  avatarUrl?: string;
};

@Injectable()
export class AuthService {
  private readonly google = new OAuth2Client();

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existing) {
      throw new ConflictException('Ya existe una cuenta con ese correo');
    }
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        name: dto.name.trim(),
        passwordHash: await hashPassword(dto.password),
      },
      select: PUBLIC_USER,
    });
    return this.session(user);
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    const valid =
      user?.passwordHash != null &&
      (await verifyPassword(dto.password, user.passwordHash));
    if (!user || !valid) {
      throw new UnauthorizedException('Correo o contraseña incorrectos');
    }
    return this.session({
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
      createdAt: user.createdAt,
    });
  }

  async loginWithGoogle(idToken: string) {
    const audience = (process.env.GOOGLE_CLIENT_IDS ?? '')
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean);
    if (audience.length === 0) {
      throw new ServiceUnavailableException('El inicio con Google aún no está configurado');
    }
    const ticket = await this.google
      .verifyIdToken({ idToken, audience })
      .catch(() => {
        throw new UnauthorizedException('No se pudo verificar tu cuenta de Google');
      });
    const payload = ticket.getPayload();
    if (!payload?.email || !payload.email_verified) {
      throw new UnauthorizedException('Tu cuenta de Google no tiene un correo verificado');
    }
    return this.socialLogin({
      provider: 'googleId',
      providerId: payload.sub,
      email: payload.email.toLowerCase(),
      name: payload.name ?? payload.email,
      avatarUrl: payload.picture,
    });
  }

  async loginWithFacebook(accessToken: string) {
    const appId = process.env.FACEBOOK_APP_ID;
    const appSecret = process.env.FACEBOOK_APP_SECRET;
    if (!appId || !appSecret) {
      throw new ServiceUnavailableException('El inicio con Facebook aún no está configurado');
    }
    // Confirm the token was issued for this app before trusting the profile
    const debug = await this.graph<{ data?: { app_id?: string; is_valid?: boolean } }>(
      `/debug_token?input_token=${encodeURIComponent(accessToken)}&access_token=${appId}|${appSecret}`,
    );
    if (!debug.data?.is_valid || debug.data.app_id !== appId) {
      throw new UnauthorizedException('No se pudo verificar tu cuenta de Facebook');
    }
    const profile = await this.graph<{
      id: string;
      name?: string;
      email?: string;
      picture?: { data?: { url?: string } };
    }>(`/me?fields=id,name,email,picture.type(large)&access_token=${encodeURIComponent(accessToken)}`);
    if (!profile.email) {
      throw new BadRequestException(
        'Tu cuenta de Facebook no comparte un correo. Regístrate con correo y contraseña.',
      );
    }
    return this.socialLogin({
      provider: 'facebookId',
      providerId: profile.id,
      email: profile.email.toLowerCase(),
      name: profile.name ?? profile.email,
      avatarUrl: profile.picture?.data?.url,
    });
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        ...PUBLIC_USER,
        memberships: {
          select: {
            id: true,
            tournamentId: true,
            role: true,
            status: true,
            teamId: true,
            playerId: true,
          },
        },
      },
    });
    if (!user) throw new NotFoundException('La cuenta ya no existe');
    return user;
  }

  /** Signs in an existing account, links the provider to a matching email, or creates one. */
  private async socialLogin(profile: SocialProfile) {
    const { provider, providerId, email, name, avatarUrl } = profile;
    const byProvider = await this.prisma.user.findFirst({
      where: { [provider]: providerId },
      select: PUBLIC_USER,
    });
    if (byProvider) return this.session(byProvider);

    const byEmail = await this.prisma.user.findUnique({ where: { email } });
    const user = byEmail
      ? await this.prisma.user.update({
          where: { id: byEmail.id },
          data: { [provider]: providerId, avatarUrl: byEmail.avatarUrl ?? avatarUrl },
          select: PUBLIC_USER,
        })
      : await this.prisma.user.create({
          data: { email, name, avatarUrl, [provider]: providerId },
          select: PUBLIC_USER,
        });
    return this.session(user);
  }

  private async session<T extends { id: string }>(user: T) {
    const payload: JwtPayload = { sub: user.id };
    return { token: await this.jwt.signAsync(payload), user };
  }

  private async graph<T>(path: string): Promise<T> {
    const response = await fetch(`https://graph.facebook.com/v21.0${path}`);
    if (!response.ok) {
      throw new UnauthorizedException('No se pudo verificar tu cuenta de Facebook');
    }
    return (await response.json()) as T;
  }
}
