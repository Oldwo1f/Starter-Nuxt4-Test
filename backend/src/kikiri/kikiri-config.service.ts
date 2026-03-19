import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { KikiriConfig, KikiriMode } from '../entities/kikiri-config.entity';

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
    // Mode croisière : vérifier l'heure
    const now = new Date();
    const openMinutes = config.openHour * 60 + config.openMinute;
    const closeMinutes = config.closeHour * 60 + config.closeMinute;
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    if (openMinutes <= closeMinutes) {
      return currentMinutes >= openMinutes && currentMinutes < closeMinutes;
    }
    // Plage qui traverse minuit (ex: 22h-6h)
    return currentMinutes >= openMinutes || currentMinutes < closeMinutes;
  }

  /** Vérifie si à la date donnée le jeu sera fermé (mode croisière, heure de fermeture dépassée) */
  async willBeClosedAt(date: Date): Promise<boolean> {
    const config = await this.getConfig();
    if (config.mode !== KikiriMode.CRUISE) return false;
    const closeDate = new Date(date);
    closeDate.setHours(config.closeHour, config.closeMinute, 0, 0);
    return date.getTime() >= closeDate.getTime();
  }

  /** Prochaine heure d'ouverture en mode croisière (pour afficher le message) */
  async getNextOpenTime(): Promise<Date | null> {
    const isOpen = await this.isGameOpen();
    if (isOpen) return null;
    const config = await this.getConfig();
    if (config.mode !== KikiriMode.CRUISE) return null;
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
}
