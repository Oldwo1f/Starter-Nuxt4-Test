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
import { StripePayment, StripePack, StripePaymentStatus } from '../entities/stripe-payment.entity';
import { User, UserRole } from '../entities/user.entity';
import { Transaction, TransactionType, TransactionStatus } from '../entities/transaction.entity';

type PackCode = 'teOhi' | 'umete';

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
    private dataSource: DataSource,
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

  private getPriceIdForPack(pack: PackCode): string {
    if (pack === 'teOhi') {
      const priceId = process.env.STRIPE_TEOHI_PRICE_ID;
      if (!priceId) {
        throw new InternalServerErrorException('STRIPE_TEOHI_PRICE_ID is not configured');
      }
      return priceId;
    }
    if (pack === 'umete') {
      const priceId = process.env.STRIPE_UMETE_PRICE_ID;
      if (!priceId) {
        throw new InternalServerErrorException('STRIPE_UMETE_PRICE_ID is not configured');
      }
      return priceId;
    }
    throw new BadRequestException('Invalid pack');
  }

  async createCheckoutSession(userId: number, pack: PackCode) {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const amountXpf = this.getAmountForPack(pack);
    const priceId = this.getPriceIdForPack(pack);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

    // Create Stripe checkout session
    const session = await this.stripe.checkout.sessions.create({
      mode: 'subscription',
      customer_email: user.email,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${frontendUrl}/account/cotisation?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${frontendUrl}/account/cotisation?canceled=true`,
      metadata: {
        userId: userId.toString(),
        pack: pack,
        amountXpf: amountXpf.toString(),
      },
    });

    // Save payment record
    const payment = this.paymentsRepository.create({
      userId,
      pack: pack as unknown as StripePack,
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
      console.log(`[Stripe Webhook] Processing checkout.session.completed`, { 
        sessionId: session.id,
        userId: session.metadata?.userId 
      });
      await this.processCheckoutSessionCompleted(session);
      console.log(`[Stripe Webhook] Successfully processed checkout.session.completed`);
    } else if (event.type === 'customer.subscription.created' || event.type === 'customer.subscription.updated') {
      const subscription = event.data.object as Stripe.Subscription;
      await this.processSubscriptionUpdate(subscription);
    }

    return { received: true };
  }

  private async processCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
    const userId = parseInt(session.metadata?.userId || '0', 10);
    if (!userId) {
      console.error(`[Stripe Webhook] Missing userId in session metadata`, { metadata: session.metadata });
      throw new BadRequestException('Missing userId in session metadata');
    }

    console.log(`[Stripe Webhook] Processing payment for user ${userId}`);

    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) {
      console.error(`[Stripe Webhook] User not found`, { userId });
      throw new NotFoundException('User not found');
    }

    console.log(`[Stripe Webhook] User found:`, { 
      id: user.id, 
      email: user.email, 
      currentRole: user.role 
    });

    // Find payment by session ID
    const payment = await this.paymentsRepository.findOne({
      where: { stripeSessionId: session.id },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    // Update payment status
    payment.status = StripePaymentStatus.PAID;
    payment.paidAt = new Date();
    payment.stripePaymentIntentId = session.payment_intent as string | null;
    payment.stripeCustomerId = session.customer as string | null;

    await this.paymentsRepository.save(payment);

    // Grant access to user
    const pack = payment.pack as unknown as PackCode;
    const desiredRole = this.getRoleForPack(pack);
    const now = new Date();

    // Grant inscription Pūpū (50 for Te Ohi, 100 for Umete)
    const pupuAmount = pack === 'teOhi' ? 50 : 100;

    // Use transaction to ensure atomicity
    await this.dataSource.transaction(async (manager) => {
      const usersRepo = manager.getRepository(User);
      const transactionsRepo = manager.getRepository(Transaction);

      // Reload user with lock to avoid race conditions
      const freshUser = await usersRepo.findOne({
        where: { id: user.id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!freshUser) {
        throw new NotFoundException('User not found');
      }

      // Upgrade role only if needed (never downgrade) - same logic as billing service
      const currentLevel = this.getUserRoleLevel(freshUser.role);
      const desiredLevel = this.getUserRoleLevel(desiredRole);
      console.log(`[Stripe Webhook] Role check:`, { 
        currentRole: freshUser.role, 
        currentLevel, 
        desiredRole, 
        desiredLevel 
      });
      if (desiredLevel > currentLevel) {
        freshUser.role = desiredRole;
        console.log(`[Stripe Webhook] Role upgraded to:`, desiredRole);
      } else {
        console.log(`[Stripe Webhook] Role not upgraded (current level ${currentLevel} >= desired level ${desiredLevel})`);
      }

      // Update access expiration: always add 1 year from now (payment date)
      // This ensures the subscription is always 1 year from the payment, not from existing expiration
      const next = new Date(now);
      next.setFullYear(next.getFullYear() + 1);
      freshUser.paidAccessExpiresAt = next;
      console.log(`[Stripe Webhook] Access expiration updated:`, {
        now: now.toISOString(),
        next: next.toISOString(),
        previousExpiration: freshUser.paidAccessExpiresAt ? freshUser.paidAccessExpiresAt.toISOString() : null
      });

      // Update wallet balance
      const balanceBefore = parseFloat(freshUser.walletBalance.toString());
      const balanceAfter = balanceBefore + pupuAmount;
      freshUser.walletBalance = balanceAfter;
      
      await usersRepo.save(freshUser);
      console.log(`[Stripe Webhook] User updated:`, { 
        role: freshUser.role, 
        paidAccessExpiresAt: freshUser.paidAccessExpiresAt,
        walletBalance: freshUser.walletBalance 
      });

      // Create transaction record for inscription Pūpū
      const transaction = transactionsRepo.create({
        type: TransactionType.CREDIT,
        amount: pupuAmount,
        balanceBefore,
        balanceAfter,
        status: TransactionStatus.COMPLETED,
        fromUserId: user.id, // System grants
        toUserId: user.id,
        description: `[Nuna'a Heritage] Pūpū d'inscription - Cotisation ${pack === 'teOhi' ? 'Te Ohi' : 'Umete'} - Paiement Stripe`,
      });
      await transactionsRepo.save(transaction);
    });

    return payment;
  }

  private async processSubscriptionUpdate(subscription: Stripe.Subscription) {
    // Handle subscription updates if needed
    // For now, we just log it
    console.log('Subscription updated:', subscription.id);
  }

  async processPendingPaymentBySessionId(sessionId: string) {
    console.log(`[Stripe] Processing pending payment for session: ${sessionId}`);
    
    // Retrieve session from Stripe
    const session = await this.stripe.checkout.sessions.retrieve(sessionId);
    
    if (session.payment_status !== 'paid') {
      throw new BadRequestException(`Session payment status is ${session.payment_status}, expected 'paid'`);
    }

    // Create a mock event to process
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
          }
        : null,
    };
  }
}
