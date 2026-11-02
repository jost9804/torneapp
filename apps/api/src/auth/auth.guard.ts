import {
  CanActivate,
  createParamDecorator,
  ExecutionContext,
  Injectable,
  SetMetadata,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';

export type AuthUser = { id: string };
export type JwtPayload = { sub: string };

const REQUIRES_AUTH = 'requiresAuth';

/** Route needs a signed-in user. Reading stays public everywhere else. */
export const Authenticated = () => SetMetadata(REQUIRES_AUTH, true);

/** The signed-in user, or undefined on public routes without a token. */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUser | undefined =>
    ctx.switchToHttp().getRequest<Request & { user?: AuthUser }>().user,
);

/**
 * Global guard: attaches the user when a valid Bearer token is sent, and
 * rejects only routes marked with @Authenticated() that have no user.
 */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: AuthUser }>();
    const [scheme, token] = request.headers.authorization?.split(' ') ?? [];

    if (scheme === 'Bearer' && token) {
      try {
        const payload = await this.jwt.verifyAsync<JwtPayload>(token);
        request.user = { id: payload.sub };
      } catch {
        // An expired or forged token is treated like no token
      }
    }

    const requiresAuth = this.reflector.getAllAndOverride<boolean>(
      REQUIRES_AUTH,
      [context.getHandler(), context.getClass()],
    );
    if (requiresAuth && !request.user) {
      throw new UnauthorizedException('Inicia sesión para continuar');
    }
    return true;
  }
}
