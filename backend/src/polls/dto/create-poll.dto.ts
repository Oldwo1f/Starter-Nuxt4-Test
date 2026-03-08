import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsEnum, IsOptional, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { PollType, PollAccessLevel, PollStatus } from '../../entities/poll.entity';
import { CreatePollOptionDto } from './poll-option.dto';

export class CreatePollDto {
  @ApiProperty({ description: 'Poll title', example: 'Seriez-vous favorable à l\'ouverture d\'une formation création de Savon coco?' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiPropertyOptional({ description: 'Poll description', example: 'Nous souhaitons connaître votre avis sur cette formation' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ description: 'Poll type', enum: PollType, example: PollType.QCM })
  @IsEnum(PollType)
  type: PollType;

  @ApiProperty({ description: 'Access level', enum: PollAccessLevel, example: PollAccessLevel.PUBLIC })
  @IsEnum(PollAccessLevel)
  accessLevel: PollAccessLevel;

  @ApiPropertyOptional({ description: 'Poll status', enum: PollStatus, example: PollStatus.ACTIVE, default: PollStatus.DRAFT })
  @IsEnum(PollStatus)
  @IsOptional()
  status?: PollStatus;

  @ApiProperty({ description: 'Poll options', type: [CreatePollOptionDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreatePollOptionDto)
  options: CreatePollOptionDto[];
}
