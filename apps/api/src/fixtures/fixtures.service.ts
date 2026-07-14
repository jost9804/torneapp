import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { generateRoundRobin } from './round-robin';

@Injectable()
export class FixturesService {
  constructor(private readonly prisma: PrismaService) {}

  async generate(tournamentId: string) {
    const tournament = await this.prisma.tournament.findUnique({
      where: { id: tournamentId },
      include: { teams: true, _count: { select: { matches: true } } },
    });
    if (!tournament) throw new NotFoundException('Tournament not found');
    if (tournament._count.matches > 0) {
      throw new ConflictException('Fixture already generated');
    }
    if (tournament.teams.length < 2) {
      throw new UnprocessableEntityException(
        'At least 2 teams are required to generate a fixture',
      );
    }

    const pairings = generateRoundRobin(
      tournament.teams.map((t) => t.id),
      tournament.format === 'ROUND_ROBIN_HOME_AWAY',
    );

    await this.prisma.$transaction([
      this.prisma.match.createMany({
        data: pairings.map((p) => ({ ...p, tournamentId })),
      }),
      this.prisma.tournament.update({
        where: { id: tournamentId },
        data: { status: 'ACTIVE' },
      }),
    ]);

    return this.findByTournament(tournamentId);
  }

  findByTournament(tournamentId: string) {
    return this.prisma.match.findMany({
      where: { tournamentId },
      orderBy: [{ round: 'asc' }, { id: 'asc' }],
      include: {
        homeTeam: { select: { id: true, name: true, crestUrl: true } },
        awayTeam: { select: { id: true, name: true, crestUrl: true } },
        goals: {
          include: { player: { select: { id: true, name: true, teamId: true } } },
          orderBy: { minute: 'asc' },
        },
      },
    });
  }
}
