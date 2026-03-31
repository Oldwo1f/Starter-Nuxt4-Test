import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { randomUUID } from 'crypto';
import { TeNatiraaRegistration, TeNatiraaRegistrationStatus } from '../entities/te-natiraa-registration.entity';
import { TeNatiraaEvent } from '../entities/te-natiraa-event.entity';
import { TeNatiraaPresenceCode } from '../entities/te-natiraa-presence-code.entity';
import { TeNatiraaPresenceClaim } from '../entities/te-natiraa-presence-claim.entity';
import { User } from '../entities/user.entity';
import { StripeService } from '../stripe/stripe.service';
import { BadgesService } from '../badges/badges.service';
import { CreateTeNatiraaCheckoutSessionDto } from './dto/create-checkout-session.dto';
import { CreateTeNatiraaEventDto } from './dto/create-event.dto';
import { UpdateTeNatiraaEventDto } from './dto/update-event.dto';
import { CreateTeNatiraaPresenceCodeDto, UpdateTeNatiraaPresenceCodeDto } from './dto/create-presence-code.dto';
import {
  formatTeNatiraaEventDateFrLong,
  teNatiraaYmdToUtcDate,
  todayYmdInTeNatiraa,
} from '../common/te-natiraa-dates';

@Injectable()
export class TeNatiraaService {
  constructor(
    @InjectRepository(TeNatiraaRegistration)
    private registrationsRepository: Repository<TeNatiraaRegistration>,
    @InjectRepository(TeNatiraaEvent)
    private eventsRepository: Repository<TeNatiraaEvent>,
    @InjectRepository(TeNatiraaPresenceCode)
    private presenceCodesRepository: Repository<TeNatiraaPresenceCode>,
    @InjectRepository(TeNatiraaPresenceClaim)
    private presenceClaimsRepository: Repository<TeNatiraaPresenceClaim>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    private dataSource: DataSource,
    private stripeService: StripeService,
    private badgesService: BadgesService,
  ) {}

  async getNextEvent(): Promise<TeNatiraaEvent | null> {
    const today = todayYmdInTeNatiraa();
    return this.eventsRepository
      .createQueryBuilder('e')
      .where('e.isActive = :active', { active: true })
      .andWhere('e.eventDate >= :today', { today })
      .orderBy('e.eventDate', 'ASC')
      .getOne();
  }

  async createCheckoutSession(
    dto: CreateTeNatiraaCheckoutSessionDto,
    userId?: number,
    effectiveRole?: string,
  ) {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

    const nextEvent = await this.getNextEvent();
    if (!nextEvent) {
      throw new BadRequestException('Aucun Te Natira\'a à venir. Les inscriptions sont fermées.');
    }

    let isMember = false;
    if (effectiveRole) {
      const role = effectiveRole.toLowerCase();
      isMember = ['member', 'premium', 'vip', 'admin', 'superadmin', 'moderator'].includes(role);
    }

    const eventDateStr = formatTeNatiraaEventDateFrLong(nextEvent.eventDate);

    return this.stripeService.createTeNatiraaCheckoutSession({
      ...dto,
      userId: userId ?? null,
      isMember,
      successUrl: `${frontendUrl}/te-natiraa/inscription/success?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${frontendUrl}/te-natiraa/inscription?canceled=true`,
      eventId: nextEvent.id,
      eventDate: eventDateStr,
      eventTime: nextEvent.eventTime,
      eventLocation: nextEvent.location,
      priceMemberId: nextEvent.stripePriceMemberId,
      pricePublicId: nextEvent.stripePricePublicId,
    });
  }

  async getEvents() {
    return this.eventsRepository.find({
      order: { eventDate: 'DESC' },
    });
  }

  async getEventById(id: number): Promise<TeNatiraaEvent> {
    const event = await this.eventsRepository.findOne({ where: { id } });
    if (!event) {
      throw new NotFoundException('Événement non trouvé');
    }
    return event;
  }

  async createEvent(dto: CreateTeNatiraaEventDto) {
    const event = this.eventsRepository.create({
      ...dto,
      eventDate: teNatiraaYmdToUtcDate(dto.eventDate),
      eventTime: dto.eventTime ?? '8h00',
      isActive: dto.isActive ?? true,
    });
    return this.eventsRepository.save(event);
  }

  async updateEvent(id: number, dto: UpdateTeNatiraaEventDto) {
    const event = await this.eventsRepository.findOne({ where: { id } });
    if (!event) throw new NotFoundException('Événement non trouvé');
    const { eventDate, ...rest } = dto;
    Object.assign(event, rest);
    if (eventDate !== undefined) event.eventDate = teNatiraaYmdToUtcDate(eventDate);
    return this.eventsRepository.save(event);
  }

  async deleteEvent(id: number) {
    const result = await this.eventsRepository.delete(id);
    if (result.affected === 0) throw new NotFoundException('Événement non trouvé');
    return { deleted: true };
  }

  async getRegistrationsGroupedByEvent() {
    const registrations = await this.registrationsRepository.find({
      relations: ['event'],
      order: { eventId: 'DESC', createdAt: 'DESC' },
    });

    const byEvent = new Map<number, { event: TeNatiraaEvent; registrations: TeNatiraaRegistration[] }>();
    for (const r of registrations) {
      if (!r.event) continue;
      if (!byEvent.has(r.eventId)) {
        byEvent.set(r.eventId, { event: r.event, registrations: [] });
      }
      byEvent.get(r.eventId)!.registrations.push(r);
    }

    return Array.from(byEvent.values()).sort(
      (a, b) => new Date(b.event.eventDate).getTime() - new Date(a.event.eventDate).getTime(),
    );
  }

