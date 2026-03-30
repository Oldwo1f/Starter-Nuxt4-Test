import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty } from 'class-validator';
import { ManualTransferFlowChannel } from '../../entities/manual-transfer-flow-verification.entity';

export class RequestManualTransferFlowDto {
  @ApiProperty({
    enum: ManualTransferFlowChannel,
    example: ManualTransferFlowChannel.CCP_MARAMA,
  })
  @IsNotEmpty()
  @IsEnum(ManualTransferFlowChannel)
  channel: ManualTransferFlowChannel;
}
