import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import type { ClubRole } from '../../generated/prisma/enums';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class ClubNameDto {
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  name: string;
}

/** Roles that can be handed out; OWNER only comes from creating the club. */
export const ASSIGNABLE_CLUB_ROLES = [
  'ADMIN',
  'COACH',
  'SPOKESPERSON',
  'CAPTAIN',
] as const;

export class AddClubMemberDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail()
  email: string;

  @IsIn(ASSIGNABLE_CLUB_ROLES)
  role: Exclude<ClubRole, 'OWNER'>;
}

export class EnterTournamentDto {
  @IsUUID()
  clubId: string;
}
