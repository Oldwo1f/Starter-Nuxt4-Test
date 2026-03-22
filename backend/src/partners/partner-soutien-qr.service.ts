import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { randomUUID } from 'crypto';
import { Partner } from '../entities/partner.entity';
import { PartnerSoutienQrCode } from '../entities/partner-soutien-qr-code.entity';
import { PartnerSoutienQrClaim } from '../entities/partner-soutien-qr-claim.entity';
import { User } from '../entities/user.entity';
import { BadgesService } from '../badges/badges.service';
import { CreatePartnerSoutienQrCodeDto, UpdatePartnerSoutienQrCodeDto } from './dto/partner-soutien-qr-code.dto';

@Injectable()
export class PartnerSoutienQrService {
  constructor(
    @InjectRepository(PartnerSoutienQrCode)
    private codesRepository: Repository<PartnerSoutienQrCode>,
    @InjectRepository(PartnerSoutienQrClaim)
    private claimsRepository: Repository<PartnerSoutienQrClaim>,
    @InjectRepository(Partner)
    private partnerRepository: Repository<Partner>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    private dataSource: DataSource,
    private badgesService: BadgesService,
  ) {}

  async listCodes() {
    return this.codesRepository.find({
      relations: ['partner'],
      order: { createdAt: 'DESC' },
    });
  }

  async createCode(dto: CreatePartnerSoutienQrCodeDto) {
    if (dto.partnerId != null) {
      const p = await this.partnerRepository.findOne({ where: { id: dto.partnerId } });
      if (!p) {
        throw new NotFoundException('Partenaire non trouvé');
      }
    }

    const token = randomUUID();
    const row = this.codesRepository.create({
      token,
      label: dto.label?.trim() || null,
      partnerId: dto.partnerId ?? null,
      isActive: true,
    });
    return this.codesRepository.save(row);
  }

  async updateCode(id: number, dto: UpdatePartnerSoutienQrCodeDto) {
    const row = await this.codesRepository.findOne({ where: { id } });
    if (!row) {
      throw new NotFoundException('Code non trouvé');
    }
    if (dto.label !== undefined) {
      row.label = dto.label.trim() || null;
    }
    if (dto.isActive !== undefined) {
      row.isActive = dto.isActive;
    }
    return this.codesRepository.save(row);
  }

  /**
   * +1 point soutien par code distinct ; même logique que Te Natira'a présence.
   */
  async claim(userId: number, token: string): Promise<{
    alreadyClaimed: boolean;
    soutienPoints: number;
    newBadgeCodes: string[];
  }> {
    const normalized = token.trim();
    if (!normalized) {
      throw new BadRequestException('Code manquant');
    }

    const codeRow = await this.codesRepository.findOne({
      where: { token: normalized },
      relations: ['partner'],
    });
    if (!codeRow?.isActive) {
      throw new NotFoundException('Code invalide ou désactivé');
    }

    const existingFast = await this.claimsRepository.findOne({
      where: { userId, soutienQrCodeId: codeRow.id },
    });
    if (existingFast) {
      const newBadgeCodes = await this.badgesService.syncSoutienPointsBadges(userId);
      const user = await this.usersRepository.findOne({
        where: { id: userId },
        select: ['id', 'soutienPoints'],
      });
      return {
        alreadyClaimed: true,
        soutienPoints: user?.soutienPoints ?? 0,
        newBadgeCodes,
      };
    }

    let grantedInTx = false;
    await this.dataSource.transaction(async (manager) => {
      const codeRepo = manager.getRepository(PartnerSoutienQrCode);
      const claimsRepo = manager.getRepository(PartnerSoutienQrClaim);
      const usersRepo = manager.getRepository(User);

      const code = await codeRepo.findOne({
        where: { id: codeRow.id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!code?.isActive) {
        throw new NotFoundException('Code invalide ou désactivé');
      }

      const again = await claimsRepo.findOne({
        where: { userId, soutienQrCodeId: code.id },
      });
      if (again) {
        return;
      }

      const user = await usersRepo.findOne({
        where: { id: userId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!user) {
        throw new NotFoundException('Utilisateur introuvable');
      }

      await claimsRepo.insert({
        userId,
        soutienQrCodeId: code.id,
      });
      user.soutienPoints = (user.soutienPoints ?? 0) + 1;
      await usersRepo.save(user);
      grantedInTx = true;
    });

    const newBadgeCodes = await this.badgesService.syncSoutienPointsBadges(userId);
    const user = await this.usersRepository.findOne({
      where: { id: userId },
      select: ['id', 'soutienPoints'],
    });

    return {
      alreadyClaimed: !grantedInTx,
      soutienPoints: user?.soutienPoints ?? 0,
      newBadgeCodes,
    };
  }
}
