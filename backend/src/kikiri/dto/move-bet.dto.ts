import { IsInt, Min, Max } from 'class-validator';

export class MoveBetDto {
  @IsInt()
  drawId: number;

  @IsInt()
  @Min(1)
  @Max(6)
  from: number;

  @IsInt()
  @Min(1)
  @Max(6)
  to: number;
}
