import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, Min, IsOptional, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateProgressDto {
  @ApiProperty({
    description: 'Video ID',
    example: 1,
  })
  @IsInt()
  @Min(1)
  @Type(() => Number)
  videoId: number;

  @ApiPropertyOptional({
    description: 'Last video watched ID',
    example: 1,
  })
  @IsInt()
  @Min(1)
  @Type(() => Number)
  @IsOptional()
  lastVideoWatchedId?: number;

  @ApiPropertyOptional({
    description: 'Mark video as completed (default: false)',
    example: true,
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  @Type(() => Boolean)
  markAsCompleted?: boolean;
}
