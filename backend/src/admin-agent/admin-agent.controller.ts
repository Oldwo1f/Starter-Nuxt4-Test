import { Controller, Post, Body, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { IsString, IsOptional, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { AdminAgentService, ChatMessage } from './admin-agent.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../entities/user.entity';

class ChatMessageDto {
  @IsString()
  role: 'user' | 'assistant';

  @IsString()
  content: string;
}

class ChatDto {
  @IsString()
  message: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChatMessageDto)
  history?: ChatMessage[];
}

@ApiTags('admin-agent')
@ApiBearerAuth('JWT-auth')
@Controller('admin/agent')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.MODERATOR, UserRole.ADMIN, UserRole.SUPERADMIN)
export class AdminAgentController {
  constructor(private readonly adminAgentService: AdminAgentService) {}

  @Post('chat')
  @ApiOperation({
    summary: 'Chat with admin agent',
    description: 'Send a message to the AI agent. Staff (moderator, admin, superadmin) only.',
  })
  @ApiResponse({ status: 200, description: 'Agent response' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden or OPENAI_API_KEY not set' })
  async chat(@Body() dto: ChatDto, @Request() req: { user: { id: number; email: string; role: UserRole } }) {
    const history = dto.history ?? [];
    return this.adminAgentService.chat(dto.message, history, req.user);
  }
}
