import { Injectable, forwardRef, Inject } from '@nestjs/common';
import { BingoService } from './bingo.service';
import { BingoConfigService } from './bingo-config.service';
import { BingoGateway } from './bingo.gateway';
import { BingoRoundPhase } from '../entities/bingo-round.entity';
const CHECK_INTERVAL_MS = 2000;
const OPENING_CHECK_MS = 30 * 1000;

@Injectable()
export class BingoSchedulerService {
  private checkId: ReturnType<typeof setInterval> | null = null;
  private openingCheckId: ReturnType<typeof setInterval> | null = null;
  private isRunning = false;

  constructor(
    private bingoService: BingoService,
    @Inject(forwardRef(() => BingoConfigService))
    private configService: BingoConfigService,
    private bingoGateway: BingoGateway,
  ) {}

  onModuleInit() {
    this.runCycle();
    this.checkId = setInterval(() => this.runCycle(), CHECK_INTERVAL_MS);
    this.openingCheckId = setInterval(() => this.checkOpeningAndStartFirstRound(), OPENING_CHECK_MS);
  }

  onModuleDestroy() {
    if (this.checkId) clearInterval(this.checkId);
    if (this.openingCheckId) clearInterval(this.openingCheckId);
  }

  private async checkOpeningAndStartFirstRound() {
    if (this.isRunning) return;
    try {
      const isOpen = await this.configService.isGameOpen();
      const currentRound = await this.bingoService.getCurrentRound();
      if (isOpen && !currentRound) {
        await this.runCycle();
      }
    } catch {
      // Ignore errors
    }
  }

  async triggerCycle() {
    return this.runCycle();
  }

  async runCycle() {
    if (this.isRunning) return;
    this.isRunning = true;
    try {
      const isOpen = await this.configService.isGameOpen();
      const currentRound = await this.bingoService.getCurrentRound();

      if (currentRound) {
        if (currentRound.phase === BingoRoundPhase.PURCHASE) {
          if (new Date() >= currentRound.purchaseEndsAt) {
            const round = await this.bingoService.startDrawing(currentRound.id);
            this.bingoGateway.emitRoundDrawing(round);
          }
        } else if (currentRound.phase === BingoRoundPhase.DRAWING) {
          const drawn = (currentRound.drawnBalls as number[]) ?? [];
          if (drawn.length >= 75) {
            const winnerIds = await this.bingoService.checkWinnersForRound(currentRound.id);
            if (winnerIds.length > 0) {
              const resolved = await this.bingoService.declareWinners(currentRound.id, winnerIds);
              await this.bingoGateway.emitRoundEnded(resolved);
              await new Promise((r) => setTimeout(r, 5000));
            } else {
              await this.bingoService.forceEndRoundNoWinner(currentRound.id);
              await this.bingoGateway.emitRoundEnded({
                id: currentRound.id,
                phase: 'ended',
                winnerId: null,
                jackpot: parseFloat(currentRound.jackpot.toString()),
              });
              await new Promise((r) => setTimeout(r, 3000));
            }
            if (isOpen) {
              const newRound = await this.bingoService.createRound();
              this.bingoGateway.emitRoundNew(newRound);
            } else {
              await this.bingoService.closeCurrentSession();
              this.bingoGateway.emitTableClosed();
            }
          } else {
            const config = await this.configService.getConfig();
            const intervalSec = this.configService.getBallIntervalSeconds(config.drawSpeed);
            const drawingStartedAt = currentRound.drawingStartedAt;
            if (drawingStartedAt) {
              const nextBallTime = drawingStartedAt.getTime() + drawn.length * intervalSec * 1000;
              if (Date.now() >= nextBallTime) {
                const { ball, winnerIds } = await this.bingoService.drawNextBall(currentRound.id);
                const updatedRound = await this.bingoService.getRoundById(currentRound.id);
                const newDrawn = (updatedRound.drawnBalls as number[]) ?? [];
                this.bingoGateway.emitBallDrawn(currentRound.id, ball, newDrawn);
                if (winnerIds.length > 0) {
                  const resolved = await this.bingoService.declareWinners(currentRound.id, winnerIds);
                  await this.bingoGateway.emitRoundEnded(resolved);
                  await new Promise((r) => setTimeout(r, 5000));
                  if (isOpen) {
                    const newRound = await this.bingoService.createRound();
                    this.bingoGateway.emitRoundNew(newRound);
                  } else {
                    await this.bingoService.closeCurrentSession();
                    this.bingoGateway.emitTableClosed();
                  }
                  return;
                }
              }
            }
          }
        }
      } else {
        if (isOpen) {
          const newRound = await this.bingoService.createRound();
          this.bingoGateway.emitRoundNew(newRound);
        } else {
          await this.bingoService.closeCurrentSession();
          this.bingoGateway.emitTableClosed();
        }
      }
    } catch (error) {
      console.error('[BingoScheduler] Error in cycle:', error);
    } finally {
      this.isRunning = false;
    }
  }
}
