import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreatePartnerSoutienQrCodeDto {
  @ApiPropertyOptional({ description: 'Libellé interne' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  label?: string;

  @ApiPropertyOptional({ description: 'Partenaire associé (optionnel)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  partnerId?: number;
}

export class UpdatePartnerSoutienQrCodeDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  label?: string;
}
