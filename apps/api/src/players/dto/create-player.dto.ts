import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreatePlayerDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  name: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(99)
  number?: number;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  position?: string;
}
