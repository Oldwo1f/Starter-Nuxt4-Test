import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsUrl } from 'class-validator';

export class CreateGoodieDto {
  @ApiProperty({
    description: 'Goodie name',
    example: 'Logo Nuna Heritage',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

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
    description: 'Whether the goodie is public (accessible to all) or requires authentication',
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  isPublic?: boolean;
}
