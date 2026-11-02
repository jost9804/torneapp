import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AccessService } from '../access/access.service';
import type { AuthUser } from '../auth/auth.guard';
import { PrismaService } from '../prisma/prisma.service';
import { AssignRefereeDto, RecordResultDto } from './dto/record-result.dto';

const PLAYER_REF = { select: { id: true, name: true, teamId: true } } as const;

@Injectable()
export class MatchesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: AccessService,
  ) {}

  /** The admin or the referee assigned to this match files the report. */
  async recordResult(user: AuthUser | undefined, matchId: string, dto: RecordResultDto) {
    const { id: userId } = this.access.signedIn(user);
    const match = await this.prisma.match.findUnique({
      where: { id: matchId },
    });
    if (!match) throw new NotFoundException('Match not found');

    const isAdmin = await this.access.hasRole(userId, match.tournamentId, 'ADMIN');
    const isAssignedReferee =
      match.refereeId === userId &&
      (await this.access.hasRole(userId, match.tournamentId, 'REFEREE'));
    if (!isAdmin && !isAssignedReferee) {
      throw new ForbiddenException(
        'Solo el árbitro asignado o el administrador pueden registrar este partido',
      );
    }

    const goals = dto.goals ?? [];
    const cards = dto.cards ?? [];
    if (goals.length > dto.homeScore + dto.awayScore) {
      throw new BadRequestException(
        'More goal scorers than goals in the final score',
      );
    }
    await this.assertPlayersInMatch(
      [...goals, ...cards].map((entry) => entry.playerId),
      match,
    );

    const observations = dto.observations?.trim() || null;
    const [updated] = await this.prisma.$transaction([
      this.prisma.match.update({
        where: { id: matchId },
        data: {
          homeScore: dto.homeScore,
          awayScore: dto.awayScore,
          status: 'PLAYED',
          observations,
        },
      }),
      this.prisma.goal.deleteMany({ where: { matchId } }),
      this.prisma.card.deleteMany({ where: { matchId } }),
      ...(goals.length > 0
        ? [
            this.prisma.goal.createMany({
              data: goals.map((g) => ({ ...g, matchId })),
            }),
          ]
        : []),
      ...(cards.length > 0
        ? [
            this.prisma.card.createMany({
              data: cards.map((c) => ({ ...c, matchId })),
            }),
          ]
        : []),
    ]);

    return this.findOne(updated.id);
  }

  async assignReferee(user: AuthUser | undefined, matchId: string, dto: AssignRefereeDto) {
    const match = await this.prisma.match.findUnique({ where: { id: matchId } });
    if (!match) throw new NotFoundException('Match not found');
    await this.access.requireAdmin(user, match.tournamentId);

    const refereeId = dto.refereeId ?? null;
    if (
      refereeId &&
      !(await this.access.hasRole(refereeId, match.tournamentId, 'REFEREE'))
    ) {
      throw new BadRequestException('Esa persona no es árbitro de este torneo');
    }
    await this.prisma.match.update({ where: { id: matchId }, data: { refereeId } });
    return this.findOne(matchId);
  }

  private findOne(id: string) {
    return this.prisma.match.findUnique({
      where: { id },
      include: {
        homeTeam: { select: { id: true, name: true, crestUrl: true } },
        awayTeam: { select: { id: true, name: true, crestUrl: true } },
        goals: { include: { player: PLAYER_REF }, orderBy: { minute: 'asc' } },
        cards: { include: { player: PLAYER_REF }, orderBy: { minute: 'asc' } },
        referee: { select: { id: true, name: true } },
      },
    });
  }

  private async assertPlayersInMatch(
    playerIds: string[],
    match: { homeTeamId: string; awayTeamId: string },
  ) {
    if (playerIds.length === 0) return;
    const players = await this.prisma.player.findMany({
      where: { id: { in: playerIds } },
      select: { id: true, teamId: true },
    });
    const found = new Map(players.map((p) => [p.id, p.teamId]));
    for (const playerId of playerIds) {
      const teamId = found.get(playerId);
      if (!teamId || (teamId !== match.homeTeamId && teamId !== match.awayTeamId)) {
        throw new BadRequestException(`Player ${playerId} does not play in this match`);
      }
    }
  }
}
