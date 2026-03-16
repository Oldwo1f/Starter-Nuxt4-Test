import { IsInt, Min, Max } from 'class-validator';

export class PlaceBetDto {
  @IsInt()
  drawId: number;

  @IsInt()
  @Min(1)
  @Max(6)
  number: number;

  @IsInt()
  @Min(1)
  amount: number;
}
