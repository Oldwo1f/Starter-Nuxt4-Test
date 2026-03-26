import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { CreateSupportRequestDto } from './dto/create-support-request.dto';
import { SupportService } from './support.service';

@ApiTags('support')
@ApiBearerAuth('JWT-auth')
@Controller('support')
@UseGuards(JwtAuthGuard)
export class SupportController {
  constructor(private readonly supportService: SupportService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Create a support request',
    description: 'Creates a support request and sends it to the appropriate email recipient.',
  })
  @ApiResponse({
    status: 200,
    description: 'Support request sent',
    schema: { type: 'object', properties: { message: { type: 'string' } } },
  })
  async create(@CurrentUser() user: any, @Body() dto: CreateSupportRequestDto) {
    await this.supportService.createSupportRequest(user, dto);
    return { message: 'Support request sent' };
  }
}

