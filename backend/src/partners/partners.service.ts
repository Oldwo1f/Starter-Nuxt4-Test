import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Partner } from '../entities/partner.entity';
import { UploadService } from '../upload/upload.service';

@Injectable()
export class PartnersService {
  constructor(
    @InjectRepository(Partner)
    private partnerRepository: Repository<Partner>,
    private uploadService: UploadService,
  ) {}

  async create(
    name: string,
    link?: string,
    bannerHorizontalUrl?: string,
    bannerVerticalUrl?: string,
  ): Promise<Partner> {
    const partner = this.partnerRepository.create({
      name,
      link: link || null,
      bannerHorizontalUrl: bannerHorizontalUrl || null,
      bannerVerticalUrl: bannerVerticalUrl || null,
    });
    return this.partnerRepository.save(partner);
  }

  async findAll(): Promise<Partner[]> {
    try {
      return await this.partnerRepository.find({
        order: { createdAt: 'DESC' },
      });
    } catch (error) {
      console.error('Error in PartnersService.findAll():', error);
      throw error;
    }
  }

  async findOne(id: number): Promise<Partner> {
    const partner = await this.partnerRepository.findOne({ where: { id } });
    if (!partner) {
      throw new NotFoundException(`Partner with ID ${id} not found`);
    }
    return partner;
  }

  async update(
    id: number,
    name?: string,
    link?: string,
    bannerHorizontalUrl?: string,
    bannerVerticalUrl?: string,
  ): Promise<Partner> {
    const partner = await this.findOne(id);

    if (name !== undefined) {
      partner.name = name;
    }
    if (link !== undefined) {
      partner.link = link || null;
    }
    if (bannerHorizontalUrl !== undefined) {
      // Supprimer l'ancienne bannière horizontale si elle existe
      if (partner.bannerHorizontalUrl && partner.bannerHorizontalUrl !== bannerHorizontalUrl) {
        await this.uploadService.deleteOldPartnerBanner(partner.bannerHorizontalUrl);
      }
      partner.bannerHorizontalUrl = bannerHorizontalUrl || null;
    }
    if (bannerVerticalUrl !== undefined) {
      // Supprimer l'ancienne bannière verticale si elle existe
      if (partner.bannerVerticalUrl && partner.bannerVerticalUrl !== bannerVerticalUrl) {
        await this.uploadService.deleteOldPartnerBanner(partner.bannerVerticalUrl);
      }
      partner.bannerVerticalUrl = bannerVerticalUrl || null;
    }

    return this.partnerRepository.save(partner);
  }

  async remove(id: number): Promise<void> {
    const partner = await this.findOne(id);

    // Supprimer les bannières
    if (partner.bannerHorizontalUrl) {
      await this.uploadService.deleteOldPartnerBanner(partner.bannerHorizontalUrl);
    }
    if (partner.bannerVerticalUrl) {
      await this.uploadService.deleteOldPartnerBanner(partner.bannerVerticalUrl);
    }

    await this.partnerRepository.remove(partner);
  }
}
