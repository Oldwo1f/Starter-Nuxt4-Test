import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsIn } from 'class-validator';

export class CreateCourseDto {
  @ApiProperty({
    description: 'Course title',
    example: 'Introduction à la culture polynésienne',
  })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiPropertyOptional({
    description: 'Course description',
    example: 'Découvrez les bases de la culture polynésienne...',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    description: 'Thumbnail image URL',
  })
  @IsString()
  @IsOptional()
  thumbnailImage?: string;

  @ApiPropertyOptional({
    description: 'Whether the course is published',
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  isPublished?: boolean;

  @ApiPropertyOptional({
    description: 'Access level required to access the course',
    enum: ['public', 'member', 'premium', 'vip'],
    default: 'public',
  })
  @IsString()
  @IsOptional()
  @IsIn(['public', 'member', 'premium', 'vip'], {
    message: 'Access level must be one of: public, member, premium, vip',
  })
  accessLevel?: 'public' | 'member' | 'premium' | 'vip';

  @ApiPropertyOptional({
    description: 'Display order',
    default: 0,
  })
  @IsOptional()
  order?: number;

  @ApiPropertyOptional({
    description: 'Instructor avatar URL',
  })
  @IsString()
  @IsOptional()
  instructorAvatar?: string;

  @ApiPropertyOptional({
    description: 'Instructor first name',
    example: 'Jean',
  })
  @IsString()
  @IsOptional()
  instructorFirstName?: string;

  @ApiPropertyOptional({
    description: 'Instructor last name',
    example: 'Dupont',
  })
  @IsString()
  @IsOptional()
  instructorLastName?: string;

  @ApiPropertyOptional({
    description: 'Instructor title/qualification',
    example: 'Expert en culture polynésienne',
  })
  @IsString()
  @IsOptional()
  instructorTitle?: string;

  @ApiPropertyOptional({
    description: 'Link to find the instructor',
    example: 'https://example.com/profile/jean-dupont',
  })
  @IsString()
  @IsOptional()
  instructorLink?: string;
}
