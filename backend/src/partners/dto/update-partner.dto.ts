import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsString, IsOptional, IsUrl, IsBoolean, IsEmail, MaxLength } from 'class-validator';

const emptyToUndefined = ({ value }: { value: unknown }) =>
  value === '' || value === undefined ? undefined : value;

export class UpdatePartnerDto {
  @ApiPropertyOptional({
    description: 'Partner name',
    example: 'Partenaire Example',
  })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({
    description: 'Partner website URL',
    example: 'https://example.com',
  })
  @IsString()
  @IsOptional()
  @IsUrl({}, { message: 'Link must be a valid URL' })
  link?: string;

  @ApiPropertyOptional({
    description: 'Delete horizontal banner',
    example: false,
  })
  @IsBoolean()
  @IsOptional()
  deleteBannerHorizontal?: boolean;

  @ApiPropertyOptional({
    description: 'Delete vertical banner',
    example: false,
  })
  @IsBoolean()
  @IsOptional()
  deleteBannerVertical?: boolean;

  @ApiPropertyOptional({ description: 'Contact email' })
  @Transform(emptyToUndefined)
  @IsOptional()
  @IsEmail({}, { message: 'Email must be valid' })
  email?: string;

  @ApiPropertyOptional({ description: 'Activity / business area' })
  @Transform(emptyToUndefined)
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  activity?: string;

  @ApiPropertyOptional({ description: 'Phone number' })
  @Transform(emptyToUndefined)
  @IsOptional()
  @IsString()
  @MaxLength(64)
  phone?: string;

  @ApiPropertyOptional({ description: 'Public presentation text' })
  @Transform(emptyToUndefined)
  @IsOptional()
  @IsString()
  @MaxLength(10000)
  description?: string;

  @ApiPropertyOptional({ description: 'Premium partner' })
  @Transform(({ value }) => {
    if (value === undefined || value === '' || value === null) return undefined;
    return value === true || value === 'true';
  })
  @IsOptional()
  @IsBoolean()
  premium?: boolean;
}
