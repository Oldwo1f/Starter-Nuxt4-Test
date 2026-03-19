import {
  Injectable,
  NotFoundException,
  BadRequestException,
  forwardRef,
  Inject,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { BingoRound, BingoRoundPhase } from '../entities/bingo-round.entity';
import { BingoGrid } from '../entities/bingo-grid.entity';
import { BingoChatMessage } from '../entities/bingo-chat-message.entity';
import { BingoSession } from '../entities/bingo-session.entity';
import { User } from '../entities/user.entity';
import { WalletService } from '../wallet/wallet.service';
import { BingoConfigService } from './bingo-config.service';

const SYSTEM_USER_EMAIL = 'system@nunaheritage.local';
const PURCHASE_DURATION_SEC = 15;
const WAITING_FOR_PLAYERS_DATE = new Date('2099-01-01T00:00:00Z');

/** Plages B-I-N-G-O : B=1-15, I=16-30, N=31-45, G=46-60, O=61-75 */
const COLUMN_RANGES: [number, number][] = [
  [1, 15],
  [16, 30],
  [31, 45],
  [46, 60],
  [61, 75],
];

@Injectable()
export class BingoService {
  private systemUserId: number | null = null;

  constructor(
    @InjectRepository(BingoRound)
    private roundRepository: Repository<BingoRound>,
    @InjectRepository(BingoGrid)
    private gridRepository: Repository<BingoGrid>,
    @InjectRepository(BingoChatMessage)
    private chatRepository: Repository<BingoChatMessage>,
    @InjectRepository(BingoSession)
    private sessionRepository: Repository<BingoSession>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private walletService: WalletService,
    @Inject(forwardRef(() => BingoConfigService))
    private configService: BingoConfigService,
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

  /** Génère une grille Bingo 75 valide : 5 colonnes × 5 numéros */
  generateBingo75Grid(): number[][] {
    const grid: number[][] = [];
    for (let col = 0; col < 5; col++) {
      const [min, max] = COLUMN_RANGES[col];
      const pool = Array.from({ length: max - min + 1 }, (_, i) => min + i);
      const shuffled = pool.sort(() => Math.random() - 0.5);
      grid.push(shuffled.slice(0, 5));
    }
    return grid;
  }

  async getOrCreateCurrentSession(): Promise<BingoSession | null> {
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

  async createRound(): Promise<BingoRound> {
    const session = await this.getOrCreateCurrentSession();
    const round = this.roundRepository.create({
      phase: BingoRoundPhase.PURCHASE,
      purchaseEndsAt: WAITING_FOR_PLAYERS_DATE,
      jackpot: 0,
      drawnBalls: [],
      sessionId: session?.id ?? null,
    });
    return await this.roundRepository.save(round);
  }

  async countDistinctUsersWithGrids(roundId: number): Promise<number> {
    const result = await this.gridRepository
      .createQueryBuilder('g')
      .select('COUNT(DISTINCT g.userId)', 'count')
      .where('g.roundId = :roundId', { roundId })
      .getRawOne<{ count: string }>();
    return parseInt(result?.count ?? '0', 10);
  }

  isWaitingForPlayers(purchaseEndsAt: Date): boolean {
    return purchaseEndsAt >= WAITING_FOR_PLAYERS_DATE;
  }

  async getCurrentRound(): Promise<BingoRound | null> {
    const purchaseOrDrawing = await this.roundRepository.findOne({
      where: [
        { phase: BingoRoundPhase.PURCHASE },
        { phase: BingoRoundPhase.DRAWING },
      ],
      order: { createdAt: 'DESC' },
    });
    return purchaseOrDrawing;
  }

  async getRoundById(id: number): Promise<BingoRound> {
    const round = await this.roundRepository.findOne({
      where: { id },
      relations: ['grids'],
    });
    if (!round) {
      throw new NotFoundException(`Round ${id} not found`);
    }
    return round;
  }

  async buyGrid(
    userId: number,
    roundId: number,
    count: number,
  ): Promise<{ grids: BingoGrid[]; jackpot: number; countdownStarted: boolean; purchaseEndsAt: Date }> {
    const round = await this.getRoundById(roundId);
    const roundIdNum = Number(round.id);
    if (!roundIdNum || Number.isNaN(roundIdNum)) {
      throw new BadRequestException('Round invalide');
    }
    if (round.phase !== BingoRoundPhase.PURCHASE) {
      throw new BadRequestException('La phase d\'achat est terminée');
    }
    if (!this.isWaitingForPlayers(round.purchaseEndsAt) && new Date() >= round.purchaseEndsAt) {
      throw new BadRequestException('La phase d\'achat est terminée');
    }
    if (count < 1 || count > 10) {
      throw new BadRequestException('Vous pouvez acheter entre 1 et 10 grilles');
    }
    const bingoConfig = await this.configService.getConfig();
    const gridPrice = bingoConfig.gridPrice ?? 50;
    const cost = count * gridPrice;
    const systemUserId = await this.getSystemUserId();
    await this.walletService.gameDebitJiji(
      userId,
      systemUserId,
      cost,
      `Bingo round #${roundId} - ${count} grille(s)`,
    );
    const existingGrids = await this.gridRepository.count({
      where: { roundId: roundIdNum, userId },
    });
    const grids: BingoGrid[] = [];
    for (let i = 0; i < count; i++) {
      const numbers = this.generateBingo75Grid();
      const result = await this.gridRepository
        .createQueryBuilder()
        .insert()
        .into(BingoGrid)
        .values({
          roundId: roundIdNum,
          userId,
          numbers,
          gridIndex: existingGrids + i,
        })
        .returning(['id', 'roundId', 'userId', 'numbers', 'gridIndex', 'createdAt'])
        .execute();
      const raw = result.raw?.[0];
      if (raw) {
        grids.push(
          this.gridRepository.create({
            id: raw.id,
            roundId: raw.roundId,
            userId: raw.userId,
            numbers: raw.numbers,
            gridIndex: raw.gridIndex,
            createdAt: raw.createdAt,
          }),
        );
      }
    }
    await this.roundRepository.manager.query(
      'UPDATE bingo_rounds SET jackpot = jackpot + $1 WHERE id = $2',
      [cost, roundIdNum],
    );
    const updatedRound = await this.getRoundById(roundIdNum);
    const jackpot = parseFloat(updatedRound.jackpot.toString());
    let countdownStarted = false;
    if (this.isWaitingForPlayers(updatedRound.purchaseEndsAt)) {
      const distinctUsers = await this.countDistinctUsersWithGrids(roundIdNum);
      if (distinctUsers >= 2) {
        const purchaseEndsAt = new Date(Date.now() + PURCHASE_DURATION_SEC * 1000);
        await this.roundRepository.update(roundIdNum, { purchaseEndsAt });
        countdownStarted = true;
      }
    }
    return {
      grids,
      jackpot,
      countdownStarted,
      purchaseEndsAt: countdownStarted
        ? new Date(Date.now() + PURCHASE_DURATION_SEC * 1000)
        : updatedRound.purchaseEndsAt,
    };
  }

  async getUserGridsForRound(roundId: number, userId: number): Promise<BingoGrid[]> {
    return await this.gridRepository.find({
      where: { roundId, userId },
      relations: ['round'],
      order: { gridIndex: 'ASC' },
    });
  }

  async startDrawing(roundId: number): Promise<BingoRound> {
    const round = await this.getRoundById(roundId);
    if (round.phase !== BingoRoundPhase.PURCHASE) {
      throw new BadRequestException('Round already in drawing or ended');
    }
    round.phase = BingoRoundPhase.DRAWING;
    round.drawingStartedAt = new Date();
    return await this.roundRepository.save(round);
  }

  /** Tire une boule et vérifie si des joueurs ont gagné (ex æquo). Retourne winnerIds ou []. */
  async drawNextBall(roundId: number): Promise<{ ball: number; winnerIds: number[] }> {
    const round = await this.getRoundById(roundId);
    if (round.phase !== BingoRoundPhase.DRAWING) {
      throw new BadRequestException('Round not in drawing phase');
    }
    const rawDrawn = (round.drawnBalls as unknown[]) ?? [];
    const drawn = rawDrawn.map(Number).filter((n) => n >= 1 && n <= 75);
    if (drawn.length >= 75) {
      return { ball: -1, winnerIds: [] };
    }
    const available = Array.from({ length: 75 }, (_, i) => i + 1).filter(
      (n) => !drawn.includes(n),
    );
    const ball = available[Math.floor(Math.random() * available.length)];
    drawn.push(ball);
    round.drawnBalls = drawn;
    await this.roundRepository.save(round);
    const winnerIds = await this.checkWinners(roundId);
    return { ball, winnerIds };
  }

  /** Vérifie quelles grilles ont tous leurs numéros tirés. Retourne les userId gagnants (ex æquo). */
  async checkWinnersForRound(roundId: number): Promise<number[]> {
    return this.checkWinners(roundId);
  }

  /** Vérifie quelles grilles ont tous leurs numéros tirés. Retourne les userId gagnants (ex æquo). */
  private async checkWinners(roundId: number): Promise<number[]> {
    const round = await this.getRoundById(roundId);
    const rawDrawn = (round.drawnBalls as unknown[]) ?? [];
    const drawn = new Set(rawDrawn.map((x) => Number(x)));
    const winnerIds = new Set<number>();
    let grids = round.grids ?? [];
    if (grids.length === 0) {
      grids = await this.gridRepository.find({
        where: { roundId },
      });
    }
    if (grids.length === 0) {
      const rawGrids = await this.gridRepository.manager.query<{ id: number; userId: number; numbers: unknown }[]>(
        'SELECT id, "userId", numbers FROM bingo_grids WHERE "roundId" = $1',
        [roundId],
      );
      for (const row of rawGrids) {
        const numbers = (row.numbers as number[][]) ?? [];
        const allNumbers: number[] = [];
        for (const col of numbers) {
          for (const n of col) {
            allNumbers.push(Number(n));
          }
        }
        if (allNumbers.length === 25 && allNumbers.every((n) => drawn.has(n))) {
          winnerIds.add(row.userId);
        }
      }
      return [...winnerIds];
    }
    for (const grid of grids) {
      const numbers = (grid.numbers as unknown[][]) ?? [];
      const allNumbers: number[] = [];
      for (const col of numbers) {
        for (const n of col) {
          allNumbers.push(Number(n));
        }
      }
      if (allNumbers.length === 25 && allNumbers.every((n) => drawn.has(n))) {
        winnerIds.add(grid.userId);
      }
    }
    return [...winnerIds];
  }

  /** Force la fin du round sans gagnant (ex: 75 boules tirées, personne n'a gagné) */
  async forceEndRoundNoWinner(roundId: number): Promise<BingoRound> {
    const round = await this.getRoundById(roundId);
    if (round.phase !== BingoRoundPhase.DRAWING) {
      throw new BadRequestException('Round not in drawing phase');
    }
    round.phase = BingoRoundPhase.ENDED;
    round.winnerId = null;
    round.winnerIds = null;
    round.endedAt = new Date();
    return await this.roundRepository.save(round);
  }

  async declareWinners(roundId: number, winnerIds: number[]): Promise<BingoRound> {
    const round = await this.getRoundById(roundId);
    if (round.phase !== BingoRoundPhase.DRAWING) {
      throw new BadRequestException('Round not in drawing phase');
    }
    const jackpot = parseFloat(round.jackpot.toString());
    const count = winnerIds.length;
    if (jackpot > 0 && count > 0) {
      const systemUserId = await this.getSystemUserId();
      // Jetons indivisibles : arrondi au supérieur (ex: 9/2 → 5 chacun, 10/3 → 4 chacun)
      const sharePerWinner = Math.ceil(jackpot / count);
      for (const winnerId of winnerIds) {
        await this.walletService.gameCreditJiji(
          systemUserId,
          winnerId,
          sharePerWinner,
          `Gain Bingo round #${roundId}${count > 1 ? ' (ex æquo)' : ''}`,
        );
      }
    }
    round.phase = BingoRoundPhase.ENDED;
    round.winnerId = winnerIds[0] ?? null;
    round.winnerIds = winnerIds.length > 0 ? winnerIds : null;
    round.endedAt = new Date();
    if (round.sessionId) {
      const session = await this.sessionRepository.findOne({
        where: { id: round.sessionId },
      });
      if (session) {
        const current = parseFloat(session.bankNet.toString());
        session.bankNet = Math.round((current - jackpot) * 100) / 100;
        await this.sessionRepository.save(session);
      }
    }
    return await this.roundRepository.save(round);
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

  async getWinnerDisplayName(userId: number): Promise<string> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      select: ['firstName', 'lastName'],
    });
    if (!user) return `Joueur #${userId}`;
    const parts = [user.firstName, user.lastName].filter(Boolean);
    return parts.length ? parts.join(' ') : `Joueur #${userId}`;
  }

  async getWinnersDisplayInfo(userIds: number[]): Promise<{ id: number; name: string }[]> {
    if (userIds.length === 0) return [];
    const unique = [...new Set(userIds)];
    const users = await this.userRepository.find({
      where: unique.map((id) => ({ id })),
      select: ['id', 'firstName', 'lastName'],
    });
    return users.map((u) => {
      const parts = [u.firstName, u.lastName].filter(Boolean);
      const name = parts.length ? parts.join(' ') : `Joueur #${u.id}`;
      return { id: u.id, name };
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

  /** Dev : diagnostic pour la détection du gagnant (appelable pendant un tirage) */
  async getWinnerCheckDebug(): Promise<{
    roundId: number | null;
    phase: string;
    drawnCount: number;
    drawnSample: number[];
    gridCount: number;
    grids: { gridId: number; userId: number; allNumbers: number[]; matchedCount: number; isWinner: boolean }[];
    allGridsInDb: { id: number; roundId: number; userId: number }[];
  }> {
    const current = await this.getCurrentRound();
    const allGridsInDb = await this.gridRepository.manager
      .query(
        'SELECT id, "roundId", "userId" FROM bingo_grids ORDER BY "createdAt" DESC LIMIT 20',
      )
      .then((rows: { id: number; roundId: number; userId: number }[]) =>
        rows.map((r) => ({ id: r.id, roundId: r.roundId, userId: r.userId })),
      )
      .catch(() => [] as { id: number; roundId: number; userId: number }[]);

    if (!current) {
      return {
        roundId: null,
        phase: 'none',
        drawnCount: 0,
        drawnSample: [],
        gridCount: 0,
        grids: [],
        allGridsInDb,
      };
    }
    const round = await this.getRoundById(current.id);
    const rawDrawn = ((round.drawnBalls as unknown[]) ?? []).map(Number);
    const drawn = new Set(rawDrawn);
    const grids =
      round.grids?.length > 0
        ? round.grids
        : await this.gridRepository.find({
            where: { roundId: round.id },
          });
    const gridInfos = grids.map((grid) => {
      const numbers = (grid.numbers as unknown[][]) ?? [];
      const allNumbers: number[] = [];
      for (const col of numbers) {
        for (const n of col) {
          allNumbers.push(Number(n));
        }
      }
      const matchedCount = allNumbers.filter((n) => drawn.has(n)).length;
      const isWinner = allNumbers.length === 25 && matchedCount === 25;
      return {
        gridId: grid.id,
        userId: grid.userId,
        allNumbers,
        matchedCount,
        isWinner,
      };
    });
    return {
      roundId: round.id,
      phase: round.phase,
      drawnCount: rawDrawn.length,
      drawnSample: rawDrawn.slice(-5),
      gridCount: grids.length,
      grids: gridInfos,
      allGridsInDb,
    };
  }

  /** Dev uniquement : force la fin du round en cours et crée un nouveau round */
  async forceRestartForDev(): Promise<BingoRound> {
    const current = await this.getCurrentRound();
    if (current) {
      current.phase = BingoRoundPhase.ENDED;
      current.winnerId = null;
      current.winnerIds = null;
      await this.roundRepository.save(current);
    }
    return await this.createRound();
  }

  async getSessionsWithRounds(limit = 50) {
    const sessions = await this.sessionRepository.find({
      relations: ['rounds'],
      order: { openedAt: 'DESC' },
      take: limit,
    });
    return sessions.map((s) => ({
      id: s.id,
      openedAt: s.openedAt,
      closedAt: s.closedAt,
      bankNet: parseFloat(s.bankNet.toString()),
      roundCount: s.rounds?.length ?? 0,
      rounds: (s.rounds ?? []).map((r) => ({
        id: r.id,
        phase: r.phase,
        jackpot: parseFloat(r.jackpot.toString()),
        winnerId: r.winnerId,
        createdAt: r.createdAt,
      })),
    }));
  }
}
