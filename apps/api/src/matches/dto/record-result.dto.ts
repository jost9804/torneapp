import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsOptional,
  IsUUID,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

export class GoalDto {
  @IsUUID()
  playerId: string;

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
}
