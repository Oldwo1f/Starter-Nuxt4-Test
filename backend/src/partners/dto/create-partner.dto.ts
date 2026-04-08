import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsUrl,
  IsEmail,
  IsBoolean,
  MaxLength,
} from 'class-validator';

const emptyToUndefined = ({ value }: { value: unknown }) =>
  value === '' || value === undefined ? undefined : value;

export class CreatePartnerDto {
  @ApiProperty({
    description: 'Partner name',
    example: 'Partenaire Example',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({
    description: 'Partner website URL',
    example: 'https://example.com',
  })
  @IsString()
  @IsOptional()
  @IsUrl({}, { message: 'Link must be a valid URL' })
  link?: string;

  @ApiPropertyOptional({
    description: 'Contact email',
    example: 'contact@example.com',
  })
  @Transform(emptyToUndefined)
  @IsOptional()
  @IsEmail({}, { message: 'Email must be valid' })
  email?: string;

  @ApiPropertyOptional({
    description: 'Activity / business area',
    example: 'Cultural association',
  })
  @Transform(emptyToUndefined)
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  activity?: string;

  @ApiPropertyOptional({
    description: 'Phone number',
    example: '+689 40 00 00 00',
  })
  @Transform(emptyToUndefined)
  @IsOptional()
  @IsString()
  @MaxLength(64)
  phone?: string;

  @ApiPropertyOptional({
    description: 'Public presentation text',
    example: 'Supports cultural events in Tahiti.',
  })
  @Transform(emptyToUndefined)
  @IsOptional()
  @IsString()
  @MaxLength(10000)
  description?: string;

  @ApiPropertyOptional({
    description: 'Premium partner (highlighted)',
    default: false,
  })
  @Transform(({ value }) => {
    if (value === undefined || value === '' || value === null) return false;
    return value === true || value === 'true';
  })
  @IsBoolean()
  premium?: boolean;
}
