import { Injectable, NotFoundException } from '@nestjs/common';
import { AccessService } from '../access/access.service';
import type { AuthUser } from '../auth/auth.guard';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTournamentDto } from './dto/create-tournament.dto';
import { UpdateTournamentDto } from './dto/update-tournament.dto';

const COUNTS = {
  _count: { select: { teams: true, matches: true, likes: true, follows: true } },
} as const;

@Injectable()
export class TournamentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: AccessService,
  ) {}

  /** Whoever creates a tournament becomes its first admin. */
  create(user: AuthUser | undefined, dto: CreateTournamentDto) {
    const { id: userId } = this.access.signedIn(user);
    return this.prisma.tournament.create({
      data: {
        ...dto,
        memberships: { create: { userId, role: 'ADMIN', status: 'ACTIVE' } },
      },
      include: COUNTS,
    });
  }

  async findAll(
    user: AuthUser | undefined,
    { popular = false, following = false }: { popular?: boolean; following?: boolean } = {},
  ) {
    const followerId = following ? this.access.signedIn(user).id : null;
    const tournaments = await this.prisma.tournament.findMany({
      where: followerId ? { follows: { some: { userId: followerId } } } : undefined,
      orderBy: popular
        ? [{ likes: { _count: 'desc' } }, { follows: { _count: 'desc' } }, { createdAt: 'desc' }]
        : { createdAt: 'desc' },
      include: COUNTS,
    });
    return Promise.all(tournaments.map((t) => this.withViewer(t, user)));
  }

  async findOne(id: string, user?: AuthUser) {
    const tournament = await this.prisma.tournament.findUnique({
      where: { id },
      include: COUNTS,
    });
    if (!tournament) throw new NotFoundException('Tournament not found');
    return this.withViewer(tournament, user);
  }

  async update(user: AuthUser | undefined, id: string, dto: UpdateTournamentDto) {
    await this.findOne(id);
    await this.access.requireAdmin(user, id);
    return this.prisma.tournament.update({ where: { id }, data: dto });
  }

  async remove(user: AuthUser | undefined, id: string) {
    await this.findOne(id);
    await this.access.requireAdmin(user, id);
    await this.prisma.tournament.delete({ where: { id } });
  }

  async setRulesPdf(id: string, filePath: string) {
    return this.prisma.tournament.update({
      where: { id },
      data: { rulesPdfPath: filePath },
    });
  }

  async setLike(user: AuthUser | undefined, tournamentId: string, liked: boolean) {
    const { id: userId } = this.access.signedIn(user);
    await this.findOne(tournamentId);
    const key = { userId_tournamentId: { userId, tournamentId } };
    if (liked) {
      await this.prisma.tournamentLike.upsert({
        where: key,
        create: { userId, tournamentId },
        update: {},
      });
    } else {
      await this.prisma.tournamentLike.deleteMany({ where: { userId, tournamentId } });
    }
    return this.findOne(tournamentId, user);
  }

  async setFollow(user: AuthUser | undefined, tournamentId: string, followed: boolean) {
    const { id: userId } = this.access.signedIn(user);
    await this.findOne(tournamentId);
    const key = { userId_tournamentId: { userId, tournamentId } };
    if (followed) {
      await this.prisma.tournamentFollow.upsert({
        where: key,
        create: { userId, tournamentId },
        update: {},
      });
    } else {
      await this.prisma.tournamentFollow.deleteMany({ where: { userId, tournamentId } });
    }
    return this.findOne(tournamentId, user);
  }

  /** Adds what the signed-in user has done with this tournament and their roles in it. */
  private async withViewer<T extends { id: string }>(tournament: T, user?: AuthUser) {
    if (!user) return { ...tournament, viewer: null };
    const [like, follow, memberships] = await Promise.all([
      this.prisma.tournamentLike.findUnique({
        where: { userId_tournamentId: { userId: user.id, tournamentId: tournament.id } },
      }),
      this.prisma.tournamentFollow.findUnique({
        where: { userId_tournamentId: { userId: user.id, tournamentId: tournament.id } },
      }),
      this.prisma.membership.findMany({
        where: { userId: user.id, tournamentId: tournament.id },
        select: { id: true, role: true, status: true, teamId: true, playerId: true },
      }),
    ]);
    return {
      ...tournament,
      viewer: { liked: like !== null, followed: follow !== null, memberships },
    };
  }
}
