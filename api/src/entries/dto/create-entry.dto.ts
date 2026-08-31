import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { EntryStatus } from '@prisma/client';

export class CreateEntryDto {
  /** ISO date, ex: "2026-08-27" */
  @IsDateString()
  date: string;

  @IsInt()
  @Min(1)
  @Max(24 * 60)
  minutes: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsEnum(EntryStatus)
  status?: EntryStatus;
}
