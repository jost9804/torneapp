import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface StandingsRow {
  teamId: string;
  teamName: string;
  crestUrl: string | null;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
}

@Injectable()
export class StandingsService {
  constructor(private readonly prisma: PrismaService) {}

  async standings(tournamentId: string): Promise<StandingsRow[]> {
    const tournament = await this.prisma.tournament.findUnique({
      where: { id: tournamentId },
      include: { teams: true },
    });
    if (!tournament) throw new NotFoundException('Tournament not found');

    const rows = new Map<string, StandingsRow>(
      tournament.teams.map((t) => [
        t.id,
        {
          teamId: t.id,
          teamName: t.name,
          crestUrl: t.crestUrl,
          played: 0,
          won: 0,
          drawn: 0,
          lost: 0,
          goalsFor: 0,
          goalsAgainst: 0,
          goalDifference: 0,
          points: 0,
        },
      ]),
    );

    const matches = await this.prisma.match.findMany({
      where: { tournamentId, status: 'PLAYED' },
    });

    for (const match of matches) {
      const home = rows.get(match.homeTeamId);
      const away = rows.get(match.awayTeamId);
      if (!home || !away || match.homeScore === null || match.awayScore === null) {
        continue;
      }
      home.played++;
      away.played++;
      home.goalsFor += match.homeScore;
      home.goalsAgainst += match.awayScore;
      away.goalsFor += match.awayScore;
      away.goalsAgainst += match.homeScore;

      if (match.homeScore > match.awayScore) {
        home.won++;
        home.points += 3;
        away.lost++;
      } else if (match.homeScore < match.awayScore) {
        away.won++;
        away.points += 3;
        home.lost++;
      } else {
        home.drawn++;
        away.drawn++;
        home.points++;
        away.points++;
      }
    }

    const table = [...rows.values()];
    for (const row of table) {
      row.goalDifference = row.goalsFor - row.goalsAgainst;
    }
    // Tie-breakers: points, goal difference, goals scored, then name
    table.sort(
      (a, b) =>
        b.points - a.points ||
        b.goalDifference - a.goalDifference ||
        b.goalsFor - a.goalsFor ||
        a.teamName.localeCompare(b.teamName),
    );
    return table;
  }

  async topScorers(tournamentId: string) {
    const tournament = await this.prisma.tournament.findUnique({
      where: { id: tournamentId },
    });
    if (!tournament) throw new NotFoundException('Tournament not found');

    const grouped = await this.prisma.goal.groupBy({
      by: ['playerId'],
      where: { match: { tournamentId } },
      _count: { playerId: true },
      orderBy: { _count: { playerId: 'desc' } },
      take: 20,
    });
    if (grouped.length === 0) return [];

    const players = await this.prisma.player.findMany({
      where: { id: { in: grouped.map((g) => g.playerId) } },
      include: { team: { select: { id: true, name: true } } },
    });
    const byId = new Map(players.map((p) => [p.id, p]));

    return grouped.map((g) => {
      const player = byId.get(g.playerId);
      return {
        playerId: g.playerId,
        playerName: player?.name ?? 'Unknown',
        teamId: player?.team.id ?? null,
        teamName: player?.team.name ?? null,
        goals: g._count.playerId,
      };
    });
  }
}
