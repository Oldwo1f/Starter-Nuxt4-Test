import { IsString, MinLength, MaxLength } from 'class-validator';

export class BingoChatMessageDto {
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  content: string;
}
