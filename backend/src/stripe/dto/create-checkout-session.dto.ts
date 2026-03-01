import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';

export class CreateCheckoutSessionDto {
  @ApiProperty({
    description: 'Selected pack code',
    enum: ['teOhi', 'umete'],
    example: 'teOhi',
  })
  @IsIn(['teOhi', 'umete'], {
    message: 'pack must be one of: teOhi, umete',
  })
  pack: 'teOhi' | 'umete';
}
