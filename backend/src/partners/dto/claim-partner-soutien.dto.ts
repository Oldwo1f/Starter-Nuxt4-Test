import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class ClaimPartnerSoutienDto {
  @ApiProperty({ description: 'Jeton lu dans le QR (paramètre t=)' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  token: string;
}
