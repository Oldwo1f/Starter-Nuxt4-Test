import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class BankTransferWebhookDto {
  @ApiProperty({
    description: 'Reference ID found in the bank transfer label (matches the intent referenceId)',
    example: 'NH-42-TO-8F3KQ2',
  })
  @IsString()
  @IsNotEmpty()
  referenceId: string;

  @ApiProperty({
    description: 'Amount in XPF (must match the expected pack price)',
    example: 5000,
  })
  @IsNumber()
  @Min(1)
  amountXpf: number;

  @ApiPropertyOptional({
    description: 'Bank transaction ID (if available). Used for idempotence / traceability.',
    example: 'BANKTX-2026-02-27-000123',
  })
  @IsOptional()
  @IsString()
  bankTransactionId?: string;

  @ApiPropertyOptional({
    description: 'Payer name (if available).',
    example: 'DOE John',
  })
  @IsOptional()
  @IsString()
  payerName?: string;

  @ApiPropertyOptional({
    description: 'Paid date in ISO string. If omitted, backend uses now().',
    example: '2026-02-27T12:34:56.000Z',
  })
  @IsOptional()
  @IsString()
  paidAt?: string;
}

