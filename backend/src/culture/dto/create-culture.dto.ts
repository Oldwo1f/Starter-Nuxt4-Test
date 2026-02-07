import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsUrl, IsEnum } from 'class-validator';
import { CultureType } from '../../entities/culture.entity';

export class CreateCultureDto {
  @ApiProperty({
    description: 'Video title',
    example: 'Les traditions ancestrales de Tahiti',
  })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({
    description: 'Video type',
    enum: CultureType,
    example: CultureType.REPORTAGE,
  })
  @IsEnum(CultureType)
  @IsNotEmpty()
  type: CultureType;

  @ApiProperty({
    description: 'YouTube video URL',
    example: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  })
  @IsString()
  @IsNotEmpty()
  @IsUrl({}, { message: 'YouTube URL must be a valid URL' })
  youtubeUrl: string;

  @ApiPropertyOptional({
    description: 'Director name',
    example: 'Jean Dupont',
  })
  @IsString()
  @IsOptional()
  director?: string;

  @ApiPropertyOptional({
    description: 'Whether the video is public (accessible to all) or requires authentication',
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  isPublic?: boolean;
}
