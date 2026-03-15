import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { TeNatiraaRegistration, TeNatiraaRegistrationStatus } from '../entities/te-natiraa-registration.entity';
import { User, UserRole } from '../entities/user.entity';
import { StripeService } from '../stripe/stripe.service';
import { CreateTeNatiraaCheckoutSessionDto } from './dto/create-checkout-session.dto';

@Injectable()
export class TeNatiraaService {
  constructor(
    @InjectRepository(TeNatiraaRegistration)
    private registrationsRepository: Repository<TeNatiraaRegistration>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    private stripeService: StripeService,
  ) {}

  async createCheckoutSession(
    dto: CreateTeNatiraaCheckoutSessionDto,
    userId?: number,
    effectiveRole?: string,
  ) {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

    // Utiliser le rôle effectif du JWT (déjà appliqué par JwtStrategy, inclut la dégradation si expiration)
    // Aligné avec useMemberCheck.canCreateListing côté frontend
    let isMember = false;
    if (effectiveRole) {
      const role = effectiveRole.toLowerCase();
      isMember = ['member', 'premium', 'vip', 'admin', 'superadmin', 'moderator'].includes(role);
    }

    return this.stripeService.createTeNatiraaCheckoutSession({
      ...dto,
      userId: userId ?? null,
      isMember,
      successUrl: `${frontendUrl}/te-natiraa/inscription/success?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${frontendUrl}/te-natiraa/inscription?canceled=true`,
    });
  }

  async getRegistrations(page = 1, limit = 50) {
    const [items, total] = await this.registrationsRepository.findAndCount({
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

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
