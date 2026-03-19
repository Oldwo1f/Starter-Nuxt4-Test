import { Injectable, forwardRef, Inject } from '@nestjs/common';
import { KikiriService } from './kikiri.service';
import { KikiriConfigService } from './kikiri-config.service';
import { KikiriGateway } from './kikiri.gateway';

const INTERVAL_MS = 5 * 60 * 1000;
const OPENING_CHECK_MS = 30 * 1000; // Vérifier toutes les 30s si on doit lancer le premier tirage
const BETTING_CHECK_MS = 10 * 1000; // Vérifier toutes les 10s si le temps de paris est écoulé
const PRE_GAME_COUNTDOWN_SEC = 5; // Compteur "partie va commencer" en secondes

@Injectable()
export class KikiriSchedulerService {
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private openingCheckId: ReturnType<typeof setInterval> | null = null;
  private bettingCheckId: ReturnType<typeof setInterval> | null = null;
  private isRunning = false;

  constructor(
    private kikiriService: KikiriService,
    @Inject(forwardRef(() => KikiriConfigService))
    private configService: KikiriConfigService,
    private kikiriGateway: KikiriGateway,
  ) {}

  onModuleInit() {
    this.runCycle();
    this.intervalId = setInterval(() => this.runCycle(), INTERVAL_MS);
    this.openingCheckId = setInterval(() => this.checkOpeningAndStartFirstDraw(), OPENING_CHECK_MS);
    this.bettingCheckId = setInterval(() => this.checkBettingEndAndResolve(), BETTING_CHECK_MS);
  }

  /** Vérifie si le temps de paris est écoulé → lance la résolution (étape 5→8) */
  private async checkBettingEndAndResolve() {
    if (this.isRunning) return;
    try {
      const currentDraw = await this.kikiriService.getCurrentDraw();
      if (!currentDraw || !currentDraw.bettingEndsAt) return;
      const now = Date.now();
      const endsAt = new Date(currentDraw.bettingEndsAt).getTime();
      if (endsAt > now) return;
      await this.runResolutionFlow(currentDraw.id);
    } catch {
      // Ignorer les erreurs
    }
  }

  /** Exécute les étapes 5→8 : résolution, pertes, gains, puis nouvelle partie */
  private async runResolutionFlow(drawId: number) {
    if (this.isRunning) return;
    this.isRunning = true;
    try {
      const config = await this.configService.getConfig();
      const postResolutionDelayMs = Math.max(
        10000,
        Math.min(60000, (config.postResolutionDelaySeconds ?? 18) * 1000),
      );

      this.kikiriGateway.emitDrawEnding(drawId);
      await new Promise((r) => setTimeout(r, 2500));
      const revealing = await this.kikiriService.rollAndRevealDraw(drawId);
      this.kikiriGateway.emitDrawReveal(revealing);
      await new Promise((r) => setTimeout(r, 2500));
      const resolved = await this.kikiriService.settleBetsAndResolveDraw(drawId);
      this.kikiriGateway.emitDrawResolved(resolved);
      await new Promise((r) => setTimeout(r, postResolutionDelayMs));

      const isOpen = await this.configService.isGameOpen();
      if (isOpen) {
        await this.startNewDraw();
      } else {
        await this.kikiriService.closeCurrentSession();
        this.kikiriGateway.emitTableClosed();
      }
    } catch (error) {
      console.error('[KikiriScheduler] Error in resolution flow:', error);
    } finally {
      this.isRunning = false;
    }
  }

  /** Étapes 1→4 : startingSoon (5s) → draw:new → paris jusqu'à bettingEndsAt */
  private async startNewDraw() {
    this.kikiriGateway.emitDrawStartingSoon();
    await new Promise((r) => setTimeout(r, PRE_GAME_COUNTDOWN_SEC * 1000));
    const newDraw = await this.kikiriService.createDraw();
    await this.kikiriGateway.emitNewDraw(newDraw);
    const isLastBeforeClose = await this.configService.willBeClosedAt(newDraw.bettingEndsAt);
    if (isLastBeforeClose) {
      this.kikiriGateway.emitTableClosingAfterDraw();
    }
  }

  /** Vérifie si le jeu vient de s'ouvrir sans tirage en cours → lance le premier tirage */
  private async checkOpeningAndStartFirstDraw() {
    if (this.isRunning) return;
    try {
      const isOpen = await this.configService.isGameOpen();
      const currentDraw = await this.kikiriService.getCurrentDraw();
      if (isOpen && !currentDraw) {
        await this.runCycle();
      }
    } catch {
      // Ignorer les erreurs
    }
  }

  async triggerCycle() {
    return this.runCycle();
  }

  /** Appel manuel (admin) : terminer le tirage en cours et lancer la résolution + nouvelle partie */
  async finishDrawManually(drawId: number) {
    return this.runResolutionFlow(drawId);
  }

  async runCycle() {
    if (this.isRunning) return;
    try {
      const isOpen = await this.configService.isGameOpen();
      const currentDraw = await this.kikiriService.getCurrentDraw();

      if (currentDraw) {
        const endsAt = currentDraw.bettingEndsAt
          ? new Date(currentDraw.bettingEndsAt).getTime()
          : 0;
        if (endsAt <= Date.now()) {
          await this.runResolutionFlow(currentDraw.id);
        }
        return;
      }

      if (isOpen) {
        this.isRunning = true;
        try {
          await this.startNewDraw();
        } finally {
          this.isRunning = false;
        }
      } else {
        await this.kikiriService.closeCurrentSession();
        this.kikiriGateway.emitTableClosed();
      }
    } catch (error) {
      console.error('[KikiriScheduler] Error in cycle:', error);
    }
  }
}
