import {
  IsBoolean,
  IsOptional,
  IsArray,
  IsString,
  IsISO8601,
} from 'class-validator';

export class UpdateLaunchModeDto {
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allowedIps?: string[];

  @IsOptional()
  @IsISO8601()
  launchOpensAt?: string;
}
