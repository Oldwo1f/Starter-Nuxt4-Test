import {
  Injectable,
  NotFoundException,
  BadRequestException,
  forwardRef,
  Inject,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { KikiriDraw, KikiriDrawStatus } from '../entities/kikiri-draw.entity';
import { KikiriBet, KikiriBetResult } from '../entities/kikiri-bet.entity';
import { KikiriChatMessage } from '../entities/kikiri-chat-message.entity';
import { KikiriSession } from '../entities/kikiri-session.entity';
import { User } from '../entities/user.entity';
import { WalletService } from '../wallet/wallet.service';
import { KikiriConfigService } from './kikiri-config.service';

const SYSTEM_USER_EMAIL = 'system@nunaheritage.local';
const DEFAULT_BETTING_DURATION_SEC = 300;

@Injectable()
export class KikiriService {
  private systemUserId: number | null = null;

  constructor(
    @InjectRepository(KikiriDraw)
    private drawRepository: Repository<KikiriDraw>,
    @InjectRepository(KikiriBet)
    private betRepository: Repository<KikiriBet>,
    @InjectRepository(KikiriChatMessage)
    private chatRepository: Repository<KikiriChatMessage>,
    @InjectRepository(KikiriSession)
    private sessionRepository: Repository<KikiriSession>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private walletService: WalletService,
    @Inject(forwardRef(() => KikiriConfigService))
    private configService: KikiriConfigService,
  ) {}

  async getSystemUserId(): Promise<number> {
    if (this.systemUserId) return this.systemUserId;
    const systemUser = await this.userRepository.findOne({
      where: { email: SYSTEM_USER_EMAIL },
    });
    if (!systemUser) {
      throw new NotFoundException('System user not found. Run migrate:kikiri.');
    }
    this.systemUserId = systemUser.id;
    return this.systemUserId;
  }

  async getSessionsWithDraws(limit = 50) {
    const sessions = await this.sessionRepository.find({
      relations: ['draws'],
      order: { openedAt: 'DESC' },
      take: limit,
    });
    return sessions.map((s) => ({
      id: s.id,
      openedAt: s.openedAt,
      closedAt: s.closedAt,
      bankNet: parseFloat(s.bankNet.toString()),
      drawCount: s.draws?.length ?? 0,
      draws: (s.draws ?? []).map((d) => ({
        id: d.id,
        dice1: d.dice1,
        dice2: d.dice2,
        dice3: d.dice3,
        status: d.status,
        resolvedAt: d.resolvedAt,
      })),
    }));
  }

  async getOrCreateCurrentSession(): Promise<KikiriSession | null> {
    const isOpen = await this.configService.isGameOpen();
    if (!isOpen) return null;
    const openSession = await this.sessionRepository.findOne({
      where: { closedAt: IsNull() },
      order: { openedAt: 'DESC' },
    });
    if (openSession) return openSession;
    const session = this.sessionRepository.create({
      openedAt: new Date(),
      bankNet: 0,
    });
    return await this.sessionRepository.save(session);
  }

  async closeCurrentSession(): Promise<void> {
    const session = await this.sessionRepository.findOne({
      where: { closedAt: IsNull() },
      order: { openedAt: 'DESC' },
    });
    if (session) {
      session.closedAt = new Date();
      await this.sessionRepository.save(session);
    }
  }

  async createDraw() {
    const config = await this.configService.getConfig();
    const durationSec = config.bettingDurationSeconds ?? DEFAULT_BETTING_DURATION_SEC;
    const durationMs = Math.max(60, Math.min(3600, durationSec)) * 1000;
    const session = await this.getOrCreateCurrentSession();
    const bettingEndsAt = new Date(Date.now() + durationMs);
    const draw = this.drawRepository.create({
      status: KikiriDrawStatus.BETTING,
      bettingEndsAt,
      sessionId: session?.id ?? null,
    });
    return await this.drawRepository.save(draw);
  }

  async getCurrentDraw() {
    return await this.drawRepository.findOne({
      where: { status: KikiriDrawStatus.BETTING },
      order: { createdAt: 'DESC' },
    });
  }

  async getDrawById(id: number) {
    const draw = await this.drawRepository.findOne({
      where: { id },
      relations: ['bets'],
    });
    if (!draw) {
      throw new NotFoundException(`Draw ${id} not found`);
    }
    return draw;
  }

  async getDrawHistory(limit = 10) {
    return await this.drawRepository.find({
      where: { status: KikiriDrawStatus.RESOLVED },
      order: { resolvedAt: 'DESC' },
      take: limit,
    });
  }

  async getUserBetsByNumberForDraw(drawId: number, userId: number) {
    const bets = await this.betRepository.find({
      where: { drawId, userId },
    });
    const result: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
    for (const bet of bets) {
      const num = Number(bet.number);
      if (num >= 1 && num <= 6) {
        result[num] = (result[num] || 0) + parseFloat(bet.amount.toString());
      }
    }
    return result;
  }

  async getUserNetForDraw(drawId: number, userId: number): Promise<number> {
    const bets = await this.betRepository.find({
      where: { drawId, userId },
    });
    let totalStaked = 0;
    let totalWon = 0;
    for (const bet of bets) {
      totalStaked += parseFloat(bet.amount.toString());
      if (bet.result === KikiriBetResult.WIN && bet.winAmount) {
        totalWon += parseFloat(bet.winAmount.toString());
      }
    }
    return Math.round(totalWon - totalStaked);
  }

  async getDrawHistoryWithUserResults(userId: number, limit = 10) {
    const draws = await this.getDrawHistory(limit);
    return await Promise.all(
      draws.map(async (draw) => {
        const [userNet, userBets] = await Promise.all([
          this.getUserNetForDraw(draw.id, userId),
          this.getUserBetsByNumberForDraw(draw.id, userId),
        ]);
        return { ...draw, userNet, userBets };
      }),
    );
  }

  async placeBet(userId: number, drawId: number, number: number, amount: number) {
    const draw = await this.getDrawById(drawId);
    if (draw.status !== KikiriDrawStatus.BETTING) {
      throw new BadRequestException('Betting is closed for this draw');
    }
    const graceEnd = new Date(draw.bettingEndsAt.getTime() + 15000);
    if (new Date() >= graceEnd) {
      throw new BadRequestException('Betting period has ended');
    }
    if (number < 1 || number > 6) {
      throw new BadRequestException('Number must be between 1 and 6');
    }
    if (amount <= 0) {
      throw new BadRequestException('Amount must be greater than 0');
    }
    const systemUserId = await this.getSystemUserId();
    await this.walletService.gameDebitJiji(
      userId,
      systemUserId,
      amount,
      `Mise Kikiri tirage #${drawId} sur le ${number}`,
    );
    const bet = this.betRepository.create({
      drawId,
      userId,
      number,
      amount,
      result: KikiriBetResult.PENDING,
    });
    return await this.betRepository.save(bet);
  }

  async moveBet(userId: number, drawId: number, from: number, to: number) {
    const draw = await this.getDrawById(drawId);
    if (draw.status !== KikiriDrawStatus.BETTING) {
      throw new BadRequestException('Betting is closed for this draw');
    }
    const graceEnd = new Date(draw.bettingEndsAt.getTime() + 15000);
    if (new Date() >= graceEnd) {
      throw new BadRequestException('Betting period has ended');
    }
    if (from < 1 || from > 6 || to < 1 || to > 6) {
      throw new BadRequestException('Number must be between 1 and 6');
    }
    if (from === to) {
      throw new BadRequestException('Source and target must be different');
    }
    const bet = await this.betRepository.findOne({
      where: { userId, drawId, number: from },
      order: { id: 'ASC' },
    });
    if (!bet) {
      throw new BadRequestException('No bet found on source case');
    }
    bet.number = to;
    return await this.betRepository.save(bet);
  }

  /** Déplace toutes les mises de l'utilisateur de `from` vers `to` (même tirage). */
  async moveAllBets(userId: number, drawId: number, from: number, to: number) {
    const draw = await this.getDrawById(drawId);
    if (draw.status !== KikiriDrawStatus.BETTING) {
      throw new BadRequestException('Betting is closed for this draw');
    }
    const graceEnd = new Date(draw.bettingEndsAt.getTime() + 15000);
    if (new Date() >= graceEnd) {
      throw new BadRequestException('Betting period has ended');
    }
    if (from < 1 || from > 6 || to < 1 || to > 6) {
      throw new BadRequestException('Number must be between 1 and 6');
    }
    if (from === to) {
      throw new BadRequestException('Source and target must be different');
    }
    const bets = await this.betRepository.find({
      where: { userId, drawId, number: from },
      order: { id: 'ASC' },
    });
    if (bets.length === 0) {
      throw new BadRequestException('No bet found on source case');
    }
    for (const bet of bets) {
      bet.number = to;
    }
    return await this.betRepository.save(bets);
  }

  rollDice(): number {
    return Math.floor(Math.random() * 6) + 1;
  }

  async rollAndRevealDraw(drawId: number) {
    const draw = await this.getDrawById(drawId);
    if (draw.status !== KikiriDrawStatus.BETTING) {
      throw new BadRequestException('Draw already resolved or in progress');
    }
    draw.status = KikiriDrawStatus.REVEALING;
    draw.dice1 = this.rollDice();
    draw.dice2 = this.rollDice();
    draw.dice3 = this.rollDice();
    draw.resolvedAt = new Date();
    return await this.drawRepository.save(draw);
  }

  /** Bilan banque pour un tirage : totalStaked - totalPaidOut (positif = banque gagne) */
  async getBankNetForDraw(drawId: number): Promise<number> {
    const bets = await this.betRepository.find({ where: { drawId } });
    let totalStaked = 0;
    let totalPaidOut = 0;
    for (const bet of bets) {
      totalStaked += parseFloat(bet.amount.toString());
      if (bet.result === KikiriBetResult.WIN && bet.winAmount) {
        totalPaidOut += parseFloat(bet.winAmount.toString());
      }
    }
    return Math.round((totalStaked - totalPaidOut) * 100) / 100;
  }

  async settleBetsAndResolveDraw(drawId: number) {
    const draw = await this.getDrawById(drawId);
    if (draw.status !== KikiriDrawStatus.REVEALING) {
      throw new BadRequestException('Draw must be in revealing state');
    }
    const systemUserId = await this.getSystemUserId();
    const dice = [draw.dice1, draw.dice2, draw.dice3];
    const bets = await this.betRepository.find({
      where: { drawId },
      relations: ['user'],
    });
    for (const bet of bets) {
      const betNum = Number(bet.number);
      const count = dice.filter((d) => Number(d) === betNum).length;
      if (count > 0) {
        const multiplier = 1 + count;
        const winAmount =
          Math.round(parseFloat(bet.amount.toString()) * multiplier * 100) /
          100;
        bet.result = KikiriBetResult.WIN;
        bet.winAmount = winAmount;
        await this.walletService.gameCreditJiji(
          systemUserId,
          bet.userId,
          winAmount,
          `Gain Kikiri tirage #${drawId} (${count}× le ${bet.number} = ${multiplier}x)`,
        );
      } else {
        bet.result = KikiriBetResult.LOSE;
      }
      await this.betRepository.save(bet);
    }
    draw.status = KikiriDrawStatus.RESOLVED;
    await this.drawRepository.save(draw);
    if (draw.sessionId) {
      const bankNet = await this.getBankNetForDraw(drawId);
      const session = await this.sessionRepository.findOne({
        where: { id: draw.sessionId },
      });
      if (session) {
        const current = parseFloat(session.bankNet.toString());
        session.bankNet = Math.round((current + bankNet) * 100) / 100;
        await this.sessionRepository.save(session);
      }
    }
    return draw;
  }

  async sendChatMessage(userId: number, content: string) {
    const message = this.chatRepository.create({
      userId,
      content: content.trim(),
    });
    return await this.chatRepository.save(message);
  }

  async getRecentChatMessages(limit = 50) {
    const messages = await this.chatRepository.find({
      relations: ['user'],
      order: { createdAt: 'DESC' },
      take: limit,
    });
    return messages.reverse().map((m) => ({
      id: m.id,
      userId: m.userId,
      content: m.content,
      createdAt: m.createdAt,
      user: m.user
        ? {
            id: m.user.id,
            firstName: m.user.firstName,
            lastName: m.user.lastName,
            email: m.user.email,
            avatarImage: m.user.avatarImage,
          }
        : null,
    }));
  }

  async getUserForChat(userId: number) {
    return await this.userRepository.findOne({
      where: { id: userId },
      select: ['id', 'firstName', 'lastName', 'email', 'avatarImage'],
    });
  }

  async getUsersByIds(userIds: number[]) {
    if (userIds.length === 0) return [];
    const unique = [...new Set(userIds)];
    const users = await this.userRepository.find({
      where: unique.map((id) => ({ id })),
      select: ['id', 'firstName', 'avatarImage'],
    });
    return users.map((u) => ({
      id: u.id,
      firstName: u.firstName ?? null,
      avatarImage: u.avatarImage ?? null,
    }));
  }

  async getBetsByDraw(drawId: number) {
    return await this.betRepository.find({
      where: { drawId },
      relations: ['user'],
      order: { createdAt: 'ASC' },
    });
  }

  async getAllBetsByCaseForDraw(drawId: number) {
    const bets = await this.betRepository.find({
      where: { drawId },
      relations: ['user'],
    });
    const byCase: Record<
      number,
      { userId: number; amount: number; user: { id: number; firstName: string | null; avatarImage: string | null } }[]
    > = { 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] };
    const userSums: Record<string, number> = {};
    for (const bet of bets) {
      const num = Number(bet.number);
      if (num < 1 || num > 6) continue;
      const key = `${bet.userId}-${num}`;
      userSums[key] = (userSums[key] || 0) + parseFloat(bet.amount.toString());
    }
    const seen: Record<string, boolean> = {};
    for (const bet of bets) {
      const num = Number(bet.number);
      if (num < 1 || num > 6) continue;
      const key = `${bet.userId}-${num}`;
      if (seen[key]) continue;
      seen[key] = true;
      const amount = Math.round(userSums[key] || 0);
      if (amount <= 0) continue;
      byCase[num].push({
        userId: bet.userId,
        amount,
        user: {
          id: bet.user?.id ?? bet.userId,
          firstName: bet.user?.firstName ?? null,
          avatarImage: bet.user?.avatarImage ?? null,
        },
      });
    }
    return byCase;
  }
}
