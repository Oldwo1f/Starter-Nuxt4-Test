import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateVideoDto {
  @ApiProperty({
    description: 'Module ID',
    example: 1,
  })
  @IsInt()
  @Min(1)
  @Type(() => Number)
  moduleId: number;

  @ApiProperty({
    description: 'Video title',
    example: 'Vidéo 1: Introduction',
  })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiPropertyOptional({
    description: 'Video description',
    example: 'Cette vidéo présente...',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    description: 'Video file URL (uploaded file)',
    example: '/uploads/academy/videos/123-video.mp4',
  })
  @IsString()
  @IsOptional()
  videoFile?: string;

  @ApiPropertyOptional({
    description: 'YouTube video URL',
    example: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  })
  @IsString()
  @IsOptional()
  videoUrl?: string;

  @ApiPropertyOptional({
    description: 'Video duration in seconds',
    example: 300,
  })
  @IsInt()
  @Min(0)
  @Type(() => Number)
  @IsOptional()
  duration?: number;

  @ApiPropertyOptional({
    description: 'Display order',
    default: 0,
  })
  @IsInt()
  @Min(0)
  @Type(() => Number)
  @IsOptional()
  order?: number;
}
