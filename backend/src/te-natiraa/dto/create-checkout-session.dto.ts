import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsInt, IsString, Min } from 'class-validator';

export class CreateTeNatiraaCheckoutSessionDto {
  @ApiProperty({ example: 'Dupont' })
  @IsString()
  firstName: string;

  @ApiProperty({ example: 'Jean' })
  @IsString()
  lastName: string;

  @ApiProperty({ example: 'jean.dupont@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 2, description: 'Nombre d\'adultes' })
  @IsInt()
  @Min(0)
  adultCount: number;

  @ApiProperty({ example: 1, description: 'Nombre d\'enfants' })
  @IsInt()
  @Min(0)
  childCount: number;
}
