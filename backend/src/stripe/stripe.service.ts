import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import Stripe from 'stripe';
import { v4 as uuidv4 } from 'uuid';
import { StripePayment, StripePack, StripePaymentStatus } from '../entities/stripe-payment.entity';
import { User, UserRole } from '../entities/user.entity';
import { Transaction, TransactionType, TransactionStatus } from '../entities/transaction.entity';
import { TeNatiraaRegistration, TeNatiraaRegistrationStatus } from '../entities/te-natiraa-registration.entity';
import { EmailService } from '../email/email.service';
import { WalletService } from '../wallet/wallet.service';
import { ReferralService } from '../referral/referral.service';
import { inscriptionPupuAmount } from '../common/pupu-inscription';

type PackCode = 'teOhi' | 'umete';

const UMETE_ONETIME_TRIAL_DAYS = 365;

/** Stripe API 2026: period end on subscription items; trialing uses trial_end */
function subscriptionPaidAccessEnd(sub: Stripe.Subscription): Date {
  if (sub.status === 'trialing' && sub.trial_end) {
    return new Date(sub.trial_end * 1000);
  }
  const item = sub.items?.data?.[0];
  if (item?.current_period_end) {
    return new Date(item.current_period_end * 1000);
  }
  if (sub.trial_end) {
    return new Date(sub.trial_end * 1000);
  }
  const fallback = new Date();
  fallback.setFullYear(fallback.getFullYear() + 1);
  return fallback;
}

export interface CreateTeNatiraaCheckoutParams {
  firstName: string;
  lastName: string;
  email: string;
  adultCount: number;
  childCount: number;
  userId: number | null;
  isMember: boolean;
  successUrl: string;
  cancelUrl: string;
  eventId: number;
  eventDate: string;
  eventTime: string;
  eventLocation: string;
  priceMemberId: string | null;
  pricePublicId: string | null;
}

@Injectable()
export class StripeService {
  private stripe: Stripe;

