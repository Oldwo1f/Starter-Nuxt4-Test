import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Max, Min } from 'class-validator';

export class AddPointsDeltaDto {
  @ApiProperty({ description: 'Montant à ajouter au compteur actuel (1–500)', minimum: 1, maximum: 500, example: 1 })
  @IsInt()
  @Min(1)
  @Max(500)
  delta: number;
}
