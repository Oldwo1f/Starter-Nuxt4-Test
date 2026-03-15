import { PartialType } from '@nestjs/swagger';
import { CreateTeNatiraaEventDto } from './create-event.dto';

export class UpdateTeNatiraaEventDto extends PartialType(CreateTeNatiraaEventDto) {}
