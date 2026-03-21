import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { KikiriConfig, KikiriMode } from '../entities/kikiri-config.entity';
import {
  getNextCruiseOpenUtc,
  isAtOrAfterClosingWallTime,
  isCruiseWindowOpen,
} from '../common/games-schedule-timezone';

const CONFIG_ID = 1;

@Injectable()
export class KikiriConfigService {
  constructor(
    @InjectRepository(KikiriConfig)
    private configRepository: Repository<KikiriConfig>,
  ) {}

  async getConfig(): Promise<KikiriConfig> {
    let config = await this.configRepository.findOne({ where: { id: CONFIG_ID } });
    if (!config) {
      config = this.configRepository.create({
        id: CONFIG_ID,
        mode: KikiriMode.CRUISE,
        manualEnabled: false,
        openHour: 9,
        openMinute: 0,
        closeHour: 18,
        closeMinute: 0,
        bettingDurationSeconds: 300,
        postResolutionDelaySeconds: 18,
      });
      config = await this.configRepository.save(config);
    }
    return config;
  }

  async updateConfig(updates: Partial<KikiriConfig>): Promise<KikiriConfig> {
    const config = await this.getConfig();
    Object.assign(config, updates);
    return await this.configRepository.save(config);
  }

  /** Vérifie si le jeu est actuellement ouvert selon la config */
  async isGameOpen(): Promise<boolean> {
    const config = await this.getConfig();
    if (config.mode === KikiriMode.MANUAL) {
      return config.manualEnabled;
    }
    return isCruiseWindowOpen(
      config.openHour,
      config.openMinute,
      config.closeHour,
      config.closeMinute,
    );
  }

  /** Vérifie si à la date donnée le jeu sera fermé (mode croisière, heure de fermeture dépassée) */
  async willBeClosedAt(date: Date): Promise<boolean> {
    const config = await this.getConfig();
    if (config.mode !== KikiriMode.CRUISE) return false;
    return isAtOrAfterClosingWallTime(date, config.closeHour, config.closeMinute);
  }

  /** Prochaine heure d'ouverture en mode croisière (pour afficher le message) */
  async getNextOpenTime(): Promise<Date | null> {
    const isOpen = await this.isGameOpen();
    if (isOpen) return null;
    const config = await this.getConfig();
    if (config.mode !== KikiriMode.CRUISE) return null;
    return getNextCruiseOpenUtc(
      config.openHour,
      config.openMinute,
      config.closeHour,
      config.closeMinute,
    );
  }
}
