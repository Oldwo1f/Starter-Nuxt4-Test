import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsUrl, IsBoolean } from 'class-validator';

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
}
