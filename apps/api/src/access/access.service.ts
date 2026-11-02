import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import type { Role } from '../generated/prisma/client';
import type { AuthUser } from '../auth/auth.guard';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Answers "may this user do X in this tournament?". Every write goes through
 * here so the permission rules live in one place.
 */
@Injectable()
export class AccessService {
  constructor(private readonly prisma: PrismaService) {}

  signedIn(user: AuthUser | undefined): AuthUser {
    if (!user) throw new UnauthorizedException('Inicia sesión para continuar');
    return user;
  }

  /** Active memberships of the user in a tournament. */
  activeRoles(userId: string, tournamentId: string) {
    return this.prisma.membership.findMany({
      where: { userId, tournamentId, status: 'ACTIVE' },
    });
  }

  async hasRole(userId: string, tournamentId: string, role: Role) {
    const membership = await this.prisma.membership.findFirst({
      where: { userId, tournamentId, role, status: 'ACTIVE' },
      select: { id: true },
    });
    return membership !== null;
  }

  async requireAdmin(user: AuthUser | undefined, tournamentId: string) {
    const { id } = this.signedIn(user);
    if (!(await this.hasRole(id, tournamentId, 'ADMIN'))) {
      throw new ForbiddenException('Solo el administrador del torneo puede hacer esto');
    }
  }

  async isCoachOf(userId: string, teamId: string) {
    const membership = await this.prisma.membership.findFirst({
      where: { userId, teamId, role: 'COACH', status: 'ACTIVE' },
      select: { id: true },
    });
    return membership !== null;
  }

  async tournamentOfTeam(teamId: string) {
    const team = await this.prisma.team.findUnique({
      where: { id: teamId },
      select: { tournamentId: true },
    });
    if (!team) throw new NotFoundException('Team not found');
    return team.tournamentId;
  }

  async tournamentOfPlayer(playerId: string) {
    const player = await this.prisma.player.findUnique({
      where: { id: playerId },
      select: { team: { select: { tournamentId: true } } },
    });
    if (!player) throw new NotFoundException('Player not found');
    return player.team.tournamentId;
  }
}
