import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TeNatiraaRegistration, TeNatiraaRegistrationStatus } from '../entities/te-natiraa-registration.entity';
import { TeNatiraaEvent } from '../entities/te-natiraa-event.entity';
import { User, UserRole } from '../entities/user.entity';
import { StripeService } from '../stripe/stripe.service';
import { CreateTeNatiraaCheckoutSessionDto } from './dto/create-checkout-session.dto';
import { CreateTeNatiraaEventDto } from './dto/create-event.dto';
import { UpdateTeNatiraaEventDto } from './dto/update-event.dto';

@Injectable()
export class TeNatiraaService {
  constructor(
    @InjectRepository(TeNatiraaRegistration)
    private registrationsRepository: Repository<TeNatiraaRegistration>,
    @InjectRepository(TeNatiraaEvent)
    private eventsRepository: Repository<TeNatiraaEvent>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    private stripeService: StripeService,
  ) {}

  async getNextEvent(): Promise<TeNatiraaEvent | null> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return this.eventsRepository
      .createQueryBuilder('e')
      .where('e.isActive = :active', { active: true })
      .andWhere('e.eventDate >= :today', { today: today.toISOString().split('T')[0] })
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

    const eventDate = new Date(nextEvent.eventDate);
    const eventDateStr = eventDate.toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });

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

  async createEvent(dto: CreateTeNatiraaEventDto) {
    const event = this.eventsRepository.create({
      ...dto,
      eventDate: new Date(dto.eventDate),
      eventTime: dto.eventTime ?? '8h00',
      isActive: dto.isActive ?? true,
    });
    return this.eventsRepository.save(event);
  }

  async updateEvent(id: number, dto: UpdateTeNatiraaEventDto) {
    const event = await this.eventsRepository.findOne({ where: { id } });
    if (!event) throw new NotFoundException('Événement non trouvé');
    if (dto.eventDate) event.eventDate = new Date(dto.eventDate);
    Object.assign(event, dto);
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
}
