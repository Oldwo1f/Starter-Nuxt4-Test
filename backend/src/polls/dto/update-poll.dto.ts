import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { PollType, PollAccessLevel, PollStatus } from '../../entities/poll.entity';
import { CreatePollOptionDto } from './poll-option.dto';

export class UpdatePollDto {
  @ApiPropertyOptional({ description: 'Poll title' })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiPropertyOptional({ description: 'Poll description' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: 'Poll type', enum: PollType })
  @IsEnum(PollType)
  @IsOptional()
  type?: PollType;

  @ApiPropertyOptional({ description: 'Access level', enum: PollAccessLevel })
  @IsEnum(PollAccessLevel)
  @IsOptional()
  accessLevel?: PollAccessLevel;

  @ApiPropertyOptional({ description: 'Poll status', enum: PollStatus })
  @IsEnum(PollStatus)
  @IsOptional()
  status?: PollStatus;

  @ApiPropertyOptional({ description: 'Poll options', type: [CreatePollOptionDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreatePollOptionDto)
  @IsOptional()
  options?: CreatePollOptionDto[];
}
