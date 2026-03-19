import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole } from '../entities/user.entity';
import { JijiWeeklyCredit } from '../entities/jiji-weekly-credit.entity';
import { WalletService } from '../wallet/wallet.service';

/** Pacific/Tahiti = UTC-10. Sunday midnight Tahiti = Monday 10:00 UTC */
const TAHITI_SUNDAY_MIDNIGHT_UTC_HOUR = 10;
const CHECK_INTERVAL_MS = 15 * 60 * 1000; // 15 minutes

const JIJI_BY_ROLE: Record<string, number> = {
  [UserRole.USER]: 1000,
  [UserRole.MEMBER]: 3000,
  [UserRole.PREMIUM]: 5000,
  [UserRole.VIP]: 5000,
  [UserRole.ADMIN]: 5000,
  [UserRole.MODERATOR]: 5000,
  [UserRole.SUPERADMIN]: 5000,
};

@Injectable()
export class JijiSchedulerService {
  private checkId: ReturnType<typeof setInterval> | null = null;
  private isRunning = false;
  private readonly logger = new Logger(JijiSchedulerService.name);

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(JijiWeeklyCredit)
    private weeklyCreditRepository: Repository<JijiWeeklyCredit>,
    private walletService: WalletService,
  ) {}

  onModuleInit() {
    this.runCheck();
    this.checkId = setInterval(() => this.runCheck(), CHECK_INTERVAL_MS);
    this.logger.log('Jiji weekly credit scheduler started (Sunday midnight Tahiti, check every 15 min)');
  }

  onModuleDestroy() {
    if (this.checkId) clearInterval(this.checkId);
  }

  private isSundayMidnightTahiti(): boolean {
    const now = new Date();
    const utcDay = now.getUTCDay(); // 0=Sun, 1=Mon
    const utcHour = now.getUTCHours();
    const utcMinute = now.getUTCMinutes();
    // Sunday midnight Tahiti = Monday 10:00 UTC. Allow 15-min window.
    return utcDay === 1 && utcHour === TAHITI_SUNDAY_MIDNIGHT_UTC_HOUR && utcMinute < 15;
  }

  private getWeekKey(): string {
    const now = new Date();
    const utcDay = now.getUTCDay(); // 0=Sun, 1=Mon, ...
    const utcDate = now.getUTCDate();
    // Get the Monday of this week (week starts Sunday night at midnight Tahiti)
    const daysSinceMonday = (utcDay + 6) % 7;
    const monday = new Date(now);
    monday.setUTCDate(utcDate - daysSinceMonday);
    return monday.toISOString().slice(0, 10); // YYYY-MM-DD
  }

  private async runCheck() {
    if (this.isRunning) return;
    if (!this.isSundayMidnightTahiti()) return;

    this.isRunning = true;
    const weekKey = this.getWeekKey();

    try {
      const thisWeekCount = await this.weeklyCreditRepository
        .createQueryBuilder('c')
        .where('c.weekKey = :weekKey', { weekKey })
        .getCount();
      if (thisWeekCount > 0) {
        this.logger.debug(`Jiji weekly credit already run for week ${weekKey}`);
        return;
      }

      this.logger.log(`Running Jiji weekly credit for week ${weekKey}`);

      const users = await this.userRepository.find({
        where: { isActive: true },
        select: ['id', 'role', 'email'],
      });

      const weekKeyDate = new Date(weekKey + 'T12:00:00Z');
      let credited = 0;
      for (const user of users) {
        if (user.email === 'system@nunaheritage.local') continue;
        const amount = JIJI_BY_ROLE[user.role] ?? JIJI_BY_ROLE[UserRole.USER];
        try {
          const existing = await this.weeklyCreditRepository.findOne({
            where: { userId: user.id, weekKey: weekKeyDate },
          });
          if (existing) continue;

          await this.walletService.creditJijiWeekly(
            user.id,
            amount,
            `Crédit hebdomadaire Jiji (${user.role}) - semaine ${weekKey}`,
          );

          await this.weeklyCreditRepository.save({
            userId: user.id,
            amount,
            roleAtCredit: user.role,
            weekKey: weekKeyDate,
          });
          credited++;
        } catch (err) {
          this.logger.warn(`Failed to credit user ${user.id}: ${(err as Error).message}`);
        }
      }

      this.logger.log(`Jiji weekly credit: ${credited} users credited for week ${weekKey}`);
    } catch (err) {
      this.logger.error(`Jiji weekly credit error: ${(err as Error).message}`, (err as Error).stack);
    } finally {
      this.isRunning = false;
    }
  }
}
