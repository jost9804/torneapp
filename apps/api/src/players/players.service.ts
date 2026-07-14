import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePlayerDto } from './dto/create-player.dto';

@Injectable()
export class PlayersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(teamId: string, dto: CreatePlayerDto) {
    const team = await this.prisma.team.findUnique({ where: { id: teamId } });
    if (!team) throw new NotFoundException('Team not found');
    return this.prisma.player.create({ data: { ...dto, teamId } });
  }

  findByTeam(teamId: string) {
    return this.prisma.player.findMany({
      where: { teamId },
      orderBy: [{ number: 'asc' }, { name: 'asc' }],
    });
  }

  async remove(id: string) {
    const player = await this.prisma.player.findUnique({ where: { id } });
    if (!player) throw new NotFoundException('Player not found');
    await this.prisma.player.delete({ where: { id } });
  }
}
