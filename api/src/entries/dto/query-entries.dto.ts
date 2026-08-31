import { IsOptional, IsString, Matches } from 'class-validator';

export class QueryEntriesDto {
  /** "YYYY-MM" */
  @IsOptional()
  @Matches(/^\d{4}-\d{2}$/, { message: 'month deve estar no formato YYYY-MM' })
  month?: string;

  /** Só ADMIN pode consultar outro usuário */
  @IsOptional()
  @IsString()
  userId?: string;
}

export class SummaryQueryDto {
  @IsOptional()
  @Matches(/^\d{4}$/, { message: 'year deve estar no formato YYYY' })
  year?: string;

  @IsOptional()
  @IsString()
  userId?: string;
}
