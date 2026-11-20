import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AccessService } from '../access/access.service';
import type { AuthUser } from '../auth/auth.guard';
import { releaseImage } from '../images/images';
import { PrismaService } from '../prisma/prisma.service';

/**
 * A `Team` is a club's entry in one tournament. Tournament admins add clubs directly;
 * club admins ask to enter and wait for the tournament admin's approval.
 */
@Injectable()
export class TeamsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: AccessService,
  ) {}

  async enter(
    user: AuthUser | undefined,
    tournamentId: string,
    clubId: string,
  ) {
    const { id: userId } = this.access.signedIn(user);
    await this.openForEntries(tournamentId);
    const club = await this.prisma.club.findUnique({ where: { id: clubId } });
    if (!club) throw new NotFoundException('Team not found');
    const already = await this.prisma.team.findFirst({
      where: { tournamentId, clubId },
    });
    if (already) throw new ConflictException('Ese equipo ya está en el torneo');

    if (await this.access.hasRole(userId, tournamentId, 'ADMIN')) {
      return {
        team: await this.createEntry(tournamentId, clubId),
        request: null,
      };
    }
    await this.access.requireClubAdmin(user, clubId);
    const pending = await this.prisma.entryRequest.findUnique({
      where: { clubId_tournamentId: { clubId, tournamentId } },
    });
    if (pending)
      throw new ConflictException(
        'Ya pediste inscribir este equipo; espera la respuesta',
      );
    const request = await this.prisma.entryRequest.create({
      data: { clubId, tournamentId, requestedById: userId },
    });
    return { team: null, request };
  }

  /** Tournament admins see every request; club admins see the ones for their clubs. */
  async requests(user: AuthUser | undefined, tournamentId: string) {
    const { id: userId } = this.access.signedIn(user);
    const isAdmin = await this.access.hasRole(userId, tournamentId, 'ADMIN');
    return this.prisma.entryRequest.findMany({
      where: {
        tournamentId,
        ...(isAdmin
          ? {}
          : {
              club: {
                members: { some: { userId, role: { in: ['OWNER', 'ADMIN'] } } },
              },
            }),
      },
      orderBy: { createdAt: 'asc' },
      include: {
        club: { select: { id: true, name: true, crestUrl: true } },
        requestedBy: { select: { id: true, name: true } },
      },
    });
  }

  async approve(user: AuthUser | undefined, requestId: string) {
    const request = await this.prisma.entryRequest.findUnique({
      where: { id: requestId },
    });
    if (!request) throw new NotFoundException('Request not found');
    await this.access.requireAdmin(user, request.tournamentId);
    await this.openForEntries(request.tournamentId);
    // Creating the entry also clears this request
    return this.createEntry(request.tournamentId, request.clubId);
  }

  /** The tournament admin rejects; a club admin withdraws. */
  async dismiss(user: AuthUser | undefined, requestId: string) {
    const { id: userId } = this.access.signedIn(user);
    const request = await this.prisma.entryRequest.findUnique({
      where: { id: requestId },
    });
    if (!request) throw new NotFoundException('Request not found');
    const isTournamentAdmin = await this.access.hasRole(
      userId,
      request.tournamentId,
      'ADMIN',
    );
    if (!isTournamentAdmin) {
      const roles = await this.access.clubRoles(userId, request.clubId);
      if (!roles.includes('OWNER') && !roles.includes('ADMIN')) {
        throw new ForbiddenException('No puedes cancelar esta solicitud');
      }
    }
    await this.prisma.entryRequest.delete({ where: { id: requestId } });
  }

  findByTournament(tournamentId: string) {
    return this.prisma.team.findMany({
      where: { tournamentId },
      orderBy: { name: 'asc' },
      include: { players: { orderBy: { number: 'asc' } } },
    });
  }

  async remove(user: AuthUser | undefined, id: string) {
    const team = await this.prisma.team.findUnique({
      where: { id },
      include: {
        tournament: { include: { _count: { select: { matches: true } } } },
      },
    });
    if (!team) throw new NotFoundException('Team not found');
    await this.access.requireAdmin(user, team.tournamentId);
    if (team.tournament._count.matches > 0) {
      throw new ConflictException(
        'Cannot remove teams after the fixture has been generated',
      );
    }
    await this.prisma.team.delete({ where: { id } });
    await releaseImage(this.prisma, team.crestUrl);
  }

  /** Teams can join until the fixture exists. */
  private async openForEntries(tournamentId: string) {
    const tournament = await this.prisma.tournament.findUnique({
      where: { id: tournamentId },
      include: { _count: { select: { matches: true } } },
    });
    if (!tournament) throw new NotFoundException('Tournament not found');
    if (tournament._count.matches > 0) {
      throw new ConflictException(
        'El calendario ya está generado; no se pueden agregar equipos',
      );
    }
  }

  /** Copies the club's name, crest and usual squad into the tournament. */
  private async createEntry(tournamentId: string, clubId: string) {
    const club = await this.prisma.club.findUniqueOrThrow({
      where: { id: clubId },
      include: { players: true },
    });
    const sameName = await this.prisma.team.findUnique({
      where: { tournamentId_name: { tournamentId, name: club.name } },
    });
    if (sameName) {
      throw new ConflictException(
        'Ya hay un equipo con ese nombre en el torneo',
      );
    }
    // A pending request for the same club is settled by the direct entry
    await this.prisma.entryRequest.deleteMany({
      where: { tournamentId, clubId },
    });
    return this.prisma.team.create({
      data: {
        tournamentId,
        clubId,
        name: club.name,
        crestUrl: club.crestUrl,
        players: {
          create: club.players.map(({ name, number, position }) => ({
            name,
            number,
            position,
          })),
        },
      },
      include: { players: true },
    });
  }
}
