import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { Conversation } from '../entities/conversation.entity';
import { Message } from '../entities/message.entity';
import { User } from '../entities/user.entity';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { CreateMessageDto } from './dto/create-message.dto';
import { UsersService } from '../users/users.service';

@Injectable()
export class MessagesService {
  constructor(
    @InjectRepository(Conversation)
    private conversationRepository: Repository<Conversation>,
    @InjectRepository(Message)
    private messageRepository: Repository<Message>,
    private usersService: UsersService,
  ) {}

  /**
   * Get or create a conversation between two users.
   * participant1Id is always the smaller ID, participant2Id the larger.
   */
  async getOrCreateConversation(
    dto: CreateConversationDto,
    currentUser: { id: number },
  ): Promise<Conversation> {
    if (dto.otherUserId === currentUser.id) {
      throw new BadRequestException('Vous ne pouvez pas créer une conversation avec vous-même');
    }

    const otherUser = await this.usersService.findById(dto.otherUserId);
    if (!otherUser) {
      throw new NotFoundException('Utilisateur introuvable');
    }

    const participant1Id = Math.min(currentUser.id, dto.otherUserId);
    const participant2Id = Math.max(currentUser.id, dto.otherUserId);

    let conversation = await this.conversationRepository.findOne({
      where: { participant1Id, participant2Id },
      relations: ['participant1', 'participant2', 'listing'],
    });

    if (!conversation) {
      conversation = this.conversationRepository.create({
        participant1Id,
        participant2Id,
        listingId: dto.listingId ?? null,
      });
      conversation = await this.conversationRepository.save(conversation);
      conversation = await this.conversationRepository.findOne({
        where: { id: conversation.id },
        relations: ['participant1', 'participant2', 'listing'],
      }) as Conversation;
    } else if (dto.listingId && !conversation.listingId) {
      conversation.listingId = dto.listingId;
      await this.conversationRepository.save(conversation);
    }

    return conversation;
  }

  /**
   * Get all conversations for the current user.
   */
  async getConversations(currentUser: { id: number }): Promise<Conversation[]> {
    const conversations = await this.conversationRepository
      .createQueryBuilder('c')
      .leftJoinAndSelect('c.participant1', 'p1')
      .leftJoinAndSelect('c.participant2', 'p2')
      .leftJoinAndSelect('c.listing', 'listing')
      .where('c.participant1Id = :userId OR c.participant2Id = :userId', {
        userId: currentUser.id,
      })
      .orderBy('c.updatedAt', 'DESC')
      .getMany();

    // Load last message and unread count for each conversation
    for (const conv of conversations) {
      const lastMessage = await this.messageRepository.findOne({
        where: { conversationId: conv.id },
        relations: ['sender'],
        order: { createdAt: 'DESC' },
      });
      (conv as any).lastMessage = lastMessage;

      const recipientId = this.getRecipientId(conv, currentUser.id);
      const unreadCount = await this.messageRepository.count({
        where: {
          conversationId: conv.id,
          senderId: recipientId,
          readAt: IsNull(),
        },
      });
      (conv as any).unreadCount = unreadCount;
    }

    return conversations;
  }

  /**
   * Get a single conversation by ID. Only participants can access.
   */
  async getConversation(
    conversationId: number,
    currentUser: { id: number },
  ): Promise<Conversation> {
    const conversation = await this.conversationRepository.findOne({
      where: { id: conversationId },
      relations: ['participant1', 'participant2', 'listing'],
    });

    if (!conversation) {
      throw new NotFoundException('Conversation introuvable');
    }

    const isParticipant =
      conversation.participant1Id === currentUser.id ||
      conversation.participant2Id === currentUser.id;

    if (!isParticipant) {
      throw new ForbiddenException('Vous n\'avez pas accès à cette conversation');
    }

    const recipientId = this.getRecipientId(conversation, currentUser.id);
    const unreadCount = await this.messageRepository.count({
      where: {
        conversationId,
        senderId: recipientId,
        readAt: IsNull(),
      },
    });
    (conversation as any).unreadCount = unreadCount;

    return conversation;
  }

