import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsArray, ValidateNested, IsNotEmpty, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class RankingItemDto {
  @ApiProperty({ description: 'Option ID', example: 1 })
  @IsInt()
  @Type(() => Number)
  optionId: number;

  @ApiProperty({ description: 'Position in ranking (1 = first)', example: 1 })
  @IsInt()
  @Min(1)
  @Type(() => Number)
  position: number;
}

export class SubmitResponseDto {
  @ApiPropertyOptional({ description: 'Selected option ID (for QCM)', example: 1 })
  @IsInt()
  @Type(() => Number)
  @IsOptional()
  optionId?: number;

  @ApiPropertyOptional({ 
    description: 'Ranking array (for ranking type)', 
    type: [RankingItemDto],
    example: [{ optionId: 1, position: 1 }, { optionId: 2, position: 2 }]
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RankingItemDto)
  @IsOptional()
  ranking?: RankingItemDto[];
}
