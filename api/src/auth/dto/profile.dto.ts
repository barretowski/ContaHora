import {
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name?: string;

  /** data URL (foto redimensionada) ou URL http(s); string vazia remove a foto */
  @IsOptional()
  @IsString()
  @MaxLength(300_000)
  avatarUrl?: string;
}

export class ChangePasswordDto {
  /** obrigatório apenas se a conta já tiver senha */
  @IsOptional()
  @IsString()
  currentPassword?: string;

  @IsString()
  @MinLength(6)
  @MaxLength(100)
  newPassword: string;
}
