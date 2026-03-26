import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsString, MaxLength, MinLength } from 'class-validator';

export enum SupportCategory {
  TECHNICAL = 'technical',
  COMMERCIAL = 'commercial',
}

export class CreateSupportRequestDto {
  @ApiProperty({
    description: 'Support category',
    enum: SupportCategory,
    example: SupportCategory.TECHNICAL,
  })
  @IsEnum(SupportCategory)
  category: SupportCategory;

  @ApiProperty({
    description: 'User message',
    minLength: 10,
    maxLength: 5000,
    example: 'Bonjour, je rencontre un problème lors de la connexion…',
  })
  @IsString()
  @MinLength(10)
  @MaxLength(5000)
  message: string;
}

