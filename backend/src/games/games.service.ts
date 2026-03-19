import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cron } from '@nestjs/schedule';
import { KikiriBet, KikiriBetResult } from '../entities/kikiri-bet.entity';
import { KikiriDraw } from '../entities/kikiri-draw.entity';
import { BingoRound, BingoRoundPhase } from '../entities/bingo-round.entity';
import { GamePeriodWinner, GameType, PeriodType } from '../entities/game-period-winner.entity';
import { User } from '../entities/user.entity';

const POINTS_DAY = 1;
const POINTS_WEEK = 5;
const POINTS_MONTH = 20;

@Injectable()
export class GamesService {
  constructor(
    @InjectRepository(KikiriBet)
    private kikiriBetRepository: Repository<KikiriBet>,
    @InjectRepository(KikiriDraw)
    private kikiriDrawRepository: Repository<KikiriDraw>,
    @InjectRepository(BingoRound)
    private bingoRoundRepository: Repository<BingoRound>,
    @InjectRepository(GamePeriodWinner)
    private gamePeriodWinnerRepository: Repository<GamePeriodWinner>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  /** Get yesterday's date (YYYY-MM-DD) - uses GAMES_TIMEZONE or UTC */
  private getYesterdayDate(): string {
    const tz = process.env.GAMES_TIMEZONE || 'UTC';
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    const str = formatter.format(now);
    const [y, m, d] = str.split('-').map(Number);
    const date = new Date(Date.UTC(y, m - 1, d));
    date.setUTCDate(date.getUTCDate() - 1);
    return date.toISOString().split('T')[0];
  }

  /** Get last week's Monday date (YYYY-MM-DD) */
  private getLastWeekStart(): string {
    const tz = process.env.GAMES_TIMEZONE || 'UTC';
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    const str = formatter.format(now);
    const [y, m, d] = str.split('-').map(Number);
    const date = new Date(Date.UTC(y, m - 1, d));
    const dow = date.getUTCDay();
    const daysToMonday = dow === 0 ? 6 : dow - 1;
    date.setUTCDate(date.getUTCDate() - daysToMonday - 7);
    return date.toISOString().split('T')[0];
  }

  /** Get last month's first day (YYYY-MM-DD) */
  private getLastMonthStart(): string {
    const tz = process.env.GAMES_TIMEZONE || 'UTC';
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    const str = formatter.format(now);
    const [y, m] = str.split('-').map(Number);
    const date = new Date(Date.UTC(y, m - 1, 1));
    date.setUTCMonth(date.getUTCMonth() - 1);
    return date.toISOString().split('T')[0];
  }

  /** Compute Jiji won per user for Kikiri in a date range (UTC timestamps) */
  private async getKikiriJijiByUser(start: Date, end: Date): Promise<Map<number, number>> {
    const result = await this.kikiriBetRepository
      .createQueryBuilder('bet')
      .innerJoin('bet.draw', 'draw')
      .select('bet.userId', 'userId')
      .addSelect('SUM(CAST(bet.winAmount AS DECIMAL))', 'total')
      .where('bet.result = :result', { result: KikiriBetResult.WIN })
      .andWhere('draw.resolvedAt IS NOT NULL')
      .andWhere('draw.resolvedAt >= :start', { start })
      .andWhere('draw.resolvedAt < :end', { end })
      .groupBy('bet.userId')
      .getRawMany<{ userId: number; total: string }>();

    const map = new Map<number, number>();
    for (const row of result) {
      const total = parseFloat(row.total) || 0;
      if (total > 0) {
        map.set(row.userId, total);
      }
    }
    return map;
  }

  /** Compute Jiji won per user for Bingo in a date range (UTC timestamps) */
  private async getBingoJijiByUser(start: Date, end: Date): Promise<Map<number, number>> {
    const rounds = await this.bingoRoundRepository.find({
      where: {
        phase: BingoRoundPhase.ENDED,
      },
    });

    const map = new Map<number, number>();
    for (const round of rounds) {
      const winnerIds = round.winnerIds ?? (round.winnerId ? [round.winnerId] : []);
      if (winnerIds.length === 0) continue;

      const endedAt = round.endedAt ?? round.createdAt;
      if (!endedAt || endedAt < start || endedAt >= end) continue;

      const jackpot = parseFloat(round.jackpot?.toString?.() ?? '0');
      if (jackpot <= 0) continue;

      const share = Math.ceil(jackpot / winnerIds.length);
      for (const uid of winnerIds) {
        const current = map.get(uid) ?? 0;
        map.set(uid, current + share);
      }
    }
    return map;
  }

  /** Offset in hours: midnight in games timezone = this hour UTC. Tahiti UTC-10 => 10 */
  private getTimezoneOffsetHours(): number {
    const tz = process.env.GAMES_TIMEZONE || 'UTC';
    if (tz === 'UTC') return 0;
    const d = new Date(Date.UTC(2025, 6, 15, 12, 0, 0));
    const utc = d.getTime();
    const localStr = d.toLocaleString('en-US', { timeZone: tz });
    const local = new Date(localStr).getTime();
    return Math.round((utc - local) / (1000 * 60 * 60));
  }

  /** Get date range for a day (returns UTC start/end for that day in games timezone) */
  private getDayRangeInUtc(dateStr: string): { start: Date; end: Date } {
    const [y, m, d] = dateStr.split('-').map(Number);
    const offset = this.getTimezoneOffsetHours();
    const start = new Date(Date.UTC(y, m - 1, d, offset, 0, 0, 0));
    const end = new Date(Date.UTC(y, m - 1, d + 1, offset, 0, 0, 0));
    return { start, end };
  }

  /** Get date range for week starting Monday */
  private getWeekRangeInUtc(weekStartStr: string): { start: Date; end: Date } {
    const [y, m, d] = weekStartStr.split('-').map(Number);
    const offset = this.getTimezoneOffsetHours();
    const start = new Date(Date.UTC(y, m - 1, d, offset, 0, 0, 0));
    const end = new Date(Date.UTC(y, m - 1, d + 7, offset, 0, 0, 0));
    return { start, end };
  }

  /** Get date range for month */
  private getMonthRangeInUtc(monthStartStr: string): { start: Date; end: Date } {
    const [y, m] = monthStartStr.split('-').map(Number);
    const offset = this.getTimezoneOffsetHours();
    const start = new Date(Date.UTC(y, m - 1, 1, offset, 0, 0, 0));
    const end = new Date(Date.UTC(y, m, 1, offset, 0, 0, 0));
    return { start, end };
  }

  private async saveWinners(
    gameType: GameType,
    periodType: PeriodType,
    periodStart: string,
    jijiByUser: Map<number, number>,
  ): Promise<void> {
    if (jijiByUser.size === 0) return;

    const maxJiji = Math.max(...jijiByUser.values());
    const periodDate = new Date(periodStart);

    for (const [userId, jiji] of jijiByUser) {
      if (jiji < maxJiji) continue;
      const existing = await this.gamePeriodWinnerRepository.findOne({
        where: { gameType, periodType, periodStart: periodDate, userId },
      });
      if (existing) continue;

      const winner = this.gamePeriodWinnerRepository.create({
        gameType,
        periodType,
        periodStart: periodDate,
        userId,
        jijiWon: jiji,
      });
      await this.gamePeriodWinnerRepository.save(winner);
    }
  }

  @Cron('0 0 * * *', { timeZone: 'Pacific/Tahiti' })
  async computeDailyWinners(): Promise<void> {
    const periodStart = this.getYesterdayDate();
    const { start, end } = this.getDayRangeInUtc(periodStart);

    for (const gameType of [GameType.KIKIRI, GameType.BINGO]) {
      const jijiByUser =
        gameType === GameType.KIKIRI
          ? await this.getKikiriJijiByUser(start, end)
          : await this.getBingoJijiByUser(start, end);
      await this.saveWinners(gameType, PeriodType.DAY, periodStart, jijiByUser);
    }
  }

  @Cron('0 0 * * 0', { timeZone: 'Pacific/Tahiti' })
  async computeWeeklyWinners(): Promise<void> {
    const periodStart = this.getLastWeekStart();
    const { start, end } = this.getWeekRangeInUtc(periodStart);

    for (const gameType of [GameType.KIKIRI, GameType.BINGO]) {
      const jijiByUser =
        gameType === GameType.KIKIRI
          ? await this.getKikiriJijiByUser(start, end)
          : await this.getBingoJijiByUser(start, end);
      await this.saveWinners(gameType, PeriodType.WEEK, periodStart, jijiByUser);
    }
  }

  @Cron('0 0 1 * *', { timeZone: 'Pacific/Tahiti' })
  async computeMonthlyWinners(): Promise<void> {
    const periodStart = this.getLastMonthStart();
    const { start, end } = this.getMonthRangeInUtc(periodStart);

    for (const gameType of [GameType.KIKIRI, GameType.BINGO]) {
      const jijiByUser =
        gameType === GameType.KIKIRI
          ? await this.getKikiriJijiByUser(start, end)
          : await this.getBingoJijiByUser(start, end);
      await this.saveWinners(gameType, PeriodType.MONTH, periodStart, jijiByUser);
    }
  }

  /** Leaderboard score = day*1 + week*5 + month*20 */
  async getLeaderboard(
    gameType: GameType,
    limit = 100,
  ): Promise<{ rank: number; userId: number; displayName: string; avatarImage: string | null; score: number; dailyWins: number; weeklyWins: number; monthlyWins: number }[]> {
    const winners = await this.gamePeriodWinnerRepository.find({
      where: { gameType },
      relations: ['user'],
    });

    const byUser = new Map<
      number,
      { dailyWins: number; weeklyWins: number; monthlyWins: number }
    >();

    for (const w of winners) {
      const current = byUser.get(w.userId) ?? {
        dailyWins: 0,
        weeklyWins: 0,
        monthlyWins: 0,
      };
      if (w.periodType === PeriodType.DAY) current.dailyWins++;
      else if (w.periodType === PeriodType.WEEK) current.weeklyWins++;
      else if (w.periodType === PeriodType.MONTH) current.monthlyWins++;
      byUser.set(w.userId, current);
    }

    const userIds = [...byUser.keys()];
    const users = await this.userRepository.find({
      where: userIds.map((id) => ({ id })),
      select: ['id', 'firstName', 'lastName', 'avatarImage'],
    });
    const userMap = new Map(users.map((u) => [u.id, u]));

    const rows: {
      rank: number;
      userId: number;
      displayName: string;
      avatarImage: string | null;
      score: number;
      dailyWins: number;
      weeklyWins: number;
      monthlyWins: number;
    }[] = [];

    for (const [userId, counts] of byUser) {
      const score =
        counts.dailyWins * POINTS_DAY +
        counts.weeklyWins * POINTS_WEEK +
        counts.monthlyWins * POINTS_MONTH;
      const user = userMap.get(userId);
      const displayName =
        user?.firstName ?? `Joueur ${userId}`;
      rows.push({
        rank: 0,
        userId,
        displayName,
        avatarImage: user?.avatarImage ?? null,
        score,
        dailyWins: counts.dailyWins,
        weeklyWins: counts.weeklyWins,
        monthlyWins: counts.monthlyWins,
      });
    }

    rows.sort((a, b) => b.score - a.score);
    const limited = rows.slice(0, limit);
    limited.forEach((r, i) => {
      r.rank = i + 1;
    });
    return limited;
  }

  /** Get the most recent winner for each period type (day, week, month) */
  async getLatestWinners(
    gameType: GameType,
  ): Promise<{
    day: { userId: number; displayName: string; avatarImage: string | null; periodStart: string } | null;
    week: { userId: number; displayName: string; avatarImage: string | null; periodStart: string } | null;
    month: { userId: number; displayName: string; avatarImage: string | null; periodStart: string } | null;
  }> {
    const result = { day: null, week: null, month: null } as {
      day: { userId: number; displayName: string; avatarImage: string | null; periodStart: string } | null;
      week: { userId: number; displayName: string; avatarImage: string | null; periodStart: string } | null;
      month: { userId: number; displayName: string; avatarImage: string | null; periodStart: string } | null;
    };

    for (const periodType of [PeriodType.DAY, PeriodType.WEEK, PeriodType.MONTH]) {
      const latest = await this.gamePeriodWinnerRepository.findOne({
        where: { gameType, periodType },
        relations: ['user'],
        order: { periodStart: 'DESC' },
      });
      if (latest?.user) {
        const periodStart = latest.periodStart instanceof Date
          ? latest.periodStart.toISOString().split('T')[0]
          : String(latest.periodStart);
        const entry = {
          userId: latest.userId,
          displayName: latest.user?.firstName ?? `Joueur ${latest.userId}`,
          avatarImage: latest.user?.avatarImage ?? null,
          periodStart,
        };
        if (periodType === PeriodType.DAY) result.day = entry;
        else if (periodType === PeriodType.WEEK) result.week = entry;
        else if (periodType === PeriodType.MONTH) result.month = entry;
      }
    }
    return result;
  }

  async getMyScore(
    userId: number,
    gameType: GameType,
  ): Promise<{
    rank: number;
    score: number;
    dailyWins: number;
    weeklyWins: number;
    monthlyWins: number;
  } | null> {
    const leaderboard = await this.getLeaderboard(gameType, 10000);
    const idx = leaderboard.findIndex((r) => r.userId === userId);
    if (idx < 0) return null;

    const row = leaderboard[idx];
    return {
      rank: row.rank,
      score: row.score,
      dailyWins: row.dailyWins,
      weeklyWins: row.weeklyWins,
      monthlyWins: row.monthlyWins,
    };
  }
}
