import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server } from 'socket.io';
import { Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { Logger } from '@nestjs/common';
import { KikiriService } from './kikiri.service';
import { WalletService } from '../wallet/wallet.service';
import { PlaceBetDto } from './dto/place-bet.dto';
import { MoveBetDto } from './dto/move-bet.dto';
import { ChatMessageDto } from './dto/chat-message.dto';

const KIKIRI_ROOM = 'kikiri:lobby';

@WebSocketGateway({
  namespace: '/kikiri',
  cors: {
    origin:
      process.env.NODE_ENV !== 'production'
        ? ['http://localhost:3000', 'http://127.0.0.1:3000', process.env.FRONTEND_URL].filter(Boolean)
        : process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  },
})
export class KikiriGateway {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(KikiriGateway.name);

  constructor(
    private jwtService: JwtService,
    private kikiriService: KikiriService,
    private walletService: WalletService,
  ) {}

  afterInit() {
    this.logger.log('KikiriGateway initialized');
  }

  async handleConnection(client: Socket) {
    try {
      const token =
        client.handshake.auth?.token ||
        client.handshake.query?.token ||
        (client.handshake.headers?.authorization as string)?.replace('Bearer ', '');
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
      await client.join(KIKIRI_ROOM);
      this.logger.log(`User ${userId} joined Kikiri lobby`);
      const [currentDraw, drawHistoryWithResults, chatMessages] = await Promise.all([
        this.kikiriService.getCurrentDraw(),
        this.kikiriService.getDrawHistoryWithUserResults(userId, 10),
        this.kikiriService.getRecentChatMessages(50),
      ]);
      const balance = await this.walletService.getJijiBalance(userId);
      let currentDrawWithBets = currentDraw;
      if (currentDraw) {
        const [allBets, userBets] = await Promise.all([
          this.kikiriService.getAllBetsByCaseForDraw(currentDraw.id),
          this.kikiriService.getUserBetsByNumberForDraw(currentDraw.id, userId),
        ]);
        currentDrawWithBets = {
          ...currentDraw,
          allBets: JSON.parse(JSON.stringify(allBets)),
          userBets,
        } as any;
      }
      const sockets = await this.server.in(KIKIRI_ROOM).fetchSockets();
      const userIds = sockets
        .map((s) => s.data?.userId as number | undefined)
        .filter((id): id is number => typeof id === 'number');
      const onlineUsers = await this.kikiriService.getUsersByIds(userIds);
      client.emit('kikiri:state', {
        currentDraw: currentDrawWithBets,
        drawHistory: drawHistoryWithResults,
        chatMessages,
        balance,
        onlineUsers,
      });
      this.server.to(KIKIRI_ROOM).emit('kikiri:onlineUsers', { users: onlineUsers });
    } catch (error) {
      this.logger.warn(`Connection rejected: invalid token for socket ${client.id}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const userId = client.data?.userId;
    if (userId) {
      this.logger.log(`User ${userId} left Kikiri lobby`);
    }
    this.emitOnlineUsers();
  }

  private async emitOnlineUsers() {
    const sockets = await this.server.in(KIKIRI_ROOM).fetchSockets();
    const userIds = sockets
      .map((s) => s.data?.userId as number | undefined)
      .filter((id): id is number => typeof id === 'number');
    const users = await this.kikiriService.getUsersByIds(userIds);
    this.server.to(KIKIRI_ROOM).emit('kikiri:onlineUsers', { users });
  }

  /** Étape 1 : annonce qu'une nouvelle partie va commencer (compteur 5s côté client) */
  emitDrawStartingSoon() {
    this.server.to(KIKIRI_ROOM).emit('kikiri:draw:startingSoon');
  }

  emitDrawEnding(drawId: number) {
    this.server.to(KIKIRI_ROOM).emit('kikiri:draw:ending', { drawId });
  }

  /** Notifie les joueurs que la table sera fermée après le tirage en cours */
  emitTableClosingAfterDraw() {
    this.server.to(KIKIRI_ROOM).emit('kikiri:tableClosingAfterDraw');
  }

  /** Notifie les joueurs que la table est fermée (après résolution du dernier tirage) */
  emitTableClosed() {
    this.server.to(KIKIRI_ROOM).emit('kikiri:tableClosed');
  }

  async emitNewDraw(draw: any) {
    this.server.to(KIKIRI_ROOM).emit('kikiri:draw:new', {
      draw: {
        id: draw.id,
        status: draw.status,
        bettingEndsAt: draw.bettingEndsAt,
        createdAt: draw.createdAt,
      },
    });
  }

  async emitDrawReveal(draw: any) {
    this.server.to(KIKIRI_ROOM).emit('kikiri:draw:reveal', {
      draw: {
        id: draw.id,
        dice1: draw.dice1,
        dice2: draw.dice2,
        dice3: draw.dice3,
        status: draw.status,
        resolvedAt: draw.resolvedAt,
      },
    });
  }

  async emitDrawResolved(draw: any) {
    const drawPayload = {
      id: draw.id,
      dice1: draw.dice1,
      dice2: draw.dice2,
      dice3: draw.dice3,
      status: draw.status,
      resolvedAt: draw.resolvedAt,
    };
    this.server.to(KIKIRI_ROOM).emit('kikiri:draw:resolved', { draw: drawPayload });
    const sockets = await this.server.in(KIKIRI_ROOM).fetchSockets();
    for (const socket of sockets) {
      const userId = socket.data?.userId;
      if (userId) {
        const [userNet, userBets] = await Promise.all([
          this.kikiriService.getUserNetForDraw(draw.id, userId),
          this.kikiriService.getUserBetsByNumberForDraw(draw.id, userId),
        ]);
        socket.emit('kikiri:draw:myResult', { drawId: draw.id, userNet, userBets });
      }
    }
  }

  @SubscribeMessage('kikiri:requestState')
  async handleRequestState(@ConnectedSocket() client: Socket) {
    const userId = client.data?.userId;
    if (!userId) return;
    const [currentDraw, drawHistoryWithResults, chatMessages] = await Promise.all([
      this.kikiriService.getCurrentDraw(),
      this.kikiriService.getDrawHistoryWithUserResults(userId, 10),
      this.kikiriService.getRecentChatMessages(50),
    ]);
    const balance = await this.walletService.getJijiBalance(userId);
    let currentDrawWithBets = currentDraw;
    if (currentDraw) {
      const [allBets, userBets] = await Promise.all([
        this.kikiriService.getAllBetsByCaseForDraw(currentDraw.id),
        this.kikiriService.getUserBetsByNumberForDraw(currentDraw.id, userId),
      ]);
      currentDrawWithBets = {
        ...currentDraw,
        allBets: JSON.parse(JSON.stringify(allBets)),
        userBets,
      } as any;
    }
    const sockets = await this.server.in(KIKIRI_ROOM).fetchSockets();
    const userIds = sockets
      .map((s) => s.data?.userId as number | undefined)
      .filter((id): id is number => typeof id === 'number');
    const users = await this.kikiriService.getUsersByIds(userIds);
    client.emit('kikiri:state', {
      currentDraw: currentDrawWithBets,
      drawHistory: drawHistoryWithResults,
      chatMessages,
      balance,
      onlineUsers: users,
    });
  }

  @SubscribeMessage('kikiri:requestAllBets')
  async handleRequestAllBets(
    @MessageBody() payload: { drawId: number },
    @ConnectedSocket() client: Socket,
  ) {
    if (!payload?.drawId) return;
    const allBets = await this.kikiriService.getAllBetsByCaseForDraw(payload.drawId);
    client.emit('kikiri:allBets', {
      drawId: payload.drawId,
      allBets: JSON.parse(JSON.stringify(allBets)),
    });
  }

  @SubscribeMessage('kikiri:bet')
  async handleBet(
    @MessageBody() payload: PlaceBetDto,
    @ConnectedSocket() client: Socket,
  ) {
    const userId = client.data?.userId;
    if (!userId) return { error: 'Unauthorized' };
    try {
      const bet = await this.kikiriService.placeBet(
        userId,
        payload.drawId,
        payload.number,
        payload.amount,
      );
      const balance = await this.walletService.getJijiBalance(userId);
      client.emit('kikiri:bet:placed', {
        bet: {
          id: bet.id,
          drawId: bet.drawId,
          number: bet.number,
          amount: parseFloat(bet.amount.toString()),
          result: bet.result,
        },
        balance,
      });
      const allBets = await this.kikiriService.getAllBetsByCaseForDraw(payload.drawId);
      const allBetsPayload = JSON.parse(JSON.stringify(allBets));
      this.server.to(KIKIRI_ROOM).emit('kikiri:allBets', { drawId: payload.drawId, allBets: allBetsPayload });
      return { success: true, bet, balance };
    } catch (error: any) {
      this.logger.error(`Bet error: ${error?.message}`);
      client.emit('kikiri:bet:error', {
        error: error?.message || 'Failed to place bet',
      });
      return { error: error?.message || 'Failed to place bet' };
    }
  }

  @SubscribeMessage('kikiri:moveBet')
  async handleMoveBet(
    @MessageBody() payload: MoveBetDto,
    @ConnectedSocket() client: Socket,
  ) {
    const userId = client.data?.userId;
    if (!userId) return { error: 'Unauthorized' };
    try {
      const bet = await this.kikiriService.moveBet(
        userId,
        payload.drawId,
        payload.from,
        payload.to,
      );
      const allBets = await this.kikiriService.getAllBetsByCaseForDraw(payload.drawId);
      const allBetsPayload = JSON.parse(JSON.stringify(allBets));
      this.server.to(KIKIRI_ROOM).emit('kikiri:allBets', { drawId: payload.drawId, allBets: allBetsPayload });
      return { success: true, bet };
    } catch (error: any) {
      this.logger.error(`Move bet error: ${error?.message}`);
      client.emit('kikiri:bet:error', {
        error: error?.message || 'Failed to move bet',
      });
      return { error: error?.message || 'Failed to move bet' };
    }
  }

  @SubscribeMessage('kikiri:moveAllBets')
  async handleMoveAllBets(
    @MessageBody() payload: MoveBetDto,
    @ConnectedSocket() client: Socket,
  ) {
    const userId = client.data?.userId;
    if (!userId) return { error: 'Unauthorized' };
    try {
      const bets = await this.kikiriService.moveAllBets(
        userId,
        payload.drawId,
        payload.from,
        payload.to,
      );
      const allBets = await this.kikiriService.getAllBetsByCaseForDraw(payload.drawId);
      const allBetsPayload = JSON.parse(JSON.stringify(allBets));
      this.server.to(KIKIRI_ROOM).emit('kikiri:allBets', { drawId: payload.drawId, allBets: allBetsPayload });
      return { success: true, bets };
    } catch (error: any) {
      this.logger.error(`Move all bets error: ${error?.message}`);
      client.emit('kikiri:bet:error', {
        error: error?.message || 'Failed to move bets',
      });
      return { error: error?.message || 'Failed to move bets' };
    }
  }

  @SubscribeMessage('kikiri:betPreview')
  handleBetPreview(
    @MessageBody() payload: { drawId: number; delta: number; case: number },
    @ConnectedSocket() client: Socket,
  ) {
    const userId = client.data?.userId;
    if (!userId || typeof userId !== 'number') return;
    const { drawId, delta, case: caseNum } = payload ?? {};
    if (typeof drawId !== 'number' || typeof caseNum !== 'number' || caseNum < 1 || caseNum > 6) return;
    if (typeof delta !== 'number' || delta === 0 || !Number.isInteger(delta)) return;
    this.server.to(KIKIRI_ROOM).emit('kikiri:betPreview', {
      drawId,
      userId,
      delta,
      case: caseNum,
    });
  }

  @SubscribeMessage('kikiri:chat')
  async handleChat(
    @MessageBody() payload: ChatMessageDto,
    @ConnectedSocket() client: Socket,
  ) {
    const userId = client.data?.userId;
    if (!userId) return { error: 'Unauthorized' };
    try {
      const message = await this.kikiriService.sendChatMessage(userId, payload.content);
      const user = await this.kikiriService.getUserForChat(userId);
      const chatPayload = {
        id: message.id,
        userId: message.userId,
        content: message.content,
        createdAt: message.createdAt,
        user: user
          ? {
              id: user.id,
              firstName: user.firstName,
              lastName: user.lastName,
              email: user.email,
              avatarImage: user.avatarImage,
            }
          : null,
      };
      this.server.to(KIKIRI_ROOM).emit('kikiri:chat:message', chatPayload);
      return { success: true, message: chatPayload };
    } catch (error: any) {
      this.logger.error(`Chat error: ${error?.message}`);
      return { error: error?.message || 'Failed to send message' };
    }
  }
}
