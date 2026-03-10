import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength, MaxLength } from 'class-validator';

export class CreateMessageDto {
  @ApiProperty({
    description: 'Message content',
    example: 'Bonjour, votre annonce m\'intéresse. Est-elle toujours disponible ?',
    minLength: 1,
    maxLength: 5000,
  })
  @IsString()
  @MinLength(1, { message: 'Le message ne peut pas être vide' })
  @MaxLength(5000, { message: 'Le message ne peut pas dépasser 5000 caractères' })
  content: string;
}
