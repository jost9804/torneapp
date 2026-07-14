import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RecordResultDto } from './dto/record-result.dto';

@Injectable()
export class MatchesService {
  constructor(private readonly prisma: PrismaService) {}

  async recordResult(matchId: string, dto: RecordResultDto) {
    const match = await this.prisma.match.findUnique({
      where: { id: matchId },
    });
    if (!match) throw new NotFoundException('Match not found');

    const goals = dto.goals ?? [];
    if (goals.length > dto.homeScore + dto.awayScore) {
      throw new BadRequestException(
        'More goal scorers than goals in the final score',
      );
    }
    if (goals.length > 0) {
      const players = await this.prisma.player.findMany({
        where: { id: { in: goals.map((g) => g.playerId) } },
        select: { id: true, teamId: true },
      });
      const found = new Map(players.map((p) => [p.id, p.teamId]));
      for (const goal of goals) {
        const teamId = found.get(goal.playerId);
        if (!teamId || (teamId !== match.homeTeamId && teamId !== match.awayTeamId)) {
          throw new BadRequestException(
            `Player ${goal.playerId} does not play in this match`,
          );
        }
      }
    }

    const [updated] = await this.prisma.$transaction([
      this.prisma.match.update({
        where: { id: matchId },
        data: {
          homeScore: dto.homeScore,
          awayScore: dto.awayScore,
          status: 'PLAYED',
        },
      }),
      this.prisma.goal.deleteMany({ where: { matchId } }),
      ...(goals.length > 0
        ? [
            this.prisma.goal.createMany({
              data: goals.map((g) => ({ ...g, matchId })),
            }),
          ]
        : []),
    ]);

    return this.prisma.match.findUnique({
      where: { id: updated.id },
      include: {
        homeTeam: { select: { id: true, name: true } },
        awayTeam: { select: { id: true, name: true } },
        goals: { include: { player: { select: { id: true, name: true, teamId: true } } } },
      },
    });
  }
}
