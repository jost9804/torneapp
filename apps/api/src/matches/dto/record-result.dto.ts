import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { CardType } from '../../generated/prisma/enums';

export class GoalDto {
  @IsUUID()
  playerId: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(130)
  minute?: number;
}

export class CardDto {
  @IsUUID()
  playerId: string;

  @IsEnum(CardType)
  type: CardType;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(130)
  minute?: number;
}

export class RecordResultDto {
  @IsInt()
  @Min(0)
  @Max(99)
  homeScore: number;

  @IsInt()
  @Min(0)
  @Max(99)
  awayScore: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GoalDto)
  goals?: GoalDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CardDto)
  cards?: CardDto[];

  /** Referee's notes: incidents, injuries, conduct */
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  observations?: string;
}

export class AssignRefereeDto {
  /** null removes the referee */
  @IsOptional()
  @IsUUID()
  refereeId: string | null;
}
