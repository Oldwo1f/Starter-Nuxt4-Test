import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class MessagesQueryDto {
  @ApiPropertyOptional({
    description: 'Page number for pagination',
    default: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Number of messages per page',
    default: 50,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  pageSize?: number = 50;

  @ApiPropertyOptional({
    description: 'Fetch messages older than this message ID (for load more)',
  })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  beforeId?: number;
}
