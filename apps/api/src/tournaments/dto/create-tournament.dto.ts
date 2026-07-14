import { IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { TournamentFormat } from '../../generated/prisma/enums';

export class CreateTournamentDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  name: string;

  @IsOptional()
  @IsEnum(TournamentFormat)
  format?: TournamentFormat;
}