  async getRegistrations(page = 1, limit = 50, eventId?: number) {
    const qb = this.registrationsRepository
      .createQueryBuilder('r')
      .leftJoinAndSelect('r.event', 'event')
      .orderBy('r.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (eventId) {
      qb.andWhere('r.eventId = :eventId', { eventId });
    }

    const [items, total] = await qb.getManyAndCount();

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async processPendingBySessionId(sessionId: string) {
    return this.stripeService.processTeNatiraaBySessionId(sessionId);
  }

  async validateQrCode(qrCode: string): Promise<{
    valid: boolean;
    message: string;
    adultCount?: number;
    childCount?: number;
  }> {
    const registration = await this.registrationsRepository.findOne({
      where: { qrCode },
    });

    if (!registration) {
      return { valid: false, message: 'Code invalide' };
    }

    if (registration.status === TeNatiraaRegistrationStatus.VALIDATED) {
      return {
        valid: false,
        message: 'Code déjà utilisé',
        adultCount: registration.adultCount,
        childCount: registration.childCount,
      };
    }

    registration.status = TeNatiraaRegistrationStatus.VALIDATED;
    registration.validatedAt = new Date();
    await this.registrationsRepository.save(registration);

    return {
      valid: true,
      message: `Code validé - Nombre d'adultes ${registration.adultCount}, Nombre d'enfants ${registration.childCount}`,
      adultCount: registration.adultCount,
      childCount: registration.childCount,
    };
  }

  async listPresenceCodes() {
    return this.presenceCodesRepository.find({
      relations: ['event'],
      order: { createdAt: 'DESC' },
    });
  }

  async createPresenceCode(dto: CreateTeNatiraaPresenceCodeDto) {
    if (dto.eventId != null) {
      const ev = await this.eventsRepository.findOne({ where: { id: dto.eventId } });
      if (!ev) {
        throw new NotFoundException('Événement non trouvé');
      }
    }

    const token = randomUUID();
    const row = this.presenceCodesRepository.create({
      token,
      label: dto.label?.trim() || null,
      eventId: dto.eventId ?? null,
      isActive: true,
    });
    return this.presenceCodesRepository.save(row);
  }

  async updatePresenceCode(id: number, dto: UpdateTeNatiraaPresenceCodeDto) {
    const row = await this.presenceCodesRepository.findOne({ where: { id } });
    if (!row) {
      throw new NotFoundException('Code de présence non trouvé');
    }
    if (dto.label !== undefined) {
      row.label = dto.label.trim() || null;
    }
    if (dto.isActive !== undefined) {
      row.isActive = dto.isActive;
    }
    return this.presenceCodesRepository.save(row);
  }

  /**
   * Un point par code distinct ; chaque couple (utilisateur, code) est unique.
   */
  async claimPresence(
    userId: number,
    token: string,
  ): Promise<{
    alreadyClaimed: boolean;
    tenatiraaPresencePoints: number;
    newBadgeCodes: string[];
  }> {
    const normalized = token.trim();
    if (!normalized) {
      throw new BadRequestException('Code manquant');
    }

    const codeRow = await this.presenceCodesRepository.findOne({
      where: { token: normalized },
    });
    if (!codeRow?.isActive) {
      throw new NotFoundException('Code de présence invalide ou désactivé');
    }

    const existingFast = await this.presenceClaimsRepository.findOne({
      where: { userId, presenceCodeId: codeRow.id },
    });
    if (existingFast) {
      const newBadgeCodes = await this.badgesService.syncTeNatiraaPresenceBadges(userId);
      const user = await this.usersRepository.findOne({
        where: { id: userId },
        select: ['id', 'tenatiraaPresencePoints'],
      });
      return {
        alreadyClaimed: true,
        tenatiraaPresencePoints: user?.tenatiraaPresencePoints ?? 0,
        newBadgeCodes,
      };
    }

    let grantedInTx = false;
    await this.dataSource.transaction(async (manager) => {
      const codeRepo = manager.getRepository(TeNatiraaPresenceCode);
      const claimsRepo = manager.getRepository(TeNatiraaPresenceClaim);
      const usersRepo = manager.getRepository(User);

      const code = await codeRepo.findOne({
        where: { id: codeRow.id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!code?.isActive) {
        throw new NotFoundException('Code de présence invalide ou désactivé');
      }

      const again = await claimsRepo.findOne({
        where: { userId, presenceCodeId: code.id },
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
        presenceCodeId: code.id,
      });
      user.tenatiraaPresencePoints = (user.tenatiraaPresencePoints ?? 0) + 1;
      await usersRepo.save(user);
      grantedInTx = true;
    });

    const newBadgeCodes = await this.badgesService.syncTeNatiraaPresenceBadges(userId);
    const user = await this.usersRepository.findOne({
      where: { id: userId },
      select: ['id', 'tenatiraaPresencePoints'],
    });

    return {
      alreadyClaimed: !grantedInTx,
      tenatiraaPresencePoints: user?.tenatiraaPresencePoints ?? 0,
      newBadgeCodes,
    };
  }
}
