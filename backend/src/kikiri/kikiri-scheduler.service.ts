import { Injectable } from '@nestjs/common';
import { KikiriService } from './kikiri.service';
import { KikiriGateway } from './kikiri.gateway';

const INTERVAL_MS = 5 * 60 * 1000;

@Injectable()
export class KikiriSchedulerService {
  private intervalId: ReturnType<typeof setInterval> | null = null;

  constructor(
    private kikiriService: KikiriService,
    private kikiriGateway: KikiriGateway,
  ) {}

  onModuleInit() {
    this.runCycle();
    this.intervalId = setInterval(() => this.runCycle(), INTERVAL_MS);
  }

  async triggerCycle() {
    return this.runCycle();
  }

  async runCycle() {
    try {
      const currentDraw = await this.kikiriService.getCurrentDraw();
      if (currentDraw) {
        this.kikiriGateway.emitDrawEnding(currentDraw.id);
        await new Promise((r) => setTimeout(r, 2500));
        const revealing = await this.kikiriService.rollAndRevealDraw(currentDraw.id);
        this.kikiriGateway.emitDrawReveal(revealing);
        // Délai pour laisser les animations (pupus perdants → banque, pupus gagnants → tas, vers solde) se terminer
        await new Promise((r) => setTimeout(r, 10500));
    const resolved = await this.kikiriService.settleBetsAndResolveDraw(currentDraw.id);
    await this.kikiriGateway.emitDrawResolved(resolved);
    // Délai pour que la popup gain/perte disparaisse avant le nouveau tirage
    await new Promise((r) => setTimeout(r, 4500));
      }
      const newDraw = await this.kikiriService.createDraw();
      await this.kikiriGateway.emitNewDraw(newDraw);
    } catch (error) {
      console.error('[KikiriScheduler] Error in cycle:', error);
    }
  }
}
