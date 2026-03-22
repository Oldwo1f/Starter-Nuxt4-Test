import { IsOptional, IsString, MaxLength } from 'class-validator';

export class RejectTestimonialDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
