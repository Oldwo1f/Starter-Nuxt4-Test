import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Server } from 'socket.io';
import { Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { MessagesService } from './messages.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  cors: {
    origin:
      process.env.NODE_ENV !== 'production'
        ? ['http://localhost:3000', 'http://127.0.0.1:3000', process.env.FRONTEND_URL].filter(
            Boolean,
          )
        : process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  },
  namespace: '/',
})
export class MessagesGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(MessagesGateway.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly messagesService: MessagesService,
  ) {}

  afterInit() {
    this.logger.log('MessagesGateway initialized');
  }

  async handleConnection(client: Socket) {
    try {
      const token =
        client.handshake.auth?.token ||
        client.handshake.query?.token ||
        (client.handshake.headers?.authorization as string)?.replace(
          'Bearer ',
          '',
        );

      if (!token) {
        this.logger.warn(`Connection rejected: no token for socket ${client.id}`);
        client.disconnect();
        return;
      }

      const payload = await this.jwtService.verifyAsync(token);
      const userId = payload.sub;

      if (!userId) {
        client.disconnect();
        return;
      }

      client.data.userId = userId;
      const room = `user:${userId}`;
      await client.join(room);
      this.logger.log(`User ${userId} connected, joined room ${room}`);
    } catch (error) {
      this.logger.warn(`Connection rejected: invalid token for socket ${client.id}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const userId = client.data?.userId;
    if (userId) {
      this.logger.log(`User ${userId} disconnected`);
    }
  }

  /**
   * Emit message:new to a recipient. Called when message is created via REST.
   */
  emitNewMessageToRecipient(recipientId: number, message: any) {
    this.server.to(`user:${recipientId}`).emit('message:new', message);
  }

  @SubscribeMessage('typing:start')
  async handleTypingStart(
    @MessageBody() payload: { conversationId: number },
    @ConnectedSocket() client: Socket,
  ) {
    const userId = client.data?.userId;
    if (!userId) return;

    if (!payload?.conversationId) return;

    try {
      const conversation = await this.messagesService.getConversation(
        payload.conversationId,
        { id: userId },
      );
      const recipientId = this.messagesService.getRecipientId(
        conversation,
        userId,
      );
      this.server
        .to(`user:${recipientId}`)
        .emit('typing:typing', {
          conversationId: payload.conversationId,
          userId,
        });
    } catch {
      // Ignore invalid conversation
    }
  }

  @SubscribeMessage('typing:stop')
  async handleTypingStop(
    @MessageBody() payload: { conversationId: number },
    @ConnectedSocket() client: Socket,
  ) {
    const userId = client.data?.userId;
    if (!userId) return;

    if (!payload?.conversationId) return;

    try {
      const conversation = await this.messagesService.getConversation(
        payload.conversationId,
        { id: userId },
      );
      const recipientId = this.messagesService.getRecipientId(
        conversation,
        userId,
      );
      this.server
        .to(`user:${recipientId}`)
        .emit('typing:stopped', {
          conversationId: payload.conversationId,
          userId,
        });
    } catch {
      // Ignore invalid conversation
    }
  }

  @SubscribeMessage('message:send')
  async handleMessageSend(
    @MessageBody() payload: { conversationId: number; content: string },
    @ConnectedSocket() client: Socket,
  ) {
    const userId = client.data?.userId;
    if (!userId) {
      return { error: 'Unauthorized' };
    }

    if (!payload?.conversationId || !payload?.content?.trim()) {
      return { error: 'conversationId and content are required' };
    }

    try {
      const dto: CreateMessageDto = { content: payload.content.trim() };
      const message = await this.messagesService.sendMessage(
        payload.conversationId,
        userId,
        dto,
      );

      const conversation = await this.messagesService.getConversation(
        payload.conversationId,
        { id: userId },
      );
      const recipientId = this.messagesService.getRecipientId(
        conversation,
        userId,
      );

      this.server.to(`user:${recipientId}`).emit('message:new', message);
      client.emit('message:new', message);

      return { success: true, message };
    } catch (error: any) {
      this.logger.error(`Error sending message: ${error?.message}`);
      return { error: error?.message || 'Failed to send message' };
    }
  }
}
