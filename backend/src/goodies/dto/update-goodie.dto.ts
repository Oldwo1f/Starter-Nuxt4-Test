import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, IsUrl, IsIn } from 'class-validator';

export class UpdateGoodieDto {
  @ApiPropertyOptional({
    description: 'Goodie name',
    example: 'Logo Nuna Heritage',
  })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({
    description: 'Goodie website URL',
    example: 'https://example.com',
  })
  @IsString()
  @IsOptional()
  @IsUrl({}, { message: 'Link must be a valid URL' })
  link?: string;

  @ApiPropertyOptional({
    description: 'Goodie description',
    example: 'Logo officiel de Nuna Heritage en haute résolution',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    description: 'Name of the person offering the goodie',
    example: 'Jean Dupont',
  })
  @IsString()
  @IsOptional()
  offeredByName?: string;

  @ApiPropertyOptional({
    description: 'Link of the person offering the goodie',
    example: 'https://example.com/profile',
  })
  @IsString()
  @IsOptional()
  @IsUrl({}, { message: 'Offered by link must be a valid URL' })
  offeredByLink?: string;

  @ApiPropertyOptional({
    description: 'Access level required to access the goodie',
    enum: ['public', 'member', 'premium', 'vip'],
  })
  @IsString()
  @IsOptional()
  @IsIn(['public', 'member', 'premium', 'vip'], {
    message: 'Access level must be one of: public, member, premium, vip',
  })
  accessLevel?: 'public' | 'member' | 'premium' | 'vip';

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

  @ApiPropertyOptional({
    description: 'Delete uploaded file',
    example: false,
  })
  @IsBoolean()
  @IsOptional()
  deleteFile?: boolean;
}
