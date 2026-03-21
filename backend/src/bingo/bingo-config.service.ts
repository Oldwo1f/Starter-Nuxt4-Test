import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  BingoConfig,
  BingoMode,
  BingoDrawSpeed,
} from '../entities/bingo-config.entity';
import {
  getNextCruiseOpenUtc,
  isAtOrAfterClosingWallTime,
  isCruiseWindowOpen,
} from '../common/games-schedule-timezone';

const CONFIG_ID = 1;

/** Secondes entre chaque boule selon la vitesse */
export const DRAW_SPEED_SECONDS: Record<BingoDrawSpeed, number> = {
  [BingoDrawSpeed.FAST]: 3,
  [BingoDrawSpeed.MEDIUM]: 5,
  [BingoDrawSpeed.SLOW]: 8,
};

@Injectable()
export class BingoConfigService {
  constructor(
    @InjectRepository(BingoConfig)
    private configRepository: Repository<BingoConfig>,
  ) {}

  async getConfig(): Promise<BingoConfig> {
    let config = await this.configRepository.findOne({ where: { id: CONFIG_ID } });
    if (!config) {
      config = this.configRepository.create({
        id: CONFIG_ID,
        mode: BingoMode.CRUISE,
        manualEnabled: false,
        openHour: 9,
        openMinute: 0,
        closeHour: 18,
        closeMinute: 0,
        drawSpeed: BingoDrawSpeed.MEDIUM,
        gridPrice: 50,
      });
      config = await this.configRepository.save(config);
    }
    return config;
  }

  async updateConfig(updates: Partial<BingoConfig>): Promise<BingoConfig> {
    const config = await this.getConfig();
    Object.assign(config, updates);
    return await this.configRepository.save(config);
  }

  async isGameOpen(): Promise<boolean> {
    const config = await this.getConfig();
    if (config.mode === BingoMode.MANUAL) {
      return config.manualEnabled;
    }
    return isCruiseWindowOpen(
      config.openHour,
      config.openMinute,
      config.closeHour,
      config.closeMinute,
    );
  }

  async willBeClosedAt(date: Date): Promise<boolean> {
    const config = await this.getConfig();
    if (config.mode !== BingoMode.CRUISE) return false;
    return isAtOrAfterClosingWallTime(date, config.closeHour, config.closeMinute);
  }

  async getNextOpenTime(): Promise<Date | null> {
    const isOpen = await this.isGameOpen();
    if (isOpen) return null;
    const config = await this.getConfig();
    if (config.mode !== BingoMode.CRUISE) return null;
    return getNextCruiseOpenUtc(
      config.openHour,
      config.openMinute,
      config.closeHour,
      config.closeMinute,
    );
  }

  getBallIntervalSeconds(speed: BingoDrawSpeed): number {
    return DRAW_SPEED_SECONDS[speed] ?? 5;
  }
}
