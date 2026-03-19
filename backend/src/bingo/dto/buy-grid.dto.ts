import { IsInt, Min, Max } from 'class-validator';

export class BuyGridDto {
  @IsInt()
  roundId: number;

  @IsInt()
  @Min(1)
  @Max(10)
  count: number;
}
