import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  UseGuards,
  ParseIntPipe,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiParam,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { MessagesService } from './messages.service';
import { MessagesGateway } from './messages.gateway';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { CreateMessageDto } from './dto/create-message.dto';
import { MessagesQueryDto } from './dto/messages-query.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';

@ApiTags('messages')
@ApiBearerAuth('JWT-auth')
@Controller('messages')
@UseGuards(JwtAuthGuard)
export class MessagesController {
  constructor(
    private readonly messagesService: MessagesService,
    private readonly messagesGateway: MessagesGateway,
  ) {}

  @Get('unread-count')
  @ApiOperation({
    summary: 'Get total unread count',
    description: 'Get total number of unread messages for the current user',
  })
  @ApiResponse({ status: 200, description: 'Total unread count' })
  async getUnreadCount(@CurrentUser() user: { id: number }) {
    const count = await this.messagesService.getTotalUnreadCount(user);
    return { count };
  }

  @Get('conversations')
  @ApiOperation({
    summary: 'List conversations',
    description: 'Get all conversations for the current user',
  })
  @ApiResponse({ status: 200, description: 'List of conversations' })
  async getConversations(@CurrentUser() user: { id: number }) {
    return this.messagesService.getConversations(user);
  }

  @Post('conversations')
  @ApiOperation({
    summary: 'Create or get conversation',
    description: 'Create a new conversation or return existing one with the specified user',
  })
  @ApiBody({ type: CreateConversationDto })
  @ApiResponse({ status: 201, description: 'Conversation created or retrieved' })
  @ApiResponse({ status: 400, description: 'Bad request - Cannot message yourself or user not found' })
  async createConversation(
    @Body() dto: CreateConversationDto,
    @CurrentUser() user: { id: number },
  ) {
    return this.messagesService.getOrCreateConversation(dto, user);
  }

  @Patch('conversations/:id/read')
  @ApiOperation({
    summary: 'Mark conversation as read',
    description: 'Mark all messages in the conversation as read',
  })
  @ApiParam({ name: 'id', description: 'Conversation ID', type: 'number' })
  @ApiResponse({ status: 200, description: 'Conversation marked as read' })
  async markConversationAsRead(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: { id: number },
  ) {
    await this.messagesService.markConversationAsRead(id, user);
    return { success: true };
  }

  @Get('conversations/:id')
  @ApiOperation({
    summary: 'Get conversation by ID',
    description: 'Get a single conversation (participants only)',
  })
  @ApiParam({ name: 'id', description: 'Conversation ID', type: 'number' })
  @ApiResponse({ status: 200, description: 'Conversation details' })
  @ApiResponse({ status: 403, description: 'Forbidden - Not a participant' })
  @ApiResponse({ status: 404, description: 'Conversation not found' })
  async getConversation(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: { id: number },
  ) {
    return this.messagesService.getConversation(id, user);
  }

  @Patch('conversations/:id/messages/:messageId/read')
  @ApiOperation({
    summary: 'Mark message as read',
    description: 'Mark a message as read by the recipient',
  })
  @ApiParam({ name: 'id', description: 'Conversation ID', type: 'number' })
  @ApiParam({ name: 'messageId', description: 'Message ID', type: 'number' })
  @ApiResponse({ status: 200, description: 'Message marked as read' })
  @ApiResponse({ status: 403, description: 'Forbidden - Not a participant' })
  @ApiResponse({ status: 404, description: 'Message not found' })
  async markAsRead(
    @Param('id', ParseIntPipe) id: number,
    @Param('messageId', ParseIntPipe) messageId: number,
    @CurrentUser() user: { id: number },
  ) {
    return this.messagesService.markAsRead(id, messageId, user);
  }

  @Get('conversations/:id/messages')
  @ApiOperation({
    summary: 'Get messages',
    description: 'Get paginated messages for a conversation',
  })
  @ApiParam({ name: 'id', description: 'Conversation ID', type: 'number' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Paginated messages' })
  @ApiResponse({ status: 403, description: 'Forbidden - Not a participant' })
  @ApiResponse({ status: 404, description: 'Conversation not found' })
  async getMessages(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: { id: number },
    @Query() query: MessagesQueryDto,
  ) {
    return this.messagesService.getMessages(
      id,
      user,
      query.page ?? 1,
      query.pageSize ?? 50,
    );
  }

  @Post('conversations/:id/messages')
  @ApiOperation({
    summary: 'Send message',
    description: 'Send a new message in a conversation',
  })
  @ApiParam({ name: 'id', description: 'Conversation ID', type: 'number' })
  @ApiBody({ type: CreateMessageDto })
  @ApiResponse({ status: 201, description: 'Message sent' })
  @ApiResponse({ status: 403, description: 'Forbidden - Not a participant' })
  @ApiResponse({ status: 404, description: 'Conversation not found' })
  async sendMessage(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateMessageDto,
    @CurrentUser() user: { id: number },
  ) {
    const message = await this.messagesService.sendMessage(id, user.id, dto);
    const conversation = await this.messagesService.getConversation(id, user);
    const recipientId = this.messagesService.getRecipientId(conversation, user.id);
    this.messagesGateway.emitNewMessageToRecipient(recipientId, message);
    return message;
  }

}
