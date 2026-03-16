import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { KikiriDraw, KikiriDrawStatus } from '../entities/kikiri-draw.entity';
import { KikiriBet, KikiriBetResult } from '../entities/kikiri-bet.entity';
import { KikiriChatMessage } from '../entities/kikiri-chat-message.entity';
import { User } from '../entities/user.entity';
import { WalletService } from '../wallet/wallet.service';

const SYSTEM_USER_EMAIL = 'system@nunaheritage.local';
const BETTING_DURATION_MS = 5 * 60 * 1000;

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
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private walletService: WalletService,
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

  async createDraw() {
    const bettingEndsAt = new Date(Date.now() + BETTING_DURATION_MS);
    const draw = this.drawRepository.create({
      status: KikiriDrawStatus.BETTING,
      bettingEndsAt,
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
    const graceEnd = new Date(draw.bettingEndsAt.getTime() + 5000);
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
    await this.walletService.gameDebit(
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
        await this.walletService.gameCredit(
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
    return await this.drawRepository.save(draw);
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
          }
        : null,
    }));
  }

  async getUserForChat(userId: number) {
    return await this.userRepository.findOne({
      where: { id: userId },
      select: ['id', 'firstName', 'lastName', 'email'],
    });
  }

  async getBetsByDraw(drawId: number) {
    return await this.betRepository.find({
      where: { drawId },
      relations: ['user'],
      order: { createdAt: 'ASC' },
    });
  }
}
