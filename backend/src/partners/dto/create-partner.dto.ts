import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsUrl } from 'class-validator';

export class CreatePartnerDto {
  @ApiProperty({
    description: 'Partner name',
    example: 'Partenaire Example',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({
    description: 'Partner website URL',
    example: 'https://example.com',
  })
  @IsString()
  @IsOptional()
  @IsUrl({}, { message: 'Link must be a valid URL' })
  link?: string;
}
