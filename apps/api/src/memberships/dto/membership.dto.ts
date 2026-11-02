import { Transform } from 'class-transformer';
import { IsEmail, IsIn, IsOptional, IsUUID } from 'class-validator';
import { Role } from '../../generated/prisma/enums';

/** Roles a user may ask for; ADMIN is only ever granted by another admin. */
export const REQUESTABLE_ROLES = [Role.REFEREE, Role.COACH, Role.PLAYER] as const;

export class JoinTournamentDto {
  @IsIn(REQUESTABLE_ROLES, { message: 'Elige árbitro, técnico o jugador' })
  role: (typeof REQUESTABLE_ROLES)[number];

  /** Required for coaches and players */
  @IsOptional()
  @IsUUID()
  teamId?: string;
}

export class InviteMemberDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail({}, { message: 'Escribe un correo válido' })
  email: string;

  @IsIn(Object.values(Role), { message: 'Rol no válido' })
  role: Role;

  @IsOptional()
  @IsUUID()
  teamId?: string;

  /** Links a player account to an existing roster entry */
  @IsOptional()
  @IsUUID()
  playerId?: string;
}

export class ApproveMembershipDto {
  @IsOptional()
  @IsUUID()
  playerId?: string;
}