  /**
   * Get messages for a conversation with pagination.
   */
  async getMessages(
    conversationId: number,
    currentUser: { id: number },
    page: number = 1,
    pageSize: number = 50,
    beforeId?: number,
  ): Promise<{ data: Message[]; total: number; page: number; pageSize: number; totalPages: number }> {
    await this.getConversation(conversationId, currentUser);

    const queryBuilder = this.messageRepository
      .createQueryBuilder('m')
      .leftJoinAndSelect('m.sender', 'sender')
      .where('m.conversationId = :conversationId', { conversationId })
      .orderBy('m.createdAt', 'ASC');

    if (beforeId) {
      queryBuilder.andWhere('m.id < :beforeId', { beforeId });
    }

    const total = await queryBuilder.getCount();

    const skip = (page - 1) * pageSize;
    const data = await queryBuilder.skip(skip).take(pageSize).getMany();

    const totalPages = Math.ceil(total / pageSize);

    return {
      data,
      total,
      page,
      pageSize,
      totalPages,
    };
  }

  /**
   * Send a message. Used by both REST and Gateway.
   */
  async sendMessage(
    conversationId: number,
    senderId: number,
    dto: CreateMessageDto,
  ): Promise<Message> {
    const conversation = await this.conversationRepository.findOne({
      where: { id: conversationId },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation introuvable');
    }

    const isParticipant =
      conversation.participant1Id === senderId || conversation.participant2Id === senderId;

    if (!isParticipant) {
      throw new ForbiddenException('Vous n\'avez pas accès à cette conversation');
    }

    const message = this.messageRepository.create({
      conversationId,
      senderId,
      content: dto.content.trim(),
    });

    const saved = await this.messageRepository.save(message);

    // Update conversation updatedAt
    await this.conversationRepository.update(conversationId, {
      updatedAt: new Date(),
    });

    return this.messageRepository.findOne({
      where: { id: saved.id },
      relations: ['sender', 'conversation'],
    }) as Promise<Message>;
  }

  /**
   * Mark all messages in a conversation as read (for the current user as recipient).
   */
  async markConversationAsRead(
    conversationId: number,
    currentUser: { id: number },
  ): Promise<void> {
    const conversation = await this.getConversation(conversationId, currentUser);
    const recipientId = this.getRecipientId(conversation, currentUser.id);

    await this.messageRepository.update(
      {
        conversationId,
        senderId: recipientId,
        readAt: IsNull(),
      },
      { readAt: new Date() },
    );
  }

  /**
   * Get total unread count for the current user.
   */
  async getTotalUnreadCount(currentUser: { id: number }): Promise<number> {
    const conversations = await this.conversationRepository.find({
      where: [
        { participant1Id: currentUser.id },
        { participant2Id: currentUser.id },
      ],
      select: ['id', 'participant1Id', 'participant2Id'],
    });

    let total = 0;
    for (const conv of conversations) {
      const recipientId = this.getRecipientId(conv, currentUser.id);
      const count = await this.messageRepository.count({
        where: {
          conversationId: conv.id,
          senderId: recipientId,
          readAt: IsNull(),
        },
      });
      total += count;
    }
    return total;
  }

  /**
   * Mark a message as read.
   */
  async markAsRead(
    conversationId: number,
    messageId: number,
    currentUser: { id: number },
  ): Promise<Message> {
    const conversation = await this.getConversation(conversationId, currentUser);

    const message = await this.messageRepository.findOne({
      where: { id: messageId, conversationId },
      relations: ['sender'],
    });

    if (!message) {
      throw new NotFoundException('Message introuvable');
    }

    // Only the recipient can mark as read (not the sender)
    if (message.senderId === currentUser.id) {
      return message;
    }

    if (!message.readAt) {
      message.readAt = new Date();
      await this.messageRepository.save(message);
    }

    return message;
  }

  /**
   * Get the recipient user ID for a conversation and sender.
   */
  getRecipientId(conversation: Conversation, senderId: number): number {
    return conversation.participant1Id === senderId
      ? conversation.participant2Id
      : conversation.participant1Id;
  }
}
