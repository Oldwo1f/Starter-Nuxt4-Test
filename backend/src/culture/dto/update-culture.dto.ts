import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, IsUrl, IsEnum } from 'class-validator';
import { CultureType } from '../../entities/culture.entity';

export class UpdateCultureDto {
  @ApiPropertyOptional({
    description: 'Video title',
    example: 'Les traditions ancestrales de Tahiti',
  })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiPropertyOptional({
    description: 'Video type',
    enum: CultureType,
    example: CultureType.REPORTAGE,
  })
  @IsEnum(CultureType)
  @IsOptional()
  type?: CultureType;

  @ApiPropertyOptional({
    description: 'YouTube video URL',
    example: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  })
  @IsString()
  @IsOptional()
  @IsUrl({}, { message: 'YouTube URL must be a valid URL' })
  youtubeUrl?: string;

  @ApiPropertyOptional({
    description: 'Director name',
    example: 'Jean Dupont',
  })
  @IsString()
  @IsOptional()
  director?: string;

  @ApiPropertyOptional({
    description: 'Whether the video is public (accessible to all) or requires authentication',
  })
  @IsBoolean()
  @IsOptional()
  isPublic?: boolean;
}
