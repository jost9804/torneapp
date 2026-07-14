import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTournamentDto } from './dto/create-tournament.dto';
import { UpdateTournamentDto } from './dto/update-tournament.dto';

@Injectable()
export class TournamentsService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateTournamentDto) {
    return this.prisma.tournament.create({ data: dto });
  }

  findAll() {
    return this.prisma.tournament.findMany({
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { teams: true, matches: true } } },
    });
  }

  async findOne(id: string) {
    const tournament = await this.prisma.tournament.findUnique({
      where: { id },
      include: { _count: { select: { teams: true, matches: true } } },
    });
    if (!tournament) throw new NotFoundException('Tournament not found');
    return tournament;
  }

  async update(id: string, dto: UpdateTournamentDto) {
    await this.findOne(id);
    return this.prisma.tournament.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.tournament.delete({ where: { id } });
  }

  async setRulesPdf(id: string, filePath: string) {
    await this.findOne(id);
    return this.prisma.tournament.update({
      where: { id },
      data: { rulesPdfPath: filePath },
    });
  }
}
