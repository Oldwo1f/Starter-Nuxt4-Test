import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { IsString, IsOptional, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { AdminAgentService, ChatMessage } from './admin-agent.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../entities/user.entity';
import { UploadService } from '../upload/upload.service';

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
  constructor(
    private readonly adminAgentService: AdminAgentService,
    private readonly uploadService: UploadService,
  ) {}

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

  @Post('upload-image')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Déposer une image pour le chat agent',
    description:
      'JPEG/PNG/WebP. Retourne une URL relative /uploads/agent/{userId}/... à citer dans le message suivant pour les outils (bannière, etc.).',
  })
  @ApiResponse({ status: 201, description: '{ url: string }' })
  async uploadAgentImage(
    @UploadedFile() file: Express.Multer.File,
    @Request() req: { user: { id: number } },
  ) {
    if (!file) {
      throw new BadRequestException('Fichier manquant (champ file)');
    }
    const url = await this.uploadService.saveAdminAgentImage(req.user.id, file);
    return { url };
  }
}
