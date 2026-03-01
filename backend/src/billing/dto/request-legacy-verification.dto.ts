import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';

export class RequestLegacyVerificationDto {
  @ApiProperty({
    description: 'Person with whom the payment was made',
    enum: ['naho', 'tamiga'],
    example: 'naho',
  })
  @IsIn(['naho', 'tamiga'], {
    message: 'paidWith must be one of: naho, tamiga',
  })
  paidWith: 'naho' | 'tamiga';
}
