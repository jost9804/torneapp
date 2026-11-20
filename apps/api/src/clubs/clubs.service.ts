import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AccessService } from '../access/access.service';
import type { AuthUser } from '../auth/auth.guard';
import type { ClubRole } from '../generated/prisma/client';
import { releaseImage, saveImage } from '../images/images';
import { CreatePlayerDto } from '../players/dto/create-player.dto';
import { PrismaService } from '../prisma/prisma.service';
import { StandingsService } from '../standings/standings.service';
import { AddClubMemberDto } from './dto/club.dto';

/** How long a club keeps its name before it may change it again */
export const NAME_LOCK_MONTHS = 6;
const MAX_EXTRA_ADMINS = 2;
/** Roles held by one person at a time */
const SINGLE_ROLES: ClubRole[] = ['COACH', 'SPOKESPERSON', 'CAPTAIN'];

export function nameChangeAvailableAt(nameChangedAt: Date) {
  const date = new Date(nameChangedAt);
  date.setMonth(date.getMonth() + NAME_LOCK_MONTHS);
  return date;
}

const MEMBER_SELECT = {
  id: true,
  role: true,
  user: { select: { id: true, name: true, avatarUrl: true } },
} as const;

@Injectable()
export class ClubsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: AccessService,
    private readonly standings: StandingsService,
  ) {}

  /** The creator becomes the club's owner. */
  async create(user: AuthUser | undefined, name: string) {
    const { id: userId } = this.access.signedIn(user);
    const club = await this.prisma.club.create({
      data: { name, members: { create: { userId, role: 'OWNER' } } },
    });
    return this.findOne(club.id, user);
  }

  /** Clubs the user belongs to, or a name search for entering tournaments. */
  async list(
    user: AuthUser | undefined,
    { mine, q }: { mine?: boolean; q?: string },
  ) {
    if (mine) {
      const { id: userId } = this.access.signedIn(user);
      return this.prisma.club.findMany({
        where: { members: { some: { userId } } },
        orderBy: { name: 'asc' },
        include: {
          members: { where: { userId }, select: { role: true } },
          _count: { select: { entries: true } },
        },
      });
    }
    const query = q?.trim();
    if (!query || query.length < 2) return [];
    return this.prisma.club.findMany({
      where: { name: { contains: query, mode: 'insensitive' } },
      orderBy: { name: 'asc' },
      take: 20,
      include: { _count: { select: { entries: true } } },
    });
  }

  async findOne(id: string, user?: AuthUser) {
    const club = await this.prisma.club.findUnique({
      where: { id },
      include: {
        members: { select: MEMBER_SELECT, orderBy: { createdAt: 'asc' } },
        players: { orderBy: [{ number: 'asc' }, { name: 'asc' }] },
      },
    });
    if (!club) throw new NotFoundException('Team not found');
    const viewerRoles = user
      ? club.members.filter((m) => m.user.id === user.id).map((m) => m.role)
      : [];
    return {
      ...club,
      nameChangeAvailableAt: nameChangeAvailableAt(club.nameChangedAt),
      viewerRoles,
    };
  }

  /** Every tournament the club entered, newest first, with its position in each. */
  async history(id: string) {
    const club = await this.prisma.club.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!club) throw new NotFoundException('Team not found');
    const entries = await this.prisma.team.findMany({
      where: { clubId: id },
      orderBy: { tournament: { createdAt: 'desc' } },
      include: {
        tournament: {
          select: {
            id: true,
            name: true,
            status: true,
            imageUrl: true,
            createdAt: true,
            _count: { select: { teams: true } },
          },
        },
      },
    });
    return Promise.all(
      entries.map(async (entry) => {
        let position = entry.finalPosition;
        // Positions are saved when a tournament finishes; until then they come from the table
        if (position === null && entry.tournament.status !== 'DRAFT') {
          const table = await this.standings.standings(entry.tournamentId);
          const index = table.findIndex((row) => row.teamId === entry.id);
          position = index >= 0 ? index + 1 : null;
        }
        return {
          teamId: entry.id,
          teamName: entry.name,
          crestUrl: entry.crestUrl,
          position,
          tournament: {
            id: entry.tournament.id,
            name: entry.tournament.name,
            status: entry.tournament.status,
            imageUrl: entry.tournament.imageUrl,
            createdAt: entry.tournament.createdAt,
            teams: entry.tournament._count.teams,
          },
        };
      }),
    );
  }

  /** A new name is allowed 6 months after creation or the last rename. */
  async rename(user: AuthUser | undefined, id: string, name: string) {
    await this.access.requireClubAdmin(user, id);
    const club = await this.prisma.club.findUniqueOrThrow({ where: { id } });
    if (name === club.name) return this.findOne(id, user);
    const availableAt = nameChangeAvailableAt(club.nameChangedAt);
    if (availableAt > new Date()) {
      throw new ConflictException(
        `El nombre solo se puede cambiar cada ${NAME_LOCK_MONTHS} meses. Podrás cambiarlo desde el ${availableAt.toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'America/Bogota' })}.`,
      );
    }
    await this.prisma.$transaction([
      this.prisma.club.update({
        where: { id },
        data: { name, nameChangedAt: new Date() },
      }),
      // Tournaments still running follow the new name; finished ones keep the old one
      this.prisma.team.updateMany({
        where: { clubId: id, tournament: { status: { not: 'FINISHED' } } },
        data: { name },
      }),
    ]);
    return this.findOne(id, user);
  }

  async setCrest(
    user: AuthUser | undefined,
    id: string,
    file: Express.Multer.File | undefined,
  ) {
    await this.access.requireClubAdmin(user, id);
    const club = await this.prisma.club.findUniqueOrThrow({ where: { id } });
    const crestUrl = await saveImage(file, id);
    await this.prisma.$transaction([
      this.prisma.club.update({ where: { id }, data: { crestUrl } }),
      this.prisma.team.updateMany({
        where: { clubId: id, tournament: { status: { not: 'FINISHED' } } },
        data: { crestUrl },
      }),
    ]);
    await releaseImage(this.prisma, club.crestUrl);
    return this.findOne(id, user);
  }

  /** Only the owner may delete, and only a club that never entered a tournament. */
  async remove(user: AuthUser | undefined, id: string) {
    const roles = await this.access.requireClubAdmin(user, id);
    if (!roles.includes('OWNER')) {
      throw new ForbiddenException(
        'Solo el creador del equipo puede eliminarlo',
      );
    }
    const entries = await this.prisma.team.count({ where: { clubId: id } });
    if (entries > 0) {
      throw new ConflictException(
        'El equipo ya jugó torneos; su historial no se puede borrar',
      );
    }
    const club = await this.prisma.club.delete({ where: { id } });
    await releaseImage(this.prisma, club.crestUrl);
  }

  /**
   * The owner names up to 2 more admins; any admin hands out coach, spokesperson and
   * captain, one person each.
   */
  async addMember(
    user: AuthUser | undefined,
    id: string,
    dto: AddClubMemberDto,
  ) {
    const roles = await this.access.requireClubAdmin(user, id);
    if (dto.role === 'ADMIN' && !roles.includes('OWNER')) {
      throw new ForbiddenException(
        'Solo el creador del equipo puede nombrar administradores',
      );
    }
    const invitee = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (!invitee) {
      throw new NotFoundException(
        'No hay ninguna cuenta con ese correo. Pídele que se registre primero.',
      );
    }
    if (dto.role === 'ADMIN') {
      const isOwner = await this.prisma.clubMember.count({
        where: { clubId: id, userId: invitee.id, role: 'OWNER' },
      });
      if (isOwner)
        throw new BadRequestException('El creador ya administra el equipo');
      const admins = await this.prisma.clubMember.count({
        where: { clubId: id, role: 'ADMIN' },
      });
      if (admins >= MAX_EXTRA_ADMINS) {
        throw new ConflictException(
          `El equipo ya tiene ${MAX_EXTRA_ADMINS} administradores además del creador`,
        );
      }
    }
    if (SINGLE_ROLES.includes(dto.role)) {
      const holder = await this.prisma.clubMember.findFirst({
        where: { clubId: id, role: dto.role },
      });
      if (holder) {
        throw new ConflictException(
          'Ese rol ya está asignado. Quítaselo primero a quien lo tiene.',
        );
      }
    }
    const existing = await this.prisma.clubMember.findUnique({
      where: {
        clubId_userId_role: { clubId: id, userId: invitee.id, role: dto.role },
      },
    });
    if (existing) throw new ConflictException('Esa persona ya tiene ese rol');
    await this.prisma.clubMember.create({
      data: { clubId: id, userId: invitee.id, role: dto.role },
    });
    return this.findOne(id, user);
  }

  /** Admins remove roles; only the owner removes admins; anyone may leave a role. */
  async removeMember(user: AuthUser | undefined, memberId: string) {
    const { id: userId } = this.access.signedIn(user);
    const member = await this.prisma.clubMember.findUnique({
      where: { id: memberId },
    });
    if (!member) throw new NotFoundException('Member not found');
    if (member.role === 'OWNER') {
      throw new ForbiddenException('El creador del equipo no se puede quitar');
    }
    if (member.userId !== userId) {
      const roles = await this.access.requireClubAdmin(user, member.clubId);
      if (member.role === 'ADMIN' && !roles.includes('OWNER')) {
        throw new ForbiddenException(
          'Solo el creador del equipo puede quitar administradores',
        );
      }
    }
    await this.prisma.clubMember.delete({ where: { id: memberId } });
    return this.findOne(member.clubId, user);
  }

  async addPlayer(
    user: AuthUser | undefined,
    id: string,
    dto: CreatePlayerDto,
  ) {
    await this.access.requireClubAdmin(user, id);
    await this.prisma.clubPlayer.create({ data: { ...dto, clubId: id } });
    return this.findOne(id, user);
  }

  async removePlayer(user: AuthUser | undefined, playerId: string) {
    const player = await this.prisma.clubPlayer.findUnique({
      where: { id: playerId },
    });
    if (!player) throw new NotFoundException('Player not found');
    await this.access.requireClubAdmin(user, player.clubId);
    await this.prisma.clubPlayer.delete({ where: { id: playerId } });
    return this.findOne(player.clubId, user);
  }
}
