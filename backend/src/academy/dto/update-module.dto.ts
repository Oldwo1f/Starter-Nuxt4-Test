import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateModuleDto {
  @ApiPropertyOptional({
    description: 'Module title',
    example: 'Module 1: Les bases',
  })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiPropertyOptional({
    description: 'Module description',
    example: 'Ce module couvre les concepts fondamentaux...',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    description: 'Display order',
  })
  @IsInt()
  @Min(0)
  @Type(() => Number)
  @IsOptional()
  order?: number;
}
