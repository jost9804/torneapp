import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AccessService } from '../access/access.service';
import type { AuthUser } from '../auth/auth.guard';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePlayerDto } from './dto/create-player.dto';
import { ReviewPlayerRequestDto, UpdatePlayerDto } from './dto/update-player.dto';

export type AddPlayerResult =
  | { status: 'ADDED'; player: Awaited<ReturnType<PrismaService['player']['create']>> }
  | { status: 'PENDING'; request: Awaited<ReturnType<PrismaService['playerRequest']['create']>> };

@Injectable()
export class PlayersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: AccessService,
  ) {}

  /** Admins add players directly; a team's coach files a request the admin approves. */
  async create(
    user: AuthUser | undefined,
    teamId: string,
    dto: CreatePlayerDto,
  ): Promise<AddPlayerResult> {
    const { id: userId } = this.access.signedIn(user);
    const tournamentId = await this.access.tournamentOfTeam(teamId);

    if (await this.access.hasRole(userId, tournamentId, 'ADMIN')) {
      const player = await this.prisma.player.create({ data: { ...dto, teamId } });
      return { status: 'ADDED', player };
    }
    if (await this.access.isCoachOf(userId, teamId)) {
      const request = await this.prisma.playerRequest.create({
        data: { ...dto, teamId, requestedById: userId },
      });
      return { status: 'PENDING', request };
    }
    throw new ForbiddenException(
      'Solo el administrador o el técnico de este equipo pueden agregar jugadores',
    );
  }

  findByTeam(teamId: string) {
    return this.prisma.player.findMany({
      where: { teamId },
      orderBy: [{ number: 'asc' }, { name: 'asc' }],
    });
  }

  async update(user: AuthUser | undefined, id: string, dto: UpdatePlayerDto) {
    const { id: userId } = this.access.signedIn(user);
    const tournamentId = await this.access.tournamentOfPlayer(id);
    const isAdmin = await this.access.hasRole(userId, tournamentId, 'ADMIN');
    if (!isAdmin) {
      const own = await this.prisma.membership.findFirst({
        where: { userId, playerId: id, role: 'PLAYER', status: 'ACTIVE' },
        select: { id: true },
      });
      if (!own) throw new ForbiddenException('Solo puedes editar tu propio perfil de jugador');
      if (dto.name !== undefined) {
        throw new ForbiddenException('Pide al administrador que corrija tu nombre');
      }
    }
    return this.prisma.player.update({ where: { id }, data: dto });
  }

  async remove(user: AuthUser | undefined, id: string) {
    const tournamentId = await this.access.tournamentOfPlayer(id);
    await this.access.requireAdmin(user, tournamentId);
    await this.prisma.player.delete({ where: { id } });
  }

  /** Admins review every pending request; a coach sees the ones for their team. */
  async listRequests(user: AuthUser | undefined, tournamentId: string) {
    const { id: userId } = this.access.signedIn(user);
    const roles = await this.access.activeRoles(userId, tournamentId);
    const isAdmin = roles.some((m) => m.role === 'ADMIN');
    const coachTeams = roles
      .filter((m) => m.role === 'COACH' && m.teamId)
      .map((m) => m.teamId as string);
    if (!isAdmin && coachTeams.length === 0) {
      throw new ForbiddenException('Solo el administrador o un técnico pueden ver las solicitudes');
    }
    return this.prisma.playerRequest.findMany({
      where: {
        team: { tournamentId },
        ...(isAdmin ? { status: 'PENDING' } : { teamId: { in: coachTeams } }),
      },
      orderBy: { createdAt: 'asc' },
      include: {
        team: { select: { id: true, name: true } },
        requestedBy: { select: { id: true, name: true } },
      },
    });
  }

  async reviewRequest(user: AuthUser | undefined, id: string, dto: ReviewPlayerRequestDto) {
    const request = await this.prisma.playerRequest.findUnique({
      where: { id },
      include: { team: { select: { tournamentId: true } } },
    });
    if (!request) throw new NotFoundException('Player request not found');
    await this.access.requireAdmin(user, request.team.tournamentId);
    if (request.status !== 'PENDING') {
      throw new ConflictException('Esta solicitud ya fue revisada');
    }

    if (dto.decision === 'REJECTED') {
      return this.prisma.playerRequest.update({
        where: { id },
        data: { status: 'REJECTED' },
      });
    }
    const [, player] = await this.prisma.$transaction([
      this.prisma.playerRequest.update({ where: { id }, data: { status: 'APPROVED' } }),
      this.prisma.player.create({
        data: {
          teamId: request.teamId,
          name: request.name,
          number: request.number,
          position: request.position,
        },
      }),
    ]);
    return player;
  }
}
