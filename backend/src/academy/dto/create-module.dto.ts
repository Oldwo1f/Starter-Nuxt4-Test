import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateModuleDto {
  @ApiProperty({
    description: 'Course ID',
    example: 1,
  })
  @IsInt()
  @Min(1)
  @Type(() => Number)
  courseId: number;

  @ApiProperty({
    description: 'Module title',
    example: 'Module 1: Les bases',
  })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiPropertyOptional({
    description: 'Module description',
    example: 'Ce module couvre les concepts fondamentaux...',
  })
  @IsString()
  @IsOptional()
  description?: string;

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
