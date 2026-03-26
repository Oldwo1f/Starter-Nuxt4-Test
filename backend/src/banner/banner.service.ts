import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SiteBannerConfig } from '../entities/site-banner-config.entity';
import { UploadService } from '../upload/upload.service';

type BannerUpdateInput = {
  isActive?: boolean;
  desktopFile?: Express.Multer.File;
  mobileFile?: Express.Multer.File;
};

@Injectable()
export class BannerService {
  constructor(
    @InjectRepository(SiteBannerConfig)
    private readonly repo: Repository<SiteBannerConfig>,
    private readonly uploadService: UploadService,
  ) {}

  private async getOrCreateSingleton(): Promise<SiteBannerConfig> {
    const existing = await this.repo.findOne({ where: { id: 1 } });
    if (existing) return existing;

    const created = this.repo.create({
      id: 1,
      desktopImageUrl: null,
      mobileImageUrl: null,
      isActive: false,
    });
    return await this.repo.save(created);
  }

  async getConfig(): Promise<SiteBannerConfig> {
    return await this.getOrCreateSingleton();
  }

  async updateConfig(input: BannerUpdateInput): Promise<SiteBannerConfig> {
    const config = await this.getOrCreateSingleton();

    if (typeof input.isActive === 'boolean') {
      config.isActive = input.isActive;
    }

    if (input.desktopFile) {
      const newUrl = await this.uploadService.saveSiteBannerImage('desktop', input.desktopFile);
      await this.uploadService.deleteOldSiteBannerImage(config.desktopImageUrl);
      config.desktopImageUrl = newUrl;
    }

    if (input.mobileFile) {
      const newUrl = await this.uploadService.saveSiteBannerImage('mobile', input.mobileFile);
      await this.uploadService.deleteOldSiteBannerImage(config.mobileImageUrl);
      config.mobileImageUrl = newUrl;
    }

    return await this.repo.save(config);
  }
}

