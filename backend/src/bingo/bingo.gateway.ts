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
import { BingoService } from './bingo.service';
import { WalletService } from '../wallet/wallet.service';
import { BuyGridDto } from './dto/buy-grid.dto';
import { BingoChatMessageDto } from './dto/chat-message.dto';

const BINGO_ROOM = 'bingo:lobby';

@WebSocketGateway({
  namespace: '/bingo',
  cors: {
    origin:
      process.env.NODE_ENV !== 'production'
        ? ['http://localhost:3000', 'http://127.0.0.1:3000', process.env.FRONTEND_URL].filter(Boolean)
        : process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  },
})
export class BingoGateway {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(BingoGateway.name);

  constructor(
    private jwtService: JwtService,
    private bingoService: BingoService,
    private walletService: WalletService,
  ) {}

  afterInit() {
    this.logger.log('BingoGateway initialized');
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
      await client.join(BINGO_ROOM);
      this.logger.log(`User ${userId} joined Bingo lobby`);
      const [currentRound, chatMessages] = await Promise.all([
        this.bingoService.getCurrentRound(),
        this.bingoService.getRecentChatMessages(50),
      ]);
      const balance = await this.walletService.getJijiBalance(userId);
      let userGrids: any[] = [];
      if (currentRound) {
        userGrids = await this.bingoService.getUserGridsForRound(currentRound.id, userId);
      }
      const sockets = await this.server.in(BINGO_ROOM).fetchSockets();
      const userIds = sockets
        .map((s) => s.data?.userId as number | undefined)
        .filter((id): id is number => typeof id === 'number');
      const onlineUsers = await this.bingoService.getUsersByIds(userIds);
      client.emit('bingo:state', {
        currentRound: currentRound
          ? {
              id: currentRound.id,
              phase: currentRound.phase,
              purchaseEndsAt: currentRound.purchaseEndsAt,
              jackpot: parseFloat(currentRound.jackpot.toString()),
              drawnBalls: currentRound.drawnBalls ?? [],
              winnerId: currentRound.winnerId,
              createdAt: currentRound.createdAt,
            }
          : null,
        userGrids: userGrids.map((g) => ({
          id: g.id,
          roundId: (g as any).round?.id ?? currentRound?.id,
          numbers: g.numbers,
          gridIndex: g.gridIndex,
        })),
        chatMessages,
        balance,
        onlineUsers,
      });
      this.server.to(BINGO_ROOM).emit('bingo:onlineUsers', { users: onlineUsers });
    } catch (error) {
      this.logger.warn(`Connection rejected: invalid token for socket ${client.id}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const userId = client.data?.userId;
    if (userId) {
      this.logger.log(`User ${userId} left Bingo lobby`);
    }
    this.emitOnlineUsers();
  }

  private async emitOnlineUsers() {
    const sockets = await this.server.in(BINGO_ROOM).fetchSockets();
    const userIds = sockets
      .map((s) => s.data?.userId as number | undefined)
      .filter((id): id is number => typeof id === 'number');
    const users = await this.bingoService.getUsersByIds(userIds);
    this.server.to(BINGO_ROOM).emit('bingo:onlineUsers', { users });
  }

  emitRoundNew(round: any) {
    this.server.to(BINGO_ROOM).emit('bingo:round:new', {
      round: {
        id: round.id,
        phase: round.phase,
        purchaseEndsAt: round.purchaseEndsAt,
        jackpot: parseFloat(round.jackpot.toString()),
        drawnBalls: round.drawnBalls ?? [],
        createdAt: round.createdAt,
      },
    });
  }

  emitRoundDrawing(round: any) {
    this.server.to(BINGO_ROOM).emit('bingo:round:drawing', {
      round: {
        id: round.id,
        phase: round.phase,
        jackpot: parseFloat(round.jackpot.toString()),
        drawnBalls: round.drawnBalls ?? [],
        drawingStartedAt: round.drawingStartedAt,
      },
    });
  }

  emitBallDrawn(roundId: number, ball: number, drawnBalls: number[]) {
    this.server.to(BINGO_ROOM).emit('bingo:ball:drawn', {
      roundId,
      ball,
      drawnBalls,
    });
  }

  async emitRoundEnded(round: any) {
    const winnerIds = round.winnerIds ?? (round.winnerId ? [round.winnerId] : []);
    const winners = winnerIds.length > 0
      ? await this.bingoService.getWinnersDisplayInfo(winnerIds)
      : [];
    this.server.to(BINGO_ROOM).emit('bingo:round:ended', {
      round: {
        id: round.id,
        phase: round.phase,
        winnerId: round.winnerId,
        winnerIds,
        winners,
        jackpot: parseFloat(round.jackpot?.toString?.() ?? round.jackpot ?? 0),
      },
    });
  }

  emitTableClosed() {
    this.server.to(BINGO_ROOM).emit('bingo:tableClosed');
  }

  @SubscribeMessage('bingo:requestState')
  async handleRequestState(@ConnectedSocket() client: Socket) {
    const userId = client.data?.userId;
    if (!userId) return;
    const [currentRound, chatMessages] = await Promise.all([
      this.bingoService.getCurrentRound(),
      this.bingoService.getRecentChatMessages(50),
    ]);
    const balance = await this.walletService.getJijiBalance(userId);
    let userGrids: any[] = [];
    if (currentRound) {
      userGrids = await this.bingoService.getUserGridsForRound(currentRound.id, userId);
    }
    const sockets = await this.server.in(BINGO_ROOM).fetchSockets();
    const userIds = sockets
      .map((s) => s.data?.userId as number | undefined)
      .filter((id): id is number => typeof id === 'number');
    const users = await this.bingoService.getUsersByIds(userIds);
    client.emit('bingo:state', {
      currentRound: currentRound
        ? {
            id: currentRound.id,
            phase: currentRound.phase,
            purchaseEndsAt: currentRound.purchaseEndsAt,
            jackpot: parseFloat(currentRound.jackpot.toString()),
            drawnBalls: currentRound.drawnBalls ?? [],
            winnerId: currentRound.winnerId,
            winnerIds: (currentRound as any).winnerIds ?? (currentRound.winnerId ? [currentRound.winnerId] : []),
            createdAt: currentRound.createdAt,
          }
        : null,
      userGrids: userGrids.map((g) => ({
        id: g.id,
        roundId: (g as any).round?.id ?? currentRound?.id,
        numbers: g.numbers,
        gridIndex: g.gridIndex,
      })),
      chatMessages,
      balance,
      onlineUsers: users,
    });
  }

  @SubscribeMessage('bingo:buyGrid')
  async handleBuyGrid(
    @MessageBody() payload: BuyGridDto,
    @ConnectedSocket() client: Socket,
  ) {
    const userId = client.data?.userId;
    if (!userId) return { error: 'Unauthorized' };
    const roundId = payload?.roundId;
    if (roundId == null || (typeof roundId !== 'number' && isNaN(Number(roundId)))) {
      client.emit('bingo:grid:error', {
        error: 'roundId manquant ou invalide. Rechargez la page.',
      });
      return { error: 'roundId required' };
    }
    try {
      const { grids, jackpot, countdownStarted, purchaseEndsAt } =
        await this.bingoService.buyGrid(
          userId,
          Number(roundId),
          Math.min(10, Math.max(1, Number(payload?.count) || 1)),
        );
      const balance = await this.walletService.getJijiBalance(userId);
      client.emit('bingo:grid:purchased', {
        grids: grids.map((g) => ({
          id: g.id,
          roundId: Number(roundId),
          numbers: g.numbers,
          gridIndex: g.gridIndex,
        })),
        jackpot,
        balance,
        countdownStarted,
        purchaseEndsAt: purchaseEndsAt?.toISOString?.() ?? purchaseEndsAt,
      });
      this.server.to(BINGO_ROOM).emit('bingo:round:jackpot', { roundId: Number(roundId), jackpot });
      if (countdownStarted) {
        this.server.to(BINGO_ROOM).emit('bingo:round:countdownStarted', {
          roundId: Number(roundId),
          purchaseEndsAt: purchaseEndsAt?.toISOString?.() ?? purchaseEndsAt,
          jackpot,
        });
      }
      return { success: true, grids, jackpot, balance };
    } catch (error: any) {
      const msg = error?.message || 'Impossible d\'acheter des grilles';
      this.logger.error(`Buy grid error: ${msg}`, error?.stack);
      client.emit('bingo:grid:error', { error: msg });
      return { error: msg };
    }
  }

  @SubscribeMessage('bingo:chat')
  async handleChat(
    @MessageBody() payload: BingoChatMessageDto,
    @ConnectedSocket() client: Socket,
  ) {
    const userId = client.data?.userId;
    if (!userId) return { error: 'Unauthorized' };
    try {
      const message = await this.bingoService.sendChatMessage(userId, payload.content);
      const user = await this.bingoService.getUserForChat(userId);
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
      this.server.to(BINGO_ROOM).emit('bingo:chat:message', chatPayload);
      return { success: true, message: chatPayload };
    } catch (error: any) {
      this.logger.error(`Chat error: ${error?.message}`);
      return { error: error?.message || 'Failed to send message' };
    }
  }
}
