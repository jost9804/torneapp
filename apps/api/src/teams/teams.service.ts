import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTeamDto } from './dto/create-team.dto';

@Injectable()
export class TeamsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(tournamentId: string, dto: CreateTeamDto) {
    const tournament = await this.prisma.tournament.findUnique({
      where: { id: tournamentId },
      include: { _count: { select: { matches: true } } },
    });
    if (!tournament) throw new NotFoundException('Tournament not found');
    if (tournament._count.matches > 0) {
      throw new ConflictException(
        'Cannot add teams after the fixture has been generated',
      );
    }
    const existing = await this.prisma.team.findUnique({
      where: { tournamentId_name: { tournamentId, name: dto.name } },
    });
    if (existing) {
      throw new ConflictException('A team with this name already exists');
    }
    return this.prisma.team.create({ data: { ...dto, tournamentId } });
  }

  findByTournament(tournamentId: string) {
    return this.prisma.team.findMany({
      where: { tournamentId },
      orderBy: { name: 'asc' },
      include: { players: { orderBy: { number: 'asc' } } },
    });
  }

  async remove(id: string) {
    const team = await this.prisma.team.findUnique({
      where: { id },
      include: { tournament: { include: { _count: { select: { matches: true } } } } },
    });
    if (!team) throw new NotFoundException('Team not found');
    if (team.tournament._count.matches > 0) {
      throw new ConflictException(
        'Cannot remove teams after the fixture has been generated',
      );
    }
    await this.prisma.team.delete({ where: { id } });
  }
}
