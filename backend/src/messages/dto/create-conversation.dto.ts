import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateConversationDto {
  @ApiProperty({
    description: 'ID of the other user to start a conversation with',
    example: 2,
  })
  @IsInt()
  @Min(1)
  @Type(() => Number)
  otherUserId: number;

  @ApiPropertyOptional({
    description: 'Optional listing ID for context (e.g. conversation about a specific listing)',
    example: 5,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  listingId?: number;
}
