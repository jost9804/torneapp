import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AccessService } from '../access/access.service';
import type { AuthUser } from '../auth/auth.guard';
import type { Role } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  ApproveMembershipDto,
  InviteMemberDto,
  JoinTournamentDto,
} from './dto/membership.dto';

const TEAM_ROLES: Role[] = ['COACH', 'PLAYER'];

@Injectable()
export class MembershipsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: AccessService,
  ) {}

  /** A signed-in user asks for a role; it stays PENDING until an admin approves. */
  async join(user: AuthUser, tournamentId: string, dto: JoinTournamentDto) {
    await this.assertTournament(tournamentId);
    const teamId = await this.teamFor(tournamentId, dto.role, dto.teamId);
    await this.assertNotMember(user.id, tournamentId, dto.role);
    return this.prisma.membership.create({
      data: { userId: user.id, tournamentId, role: dto.role, teamId },
      include: { team: { select: { id: true, name: true } } },
    });
  }

  /** An admin adds someone who already has an account, active right away. */
  async invite(user: AuthUser | undefined, tournamentId: string, dto: InviteMemberDto) {
    await this.access.requireAdmin(user, tournamentId);
    const invitee = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (!invitee) {
      throw new NotFoundException(
        'No hay ninguna cuenta con ese correo. Pídele que se registre primero.',
      );
    }
    const teamId = await this.teamFor(tournamentId, dto.role, dto.teamId);
    const playerId = await this.playerFor(dto.role, teamId, dto.playerId);

    const existing = await this.prisma.membership.findUnique({
      where: {
        userId_tournamentId_role: { userId: invitee.id, tournamentId, role: dto.role },
      },
    });
    if (existing?.status === 'ACTIVE') {
      throw new ConflictException('Esa persona ya tiene ese rol en el torneo');
    }
    // An invite also settles a pending request for the same role
    if (existing) {
      return this.prisma.membership.update({
        where: { id: existing.id },
        data: { status: 'ACTIVE', teamId, playerId },
        include: this.memberInclude(true),
      });
    }
    return this.prisma.membership.create({
      data: {
        userId: invitee.id,
        tournamentId,
        role: dto.role,
        teamId,
        playerId,
        status: 'ACTIVE',
      },
      include: this.memberInclude(true),
    });
  }

  /** Admins see pending requests and emails; everyone else sees the active staff. */
  async list(user: AuthUser | undefined, tournamentId: string) {
    await this.assertTournament(tournamentId);
    const isAdmin =
      user !== undefined && (await this.access.hasRole(user.id, tournamentId, 'ADMIN'));
    return this.prisma.membership.findMany({
      where: { tournamentId, ...(isAdmin ? {} : { status: 'ACTIVE' }) },
      orderBy: [{ status: 'asc' }, { role: 'asc' }, { createdAt: 'asc' }],
      include: this.memberInclude(isAdmin),
    });
  }

  async approve(user: AuthUser | undefined, id: string, dto: ApproveMembershipDto) {
    const membership = await this.find(id);
    await this.access.requireAdmin(user, membership.tournamentId);
    if (membership.status === 'ACTIVE') {
      throw new ConflictException('Esta solicitud ya fue aprobada');
    }
    const playerId = await this.playerFor(membership.role, membership.teamId, dto.playerId);
    return this.prisma.membership.update({
      where: { id },
      data: { status: 'ACTIVE', playerId },
      include: this.memberInclude(true),
    });
  }

  /** Admins reject requests or remove members; members may leave on their own. */
  async remove(user: AuthUser | undefined, id: string) {
    const { id: userId } = this.access.signedIn(user);
    const membership = await this.find(id);
    const isSelf = membership.userId === userId;
    if (!isSelf) await this.access.requireAdmin(user, membership.tournamentId);

    if (membership.role === 'ADMIN' && membership.status === 'ACTIVE') {
      const admins = await this.prisma.membership.count({
        where: { tournamentId: membership.tournamentId, role: 'ADMIN', status: 'ACTIVE' },
      });
      if (admins <= 1) {
        throw new ForbiddenException('El torneo necesita al menos un administrador');
      }
    }
    await this.prisma.membership.delete({ where: { id } });
  }

  private memberInclude(withEmail: boolean) {
    return {
      user: { select: { id: true, name: true, avatarUrl: true, email: withEmail } },
      team: { select: { id: true, name: true } },
      player: { select: { id: true, name: true, number: true } },
    } as const;
  }

  private async find(id: string) {
    const membership = await this.prisma.membership.findUnique({ where: { id } });
    if (!membership) throw new NotFoundException('Membership not found');
    return membership;
  }

  private async assertTournament(tournamentId: string) {
    const exists = await this.prisma.tournament.findUnique({
      where: { id: tournamentId },
      select: { id: true },
    });
    if (!exists) throw new NotFoundException('Tournament not found');
  }

  private async assertNotMember(userId: string, tournamentId: string, role: Role) {
    const existing = await this.prisma.membership.findUnique({
      where: { userId_tournamentId_role: { userId, tournamentId, role } },
    });
    if (existing?.status === 'PENDING') {
      throw new ConflictException('Ya enviaste esta solicitud; espera a que el administrador la apruebe');
    }
    if (existing) throw new ConflictException('Ya tienes ese rol en el torneo');
  }

  /** Coaches and players belong to a team of this tournament; other roles don't. */
  private async teamFor(tournamentId: string, role: Role, teamId?: string) {
    if (!TEAM_ROLES.includes(role)) return null;
    if (!teamId) throw new BadRequestException('Elige el equipo');
    const team = await this.prisma.team.findUnique({ where: { id: teamId } });
    if (!team || team.tournamentId !== tournamentId) {
      throw new BadRequestException('Ese equipo no es de este torneo');
    }
    return teamId;
  }

  private async playerFor(role: Role, teamId: string | null, playerId?: string) {
    if (!playerId) return null;
    if (role !== 'PLAYER') {
      throw new BadRequestException('Solo un jugador se vincula a la plantilla');
    }
    const player = await this.prisma.player.findUnique({
      where: { id: playerId },
      include: { membership: { select: { id: true } } },
    });
    if (!player || player.teamId !== teamId) {
      throw new BadRequestException('Ese jugador no está en el equipo elegido');
    }
    if (player.membership) {
      throw new ConflictException('Ese jugador ya está vinculado a otra cuenta');
    }
    return playerId;
  }
}
