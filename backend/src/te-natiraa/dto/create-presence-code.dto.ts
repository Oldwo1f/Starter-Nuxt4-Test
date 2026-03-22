import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateTeNatiraaPresenceCodeDto {
  @ApiPropertyOptional({ description: 'Libellé interne (ex. Entrée principale)' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  label?: string;

  @ApiPropertyOptional({ description: 'Événement Te Natira\'a associé (optionnel)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  eventId?: number;
}

export class UpdateTeNatiraaPresenceCodeDto {
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
