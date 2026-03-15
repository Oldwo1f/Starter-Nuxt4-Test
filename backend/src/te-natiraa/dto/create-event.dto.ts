import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsDateString, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateTeNatiraaEventDto {
  @ApiProperty({ example: 'Te Natira\'a - Avril 2026' })
  @IsString()
  @MaxLength(255)
  name: string;

  @ApiProperty({ example: '2026-04-11' })
  @IsDateString()
  eventDate: string;

  @ApiPropertyOptional({ example: '8h00', default: '8h00' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  eventTime?: string;

  @ApiProperty({ example: 'Vallée de Tipaerui' })
  @IsString()
  @MaxLength(255)
  location: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Stripe price ID for members. Falls back to env if null.' })
  @IsOptional()
  @IsString()
  stripePriceMemberId?: string | null;

  @ApiPropertyOptional({ description: 'Stripe price ID for public. Falls back to env if null.' })
  @IsOptional()
  @IsString()
  stripePricePublicId?: string | null;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
