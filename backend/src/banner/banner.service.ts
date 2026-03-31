import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SiteBannerConfig } from '../entities/site-banner-config.entity';
import { UploadService } from '../upload/upload.service';

type BannerUpdateInput = {
  isActive?: boolean;
  desktopFile?: Express.Multer.File;
  mobileFile?: Express.Multer.File;
};

const SAFE_UPLOAD_URL =
  /^\/uploads\/(agent\/\d+\/[\w.-]+|banners\/site\/(desktop|mobile)\/[\w.-]+)$/;

function assertSafeBannerImageUrl(label: string, url: string | null | undefined): void {
  if (url == null || url === '') return;
  if (!SAFE_UPLOAD_URL.test(url)) {
    throw new BadRequestException(
      `${label}: URL non autorisée (attendu chemin /uploads/agent/{id}/... ou /uploads/banners/site/... déposé par l'admin)`,
    );
  }
}

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

  /**
   * Mise à jour depuis des URLs déjà servies sous /uploads (ex. image jointe dans le chat agent).
   */
  async updateConfigFromPublicUrls(input: {
    isActive?: boolean;
    desktopImageUrl?: string | null;
    mobileImageUrl?: string | null;
  }): Promise<SiteBannerConfig> {
    const config = await this.getOrCreateSingleton();

    if (typeof input.isActive === 'boolean') {
      config.isActive = input.isActive;
    }

    if (input.desktopImageUrl !== undefined) {
      if (input.desktopImageUrl === null) {
        await this.uploadService.deleteOldSiteBannerImage(config.desktopImageUrl);
        config.desktopImageUrl = null;
      } else {
        assertSafeBannerImageUrl('desktopImageUrl', input.desktopImageUrl);
        await this.uploadService.deleteOldSiteBannerImage(config.desktopImageUrl);
        config.desktopImageUrl = input.desktopImageUrl;
      }
    }

    if (input.mobileImageUrl !== undefined) {
      if (input.mobileImageUrl === null) {
        await this.uploadService.deleteOldSiteBannerImage(config.mobileImageUrl);
        config.mobileImageUrl = null;
      } else {
        assertSafeBannerImageUrl('mobileImageUrl', input.mobileImageUrl);
        await this.uploadService.deleteOldSiteBannerImage(config.mobileImageUrl);
        config.mobileImageUrl = input.mobileImageUrl;
      }
    }

    return await this.repo.save(config);
  }
}