  constructor(
    @InjectRepository(StripePayment)
    private paymentsRepository: Repository<StripePayment>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(Transaction)
    private transactionsRepository: Repository<Transaction>,
    @InjectRepository(TeNatiraaRegistration)
    private teNatiraaRegistrationsRepository: Repository<TeNatiraaRegistration>,
    private dataSource: DataSource,
    private emailService: EmailService,
    private walletService: WalletService,
    private referralService: ReferralService,
  ) {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
      throw new InternalServerErrorException('STRIPE_SECRET_KEY is not configured');
    }
    this.stripe = new Stripe(secretKey, {
      apiVersion: '2026-02-25.clover',
    });
  }

  private getAmountForPack(pack: PackCode): number {
    if (pack === 'teOhi') return 5000;
    if (pack === 'umete') return 20000;
    throw new BadRequestException('Invalid pack');
  }

  private getRoleForPack(pack: PackCode): UserRole {
    return pack === 'umete' ? UserRole.PREMIUM : UserRole.MEMBER;
  }

  private getUserRoleLevel(role: UserRole): number {
    const hierarchy: Record<UserRole, number> = {
      [UserRole.SUPERADMIN]: 100,
      [UserRole.ADMIN]: 80,
      [UserRole.MODERATOR]: 60,
      [UserRole.VIP]: 40,
      [UserRole.PREMIUM]: 30,
      [UserRole.MEMBER]: 20,
      [UserRole.USER]: 10,
    };
    return hierarchy[role] || 0;
  }

  private getTeOhiPriceId(): string {
    const priceId = process.env.STRIPE_TEOHI_PRICE_ID;
    if (!priceId) {
      throw new InternalServerErrorException('STRIPE_TEOHI_PRICE_ID is not configured');
    }
    return priceId;
  }

  private getUmeteOnetimePriceId(): string {
    const priceId =
      process.env.STRIPE_UMETE_ONETIME_PRICE_ID || process.env.STRIPE_UMETE_PRICE_ID;
    if (!priceId) {
      throw new InternalServerErrorException(
        'STRIPE_UMETE_ONETIME_PRICE_ID (or legacy STRIPE_UMETE_PRICE_ID) is not configured',
      );
    }
    return priceId;
  }

  async createTeNatiraaCheckoutSession(params: CreateTeNatiraaCheckoutParams) {
    const priceId = params.isMember
      ? (params.priceMemberId || process.env.STRIPE_TENATIRAA_PRICE_MEMBER_ID)
      : (params.pricePublicId || process.env.STRIPE_TENATIRAA_PRICE_PUBLIC_ID);

    if (!priceId) {
      throw new InternalServerErrorException(
        params.isMember
          ? 'STRIPE_TENATIRAA_PRICE_MEMBER_ID is not configured'
          : 'STRIPE_TENATIRAA_PRICE_PUBLIC_ID is not configured',
      );
    }

    const quantity = Math.max(1, params.adultCount);

    const session = await this.stripe.checkout.sessions.create({
      mode: 'payment',
      customer_email: params.email,
      line_items: [
        {
          price: priceId,
          quantity,
        },
      ],
      success_url: params.successUrl,
      cancel_url: params.cancelUrl,
      metadata: {
        type: 'teNatiraa',
        eventId: params.eventId.toString(),
        eventDate: params.eventDate,
        eventTime: params.eventTime,
        eventLocation: params.eventLocation,
        email: params.email,
        firstName: params.firstName,
        lastName: params.lastName,
        adultCount: params.adultCount.toString(),
        childCount: params.childCount.toString(),
        userId: params.userId?.toString() ?? '',
        isMember: params.isMember.toString(),
      },
    });

    return {
      sessionId: session.id,
      url: session.url,
    };
  }

  private async processTeNatiraaCheckoutCompleted(session: Stripe.Checkout.Session) {
    const metadata = session.metadata || {};
    const email = metadata.email as string;
    const firstName = metadata.firstName as string;
    const lastName = metadata.lastName as string;
    const adultCount = parseInt(metadata.adultCount || '0', 10);
    const childCount = parseInt(metadata.childCount || '0', 10);
    const userId = metadata.userId ? parseInt(metadata.userId, 10) : null;
    const eventId = metadata.eventId ? parseInt(metadata.eventId, 10) : null;
    const eventDate = (metadata.eventDate as string) || 'Samedi 11 avril';
    const eventTime = (metadata.eventTime as string) || '8h00';
    const eventLocation = (metadata.eventLocation as string) || 'Vallée de Tipaerui';

    if (!email || !firstName || !lastName) {
      console.error('[Stripe Webhook] Te Natiraa: missing required metadata', { metadata });
      throw new BadRequestException('Missing required metadata for Te Natiraa registration');
    }

    const qrCode = uuidv4();

    const registration = this.teNatiraaRegistrationsRepository.create({
      firstName,
      lastName,
      email,
      adultCount,
      childCount,
      userId: userId || null,
      eventId: eventId || 1,
      stripeSessionId: session.id,
      qrCode,
      status: TeNatiraaRegistrationStatus.PAID,
    });

    await this.teNatiraaRegistrationsRepository.save(registration);

    await this.emailService.sendTeNatiraaTicket(
      email,
      firstName,
      lastName,
      adultCount,
      childCount,
      qrCode,
      { eventDate, eventTime, eventLocation },
    );

    console.log(`[Stripe Webhook] Te Natiraa registration created: ${registration.id}, email sent to ${email}`);

    return registration;
  }

  async createCheckoutSession(userId: number, pack: PackCode) {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const amountXpf = this.getAmountForPack(pack);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

    if (pack === 'umete') {
      const priceId = this.getUmeteOnetimePriceId();
      const sessionParams: Stripe.Checkout.SessionCreateParams = {
        mode: 'payment',
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: `${frontendUrl}/account/cotisation?success=true&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${frontendUrl}/account/cotisation?canceled=true`,
        metadata: {
          userId: userId.toString(),
          pack: 'umete',
          amountXpf: amountXpf.toString(),
          umeteOnetime: 'true',
        },
      };
      if (user.stripeCustomerId) {
        sessionParams.customer = user.stripeCustomerId;
      } else {
        sessionParams.customer_email = user.email || undefined;
      }

      const session = await this.stripe.checkout.sessions.create(sessionParams);

      const payment = this.paymentsRepository.create({
        userId,
        pack: StripePack.UMETE,
        amountXpf,
        stripeSessionId: session.id,
        status: StripePaymentStatus.PENDING,
      });
      const savedPayment = await this.paymentsRepository.save(payment);

      return {
        sessionId: session.id,
        url: session.url,
        paymentId: savedPayment.id,
      };
    }

    const teOhiPriceId = this.getTeOhiPriceId();
    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      mode: 'subscription',
      line_items: [{ price: teOhiPriceId, quantity: 1 }],
      success_url: `${frontendUrl}/account/cotisation?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${frontendUrl}/account/cotisation?canceled=true`,
      metadata: {
        userId: userId.toString(),
        pack: 'teOhi',
        amountXpf: amountXpf.toString(),
      },
      subscription_data: {
        metadata: {
          userId: userId.toString(),
          source: 'te_ohi_checkout',
        },
      },
    };
    if (user.stripeCustomerId) {
      sessionParams.customer = user.stripeCustomerId;
    } else {
      sessionParams.customer_email = user.email || undefined;
    }

    const session = await this.stripe.checkout.sessions.create(sessionParams);

    const payment = this.paymentsRepository.create({
      userId,
      pack: StripePack.TE_OHI,
      amountXpf,
      stripeSessionId: session.id,
      status: StripePaymentStatus.PENDING,
    });
    const savedPayment = await this.paymentsRepository.save(payment);

    return {
      sessionId: session.id,
      url: session.url,
      paymentId: savedPayment.id,
    };
  }

  async handleWebhook(event: Stripe.Event) {
    console.log(`[Stripe Webhook] Received event: ${event.type}`, { id: event.id });

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      await this.processCheckoutSessionCompleted(session);
    } else if (
      event.type === 'customer.subscription.created' ||
      event.type === 'customer.subscription.updated'
    ) {
      const subscription = event.data.object as Stripe.Subscription;
      await this.processSubscriptionUpdate(subscription);
    } else if (event.type === 'invoice.payment_succeeded') {
      const invoice = event.data.object as Stripe.Invoice;
      await this.processInvoicePaymentSucceeded(invoice);
    }

    return { received: true };
  }

  private async processCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
    if (session.metadata?.type === 'teNatiraa') {
      return this.processTeNatiraaCheckoutCompleted(session);
    }

    if (
      session.metadata?.umeteOnetime === 'true' ||
      (session.mode === 'payment' && session.metadata?.pack === 'umete')
    ) {
      return this.processUmeteOnetimeCheckoutCompleted(session);
    }

    if (session.mode === 'subscription') {
      return this.processTeOhiSubscriptionCheckoutCompleted(session);
    }

    console.error('[Stripe Webhook] Unsupported checkout session mode', {
      mode: session.mode,
      metadata: session.metadata,
    });
    throw new BadRequestException('Unsupported checkout session');
  }

  private async processUmeteOnetimeCheckoutCompleted(session: Stripe.Checkout.Session) {
    const userId = parseInt(session.metadata?.userId || '0', 10);
    if (!userId) {
      console.error(`[Stripe Webhook] Umete onetime: missing userId`, session.metadata);
      throw new BadRequestException('Missing userId in session metadata');
    }

    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const payment = await this.paymentsRepository.findOne({
      where: { stripeSessionId: session.id },
    });
    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    if (payment.status === StripePaymentStatus.PAID) {
      console.log(`[Stripe Webhook] Umete already processed for session ${session.id}`);
      await this.referralService.checkAndRewardReferrer(userId);
      return payment;
    }

    const customerId =
      typeof session.customer === 'string' ? session.customer : session.customer?.id;
    if (!customerId) {
      throw new BadRequestException('Missing Stripe customer on Umete checkout session');
    }

    payment.status = StripePaymentStatus.PAID;
    payment.paidAt = new Date();
    payment.stripePaymentIntentId =
      typeof session.payment_intent === 'string'
        ? session.payment_intent
        : session.payment_intent?.id ?? null;
    payment.stripeCustomerId = customerId;
    await this.paymentsRepository.save(payment);

    const creditedAt = payment.paidAt;
    const pupuAmount = inscriptionPupuAmount('umete', creditedAt);

    await this.dataSource.transaction(async (manager) => {
      const usersRepo = manager.getRepository(User);
      const transactionsRepo = manager.getRepository(Transaction);

      const freshUser = await usersRepo.findOne({
        where: { id: user.id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!freshUser) {
        throw new NotFoundException('User not found');
      }

      const desiredRole = UserRole.PREMIUM;
      const currentLevel = this.getUserRoleLevel(freshUser.role);
      const desiredLevel = this.getUserRoleLevel(desiredRole);
      if (desiredLevel > currentLevel) {
        freshUser.role = desiredRole;
      }

      if (!freshUser.premiumLifetimeGrantedAt) {
        freshUser.premiumLifetimeGrantedAt = creditedAt;
      }

      freshUser.stripeCustomerId = customerId;

      const next = new Date(creditedAt);
      next.setFullYear(next.getFullYear() + 1);
      freshUser.paidAccessExpiresAt = next;

      const balanceBefore = parseFloat(freshUser.walletBalance.toString());
      const balanceAfter = balanceBefore + pupuAmount;
      freshUser.walletBalance = balanceAfter;

      await usersRepo.save(freshUser);

      await transactionsRepo.save(
        transactionsRepo.create({
          type: TransactionType.CREDIT,
          amount: pupuAmount,
          balanceBefore,
          balanceAfter,
          status: TransactionStatus.COMPLETED,
          fromUserId: user.id,
          toUserId: user.id,
          description: `[Nuna'a Heritage] Pūpū d'inscription - Pack Umete (one-shot) - Paiement Stripe`,
        }),
      );
    });

    await this.ensureTeOhiSubscriptionWithTrial(customerId, userId);

    await this.referralService.checkAndRewardReferrer(userId);
    return payment;
  }

  private async ensureTeOhiSubscriptionWithTrial(customerId: string, userId: number) {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) return;

    if (user.stripeTeOhiSubscriptionId) {
      try {
        const existing = await this.stripe.subscriptions.retrieve(user.stripeTeOhiSubscriptionId);
        if (existing.status === 'active' || existing.status === 'trialing') {
          console.log(`[Stripe] User ${userId} already has Te Ohi subscription ${existing.id}`);
          return;
        }
      } catch {
        // continue to create
      }
    }

    const teOhiPriceId = this.getTeOhiPriceId();
    const created = await this.stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: teOhiPriceId }],
      trial_period_days: UMETE_ONETIME_TRIAL_DAYS,
      metadata: {
        userId: String(userId),
        source: 'umete_onetime_bundle',
      },
    });
    const subscription = await this.stripe.subscriptions.retrieve(created.id, {
      expand: ['items.data'],
    });

    user.stripeTeOhiSubscriptionId = subscription.id;
    user.stripeCustomerId = customerId;
    user.paidAccessExpiresAt = subscriptionPaidAccessEnd(subscription);
    await this.usersRepository.save(user);

    console.log(
      `[Stripe] Created Te Ohi subscription ${subscription.id} with trial for user ${userId}`,
    );
  }

  private async processTeOhiSubscriptionCheckoutCompleted(session: Stripe.Checkout.Session) {
    const userId = parseInt(session.metadata?.userId || '0', 10);
    if (!userId) {
      console.error(`[Stripe Webhook] Missing userId in session metadata`, { metadata: session.metadata });
      throw new BadRequestException('Missing userId in session metadata');
    }

    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const payment = await this.paymentsRepository.findOne({
      where: { stripeSessionId: session.id },
    });
    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    if (payment.status === StripePaymentStatus.PAID) {
      console.log(`[Stripe Webhook] Payment already processed for session ${session.id}, skipping`);
      await this.referralService.checkAndRewardReferrer(userId);
      return payment;
    }

    const pack = payment.pack as unknown as PackCode;
    const desiredRole = this.getRoleForPack(pack);
    const creditedAt = new Date();

    payment.status = StripePaymentStatus.PAID;
    payment.paidAt = creditedAt;
    payment.stripePaymentIntentId =
      typeof session.payment_intent === 'string'
        ? session.payment_intent
        : session.payment_intent?.id ?? null;
    const cust =
      typeof session.customer === 'string' ? session.customer : session.customer?.id ?? null;
    payment.stripeCustomerId = cust;
    await this.paymentsRepository.save(payment);

    const pupuAmount = inscriptionPupuAmount(pack === 'umete' ? 'umete' : 'teOhi', creditedAt);

    const subId =
      typeof session.subscription === 'string'
        ? session.subscription
        : session.subscription?.id ?? null;

    let periodEnd = new Date(creditedAt);
    periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    if (subId) {
      const sub = await this.stripe.subscriptions.retrieve(subId, {
        expand: ['items.data'],
      });
      periodEnd = subscriptionPaidAccessEnd(sub);
    }

    await this.dataSource.transaction(async (manager) => {
      const usersRepo = manager.getRepository(User);
      const transactionsRepo = manager.getRepository(Transaction);

      const freshUser = await usersRepo.findOne({
        where: { id: user.id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!freshUser) {
        throw new NotFoundException('User not found');
      }

      const currentLevel = this.getUserRoleLevel(freshUser.role);
      const desiredLevel = this.getUserRoleLevel(desiredRole);
      if (desiredLevel > currentLevel) {
        freshUser.role = desiredRole;
      }

      if (pack === 'umete' && !freshUser.premiumLifetimeGrantedAt) {
        freshUser.premiumLifetimeGrantedAt = creditedAt;
      }

      if (cust) {
        freshUser.stripeCustomerId = cust;
      }
      if (subId) {
        freshUser.stripeTeOhiSubscriptionId = subId;
      }

      freshUser.paidAccessExpiresAt = periodEnd;

      const balanceBefore = parseFloat(freshUser.walletBalance.toString());
      const balanceAfter = balanceBefore + pupuAmount;
      freshUser.walletBalance = balanceAfter;

      await usersRepo.save(freshUser);

      await transactionsRepo.save(
        transactionsRepo.create({
          type: TransactionType.CREDIT,
          amount: pupuAmount,
          balanceBefore,
          balanceAfter,
          status: TransactionStatus.COMPLETED,
          fromUserId: user.id,
          toUserId: user.id,
          description: `[Nuna'a Heritage] Pūpū d'inscription - Cotisation ${pack === 'teOhi' ? 'Te Ohi' : 'Umete'} - Paiement Stripe`,
        }),
      );
    });

    await this.referralService.checkAndRewardReferrer(userId);
    return payment;
  }

  private async processSubscriptionUpdate(subscription: Stripe.Subscription) {
    const sub = subscription as Stripe.Subscription;
    const userId = parseInt(sub.metadata?.userId || '0', 10);
    if (!userId) {
      console.log('[Stripe] subscription update: no userId in metadata', sub.id);
      return;
    }

    if (sub.status !== 'active' && sub.status !== 'trialing') {
      return;
    }

    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) {
      return;
    }

    user.stripeTeOhiSubscriptionId = sub.id;
    if (typeof sub.customer === 'string') {
      user.stripeCustomerId = sub.customer;
    }
    user.paidAccessExpiresAt = subscriptionPaidAccessEnd(sub);
    await this.usersRepository.save(user);

    console.log(`[Stripe] Synced subscription ${sub.id} for user ${userId}`);
  }

  private async processInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
    if (invoice.status !== 'paid') {
      return;
    }

    const inv = invoice as Stripe.Invoice & {
      subscription?: string | Stripe.Subscription | null;
    };
    const subRef = inv.subscription;
    const subId = typeof subRef === 'string' ? subRef : subRef?.id;
    if (!subId) {
      return;
    }

    if ((invoice.amount_paid ?? 0) === 0) {
      return;
    }

    const sub = await this.stripe.subscriptions.retrieve(subId, { expand: ['items.data'] });
    const userId = parseInt(sub.metadata?.userId || '0', 10);
    if (!userId) {
      return;
    }

    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) {
      return;
    }

    user.paidAccessExpiresAt = subscriptionPaidAccessEnd(sub);
    user.stripeTeOhiSubscriptionId = sub.id;
    if (typeof sub.customer === 'string') {
      user.stripeCustomerId = sub.customer;
    }
    await this.usersRepository.save(user);

    console.log(`[Stripe] invoice.payment_succeeded extended access for user ${userId}`);
  }

  async processTeNatiraaBySessionId(sessionId: string) {
    const session = await this.stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status !== 'paid') {
      throw new BadRequestException(
        `Le paiement n'est pas encore confirmé (statut: ${session.payment_status})`,
      );
    }

    if (session.metadata?.type !== 'teNatiraa') {
      throw new BadRequestException("Cette session n'est pas une inscription Te Natira'a");
    }

    const existing = await this.teNatiraaRegistrationsRepository.findOne({
      where: { stripeSessionId: sessionId },
    });
    if (existing) {
      return { alreadyProcessed: true, registration: existing };
    }

    return this.processTeNatiraaCheckoutCompleted(session);
  }

  async processPendingPaymentBySessionId(sessionId: string, currentUserId?: number) {
    console.log(`[Stripe] Processing pending payment for session: ${sessionId}`);

    const session = await this.stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status !== 'paid') {
      throw new BadRequestException(
        `Session payment status is ${session.payment_status}, expected 'paid'`,
      );
    }

    if (session.metadata?.type !== 'teNatiraa' && currentUserId !== undefined) {
      const sessionUserId = parseInt(session.metadata?.userId || '0', 10);
      if (sessionUserId !== currentUserId) {
        throw new UnauthorizedException('Cette session de paiement ne vous appartient pas');
      }
    }

    const mockEvent: Stripe.Event = {
      id: `evt_manual_${Date.now()}`,
      object: 'event',
      api_version: '2026-02-25.clover',
      created: Math.floor(Date.now() / 1000),
      data: {
        object: session,
      },
      livemode: false,
      pending_webhooks: 0,
      request: null,
      type: 'checkout.session.completed',
    } as Stripe.Event;

    return this.handleWebhook(mockEvent);
  }

  async getMyLatestStripePayment(userId: number) {
    const payment = await this.paymentsRepository.findOne({
      where: { userId },
      order: { createdAt: 'DESC' },
    });

    const user = await this.usersRepository.findOne({ where: { id: userId } });

    return {
      payment: payment
        ? {
            id: payment.id,
            pack: payment.pack,
            amountXpf: payment.amountXpf,
            status: payment.status,
            stripeSessionId: payment.stripeSessionId,
            paidAt: payment.paidAt,
            createdAt: payment.createdAt,
          }
        : null,
      user: user
        ? {
            role: user.role,
            paidAccessExpiresAt: user.paidAccessExpiresAt,
            premiumLifetimeGrantedAt: user.premiumLifetimeGrantedAt,
            stripeCustomerId: user.stripeCustomerId,
            stripeTeOhiSubscriptionId: user.stripeTeOhiSubscriptionId,
          }
        : null,
    };
  }

  /** Admin / agent : résumé cotisation Stripe pour un utilisateur. */
  async adminGetUserStripeSummary(userId: number) {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    const payment = await this.paymentsRepository.findOne({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
    return {
      userId: user.id,
      email: user.email,
      role: user.role,
      stripeCustomerId: user.stripeCustomerId,
      stripeTeOhiSubscriptionId: user.stripeTeOhiSubscriptionId,
      paidAccessExpiresAt: user.paidAccessExpiresAt,
      premiumLifetimeGrantedAt: user.premiumLifetimeGrantedAt,
      latestStripePayment: payment
        ? {
            id: payment.id,
            pack: payment.pack,
            amountXpf: payment.amountXpf,
            status: payment.status,
            stripeSessionId: payment.stripeSessionId,
            stripePaymentIntentId: payment.stripePaymentIntentId,
            paidAt: payment.paidAt,
            createdAt: payment.createdAt,
          }
        : null,
    };
  }

  async adminListStripePayments(limit: number) {
    const take = Math.min(100, Math.max(1, limit || 20));
    const rows = await this.paymentsRepository.find({
      order: { createdAt: 'DESC' },
      take,
      relations: ['user'],
    });
    return rows.map((p) => ({
      id: p.id,
      userId: p.userId,
      userEmail: p.user?.email,
      pack: p.pack,
      amountXpf: p.amountXpf,
      status: p.status,
      stripeSessionId: p.stripeSessionId,
      stripePaymentIntentId: p.stripePaymentIntentId,
      paidAt: p.paidAt,
      createdAt: p.createdAt,
    }));
  }

  /**
   * Admin : rejoue le traitement d'une session checkout payée (webhook manquant).
   * Ne vérifie pas que la session appartient à l'utilisateur courant.
   */
  async adminReplayCheckoutSession(sessionId: string) {
    return this.processPendingPaymentBySessionId(sessionId, undefined);
  }

  async adminCancelTeOhiSubscription(userId: number) {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    if (!user.stripeTeOhiSubscriptionId) {
      return { cancelled: false, message: 'Aucun abonnement Te Ohi enregistré pour cet utilisateur.' };
    }
    try {
      await this.stripe.subscriptions.cancel(user.stripeTeOhiSubscriptionId);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erreur Stripe';
      throw new BadRequestException(msg);
    }
    user.stripeTeOhiSubscriptionId = null;
    await this.usersRepository.save(user);
    return {
      cancelled: true,
      message: 'Abonnement annulé côté Stripe ; stripeTeOhiSubscriptionId effacé sur le profil.',
    };
  }

  /** Rembourse le paiement associé (payment_intent). Admin uniquement. */
  async adminRefundStripePayment(paymentId: number) {
    const payment = await this.paymentsRepository.findOne({ where: { id: paymentId } });
    if (!payment) {
      throw new NotFoundException('Paiement introuvable');
    }
    if (payment.status !== StripePaymentStatus.PAID) {
      throw new BadRequestException('Seuls les paiements au statut "paid" peuvent être remboursés.');
    }
    if (!payment.stripePaymentIntentId) {
      throw new BadRequestException('Pas de payment_intent Stripe associé à cet enregistrement.');
    }
    const refund = await this.stripe.refunds.create({
      payment_intent: payment.stripePaymentIntentId,
    });
    return {
      refundId: refund.id,
      status: refund.status,
      paymentId: payment.id,
      amountXpf: payment.amountXpf,
    };
  }
}
