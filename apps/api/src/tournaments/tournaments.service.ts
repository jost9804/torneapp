import { Injectable, NotFoundException } from '@nestjs/common';
import { AccessService } from '../access/access.service';
import type { AuthUser } from '../auth/auth.guard';
import { releaseImage, saveImage } from '../images/images';
import { PrismaService } from '../prisma/prisma.service';
import { StandingsService } from '../standings/standings.service';
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
    private readonly standings: StandingsService,
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
    const previous = await this.findOne(id);
    await this.access.requireAdmin(user, id);
    const updated = await this.prisma.tournament.update({ where: { id }, data: dto });
    if (dto.status && dto.status !== previous.status) {
      await this.recordFinalPositions(id, dto.status === 'FINISHED');
    }
    return updated;
  }

  /**
   * Finishing a tournament writes each team's place into its club's history;
   * reopening it clears them so the table is live again.
   */
  private async recordFinalPositions(id: string, finished: boolean) {
    if (!finished) {
      await this.prisma.team.updateMany({ where: { tournamentId: id }, data: { finalPosition: null } });
      return;
    }
    const table = await this.standings.standings(id);
    await this.prisma.$transaction(
      table.map((row, index) =>
        this.prisma.team.update({ where: { id: row.teamId }, data: { finalPosition: index + 1 } }),
      ),
    );
  }

  async remove(user: AuthUser | undefined, id: string) {
    await this.findOne(id);
    await this.access.requireAdmin(user, id);
    const deleted = await this.prisma.tournament.delete({
      where: { id },
      include: { teams: { select: { crestUrl: true } } },
    });
    await Promise.all(
      [deleted.imageUrl, ...deleted.teams.map((t) => t.crestUrl)].map((path) =>
        releaseImage(this.prisma, path),
      ),
    );
  }

  /** Replaces the tournament's picture; only its admins may. */
  async setImage(user: AuthUser | undefined, id: string, file: Express.Multer.File | undefined) {
    const previous = await this.findOne(id);
    await this.access.requireAdmin(user, id);
    const imageUrl = await saveImage(file, id);
    await this.prisma.tournament.update({ where: { id }, data: { imageUrl } });
    await releaseImage(this.prisma, previous.imageUrl);
    return this.findOne(id, user);
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
