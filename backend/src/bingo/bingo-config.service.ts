import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  BingoConfig,
  BingoMode,
  BingoDrawSpeed,
} from '../entities/bingo-config.entity';

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
    const now = new Date();
    const openMinutes = config.openHour * 60 + config.openMinute;
    const closeMinutes = config.closeHour * 60 + config.closeMinute;
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    if (openMinutes <= closeMinutes) {
      return currentMinutes >= openMinutes && currentMinutes < closeMinutes;
    }
    return currentMinutes >= openMinutes || currentMinutes < closeMinutes;
  }

  async willBeClosedAt(date: Date): Promise<boolean> {
    const config = await this.getConfig();
    if (config.mode !== BingoMode.CRUISE) return false;
    const closeDate = new Date(date);
    closeDate.setHours(config.closeHour, config.closeMinute, 0, 0);
    return date.getTime() >= closeDate.getTime();
  }

  async getNextOpenTime(): Promise<Date | null> {
    const isOpen = await this.isGameOpen();
    if (isOpen) return null;
    const config = await this.getConfig();
    if (config.mode !== BingoMode.CRUISE) return null;
    const now = new Date();
    const openDate = new Date(now);
    openDate.setHours(config.openHour, config.openMinute, 0, 0);
    const closeDate = new Date(now);
    closeDate.setHours(config.closeHour, config.closeMinute, 0, 0);
    if (now < openDate) return openDate;
    if (now >= closeDate) {
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(config.openHour, config.openMinute, 0, 0);
      return tomorrow;
    }
    return null;
  }

  getBallIntervalSeconds(speed: BingoDrawSpeed): number {
    return DRAW_SPEED_SECONDS[speed] ?? 5;
  }
}
