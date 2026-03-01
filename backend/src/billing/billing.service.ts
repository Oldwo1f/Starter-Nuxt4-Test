import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import * as crypto from 'crypto';
import {
  BankTransferPack,
  BankTransferPayment,
  BankTransferPaymentStatus,
} from '../entities/bank-transfer-payment.entity';
import {
  LegacyPaymentVerification,
  LegacyPaidWith,
  LegacyVerificationStatus,
} from '../entities/legacy-payment-verification.entity';
import { User, UserRole } from '../entities/user.entity';
import { Transaction, TransactionType, TransactionStatus } from '../entities/transaction.entity';

type PackCode = 'teOhi' | 'umete';

@Injectable()
export class BillingService {
  constructor(
    @InjectRepository(BankTransferPayment)
    private paymentsRepository: Repository<BankTransferPayment>,
    @InjectRepository(LegacyPaymentVerification)
    private legacyVerificationsRepository: Repository<LegacyPaymentVerification>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(Transaction)
    private transactionsRepository: Repository<Transaction>,
    private dataSource: DataSource,
  ) {}

  private getAmountForPack(pack: PackCode): number {
    if (pack === 'teOhi') return 5000;
    if (pack === 'umete') return 20000;
    // Should be unreachable because DTO validates, but keep it safe
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

  private generateReferenceId(userId: number, pack: PackCode): string {
    const packCode = pack === 'teOhi' ? 'TO' : 'UM';
    // 8 hex chars, uppercased, readable for bank labels
    const rand = crypto.randomBytes(4).toString('hex').toUpperCase();
    return `NH-${userId}-${packCode}-${rand}`;
  }

  async createOrReuseBankTransferIntent(userId: number, pack: PackCode) {
    const amountXpf = this.getAmountForPack(pack);

    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Reuse the latest pending intent for same pack (avoid generating multiple refs)
    const existing = await this.paymentsRepository.findOne({
      where: {
        userId,
        pack: pack as unknown as BankTransferPack,
        status: BankTransferPaymentStatus.PENDING,
      },
      order: { createdAt: 'DESC' },
    });

    if (existing) {
      return {
        id: existing.id,
        referenceId: existing.referenceId,
        pack: existing.pack,
        amountXpf: existing.amountXpf,
        status: existing.status,
        needsVerification: existing.needsVerification,
        pupuInscriptionReceived: existing.pupuInscriptionReceived,
        createdAt: existing.createdAt,
        paidAt: existing.paidAt,
      };
    }

    const referenceId = this.generateReferenceId(userId, pack);

    const payment = this.paymentsRepository.create({
      userId,
      pack: pack as unknown as BankTransferPack,
      amountXpf,
      referenceId,
      status: BankTransferPaymentStatus.PENDING,
    });

    const saved = await this.paymentsRepository.save(payment);
    return {
      id: saved.id,
      referenceId: saved.referenceId,
      pack: saved.pack,
      amountXpf: saved.amountXpf,
      status: saved.status,
      needsVerification: saved.needsVerification,
      pupuInscriptionReceived: saved.pupuInscriptionReceived,
      createdAt: saved.createdAt,
      paidAt: saved.paidAt,
    };
  }

  async getMyLatestBankTransferPayment(userId: number) {
    const latest = await this.paymentsRepository.findOne({
      where: { userId },
      order: { createdAt: 'DESC' },
    });

    const user = await this.usersRepository.findOne({
      where: { id: userId },
      select: ['id', 'role', 'paidAccessExpiresAt'],
    });

    return {
      payment: latest
        ? {
            id: latest.id,
            referenceId: latest.referenceId,
            pack: latest.pack,
            amountXpf: latest.amountXpf,
            status: latest.status,
            bankTransactionId: latest.bankTransactionId,
            payerName: latest.payerName,
            paidAt: latest.paidAt,
            needsVerification: latest.needsVerification,
            pupuInscriptionReceived: latest.pupuInscriptionReceived,
            createdAt: latest.createdAt,
            updatedAt: latest.updatedAt,
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

  async processBankTransferWebhook(input: {
    referenceId: string;
    amountXpf: number;
    bankTransactionId?: string;
    payerName?: string;
    paidAt?: string;
  }) {
    const payment = await this.paymentsRepository.findOne({
      where: { referenceId: input.referenceId },
    });
    if (!payment) {
      throw new NotFoundException('Reference not found');
    }

    // Idempotence: already processed
    if (payment.status === BankTransferPaymentStatus.PAID) {
      return { ok: true, alreadyProcessed: true };
    }

    if (input.amountXpf !== payment.amountXpf) {
      throw new BadRequestException('Amount mismatch for this reference');
    }

    const now = new Date();
    const paidAt = input.paidAt ? new Date(input.paidAt) : now;
    if (Number.isNaN(paidAt.getTime())) {
      throw new BadRequestException('Invalid paidAt date');
    }

    const desiredRole = this.getRoleForPack(payment.pack as unknown as PackCode);

    await this.dataSource.transaction(async (manager) => {
      const paymentsRepo = manager.getRepository(BankTransferPayment);
      const usersRepo = manager.getRepository(User);

      const freshPayment = await paymentsRepo.findOne({
        where: { id: payment.id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!freshPayment) {
        throw new NotFoundException('Payment not found');
      }

      if (freshPayment.status === BankTransferPaymentStatus.PAID) {
        // Another request processed it first
        return;
      }

      freshPayment.status = BankTransferPaymentStatus.PAID;
      freshPayment.paidAt = paidAt;
      freshPayment.bankTransactionId = input.bankTransactionId || null;
      freshPayment.payerName = input.payerName || null;
      await paymentsRepo.save(freshPayment);

      const user = await usersRepo.findOne({
        where: { id: freshPayment.userId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      // Upgrade role only if needed (never downgrade)
      const currentLevel = this.getUserRoleLevel(user.role);
      const desiredLevel = this.getUserRoleLevel(desiredRole);
      if (desiredLevel > currentLevel) {
        user.role = desiredRole;
      }

      const base = user.paidAccessExpiresAt && user.paidAccessExpiresAt > now ? user.paidAccessExpiresAt : now;
      const next = new Date(base);
      next.setFullYear(next.getFullYear() + 1);
      user.paidAccessExpiresAt = next;

      await usersRepo.save(user);
    });

    return { ok: true, alreadyProcessed: false };
  }

  async requestVerification(userId: number, paymentId: number) {
    const payment = await this.paymentsRepository.findOne({
      where: { id: paymentId, userId },
    });
    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    if (payment.status !== BankTransferPaymentStatus.PENDING) {
      throw new BadRequestException('Only pending payments can request verification');
    }

    if (payment.needsVerification) {
      // Already requested, return existing state
      return { ok: true, alreadyRequested: true };
    }

    const desiredRole = this.getRoleForPack(payment.pack as unknown as PackCode);
    const now = new Date();

    await this.dataSource.transaction(async (manager) => {
      const paymentsRepo = manager.getRepository(BankTransferPayment);
      const usersRepo = manager.getRepository(User);

      const freshPayment = await paymentsRepo.findOne({
        where: { id: payment.id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!freshPayment || freshPayment.needsVerification) {
        return; // Already processed or already requested
      }

      freshPayment.needsVerification = true;
      await paymentsRepo.save(freshPayment);

      const user = await usersRepo.findOne({
        where: { id: userId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      // Grant temporary access (1 year from now)
      const currentLevel = this.getUserRoleLevel(user.role);
      const desiredLevel = this.getUserRoleLevel(desiredRole);
      if (desiredLevel > currentLevel) {
        user.role = desiredRole;
      }

      const base = user.paidAccessExpiresAt && user.paidAccessExpiresAt > now ? user.paidAccessExpiresAt : now;
      const next = new Date(base);
      next.setFullYear(next.getFullYear() + 1);
      user.paidAccessExpiresAt = next;

      await usersRepo.save(user);
    });

    return { ok: true, alreadyRequested: false };
  }

  async getPendingVerifications() {
    const payments = await this.paymentsRepository.find({
      where: { needsVerification: true },
      relations: ['user'],
      order: { createdAt: 'DESC' },
    });

    return payments.map((p) => ({
      id: p.id,
      referenceId: p.referenceId,
      pack: p.pack,
      amountXpf: p.amountXpf,
      createdAt: p.createdAt,
      user: {
        id: p.user.id,
        email: p.user.email,
        firstName: p.user.firstName,
        lastName: p.user.lastName,
      },
    }));
  }

  async confirmVerification(paymentId: number, adminUserId: number) {
    const payment = await this.paymentsRepository.findOne({
      where: { id: paymentId },
      relations: ['user'],
    });
    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    if (!payment.needsVerification) {
      throw new BadRequestException('This payment does not need verification');
    }

    if (payment.status === BankTransferPaymentStatus.PAID) {
      // Already confirmed, but still grant Pūpū if not received
      if (!payment.pupuInscriptionReceived) {
        await this.grantInscriptionPupu(payment.userId, payment.pack as unknown as PackCode);
        payment.pupuInscriptionReceived = true;
        await this.paymentsRepository.save(payment);
      }
      return { ok: true, alreadyConfirmed: true };
    }

    const desiredRole = this.getRoleForPack(payment.pack as unknown as PackCode);
    const now = new Date();

    await this.dataSource.transaction(async (manager) => {
      const paymentsRepo = manager.getRepository(BankTransferPayment);
      const usersRepo = manager.getRepository(User);
      const transactionsRepo = manager.getRepository(Transaction);

      const freshPayment = await paymentsRepo.findOne({
        where: { id: payment.id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!freshPayment) {
        throw new NotFoundException('Payment not found');
      }

      if (freshPayment.status === BankTransferPaymentStatus.PAID) {
        return; // Already processed
      }

      freshPayment.status = BankTransferPaymentStatus.PAID;
      freshPayment.needsVerification = false;
      freshPayment.paidAt = now;
      await paymentsRepo.save(freshPayment);

      const user = await usersRepo.findOne({
        where: { id: freshPayment.userId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      // Confirm role and extend access
      const currentLevel = this.getUserRoleLevel(user.role);
      const desiredLevel = this.getUserRoleLevel(desiredRole);
      if (desiredLevel > currentLevel) {
        user.role = desiredRole;
      }

      const base = user.paidAccessExpiresAt && user.paidAccessExpiresAt > now ? user.paidAccessExpiresAt : now;
      const next = new Date(base);
      next.setFullYear(next.getFullYear() + 1);
      user.paidAccessExpiresAt = next;

      await usersRepo.save(user);

      // Grant Pūpū d'inscription
      const pupuAmount = payment.pack === BankTransferPack.TE_OHI ? 50 : 100;
      const balanceBefore = parseFloat(user.walletBalance.toString());
      const balanceAfter = balanceBefore + pupuAmount;
      user.walletBalance = balanceAfter;
      await usersRepo.save(user);

      // Create transaction record
      const transaction = transactionsRepo.create({
        type: TransactionType.CREDIT,
        amount: pupuAmount,
        balanceBefore,
        balanceAfter,
        status: TransactionStatus.COMPLETED,
        fromUserId: adminUserId, // System/admin grants
        toUserId: user.id,
        description: `[Nuna'a Heritage] Pūpū d'inscription - Cotisation ${payment.pack === BankTransferPack.TE_OHI ? 'Te Ohi' : 'Umete'}`,
      });
      await transactionsRepo.save(transaction);

      freshPayment.pupuInscriptionReceived = true;
      await paymentsRepo.save(freshPayment);
    });

    return { ok: true, alreadyConfirmed: false };
  }

  private async grantInscriptionPupu(userId: number, pack: PackCode) {
    const pupuAmount = pack === 'teOhi' ? 50 : 100;
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const balanceBefore = parseFloat(user.walletBalance.toString());
    const balanceAfter = balanceBefore + pupuAmount;
    user.walletBalance = balanceAfter;
    await this.usersRepository.save(user);

    // Create transaction record (system credit)
    const transaction = this.transactionsRepository.create({
      type: TransactionType.CREDIT,
      amount: pupuAmount,
      balanceBefore,
      balanceAfter,
      status: TransactionStatus.COMPLETED,
      fromUserId: userId, // System grants (could be a system user ID)
      toUserId: userId,
      description: `[Nuna'a Heritage] Pūpū d'inscription - Cotisation ${pack === 'teOhi' ? 'Te Ohi' : 'Umete'}`,
    });
    await this.transactionsRepository.save(transaction);
  }

  // Legacy payment verification methods
  async requestLegacyVerification(userId: number, paidWith: 'naho' | 'tamiga') {
    // Check if user already has a pending verification
    const existing = await this.legacyVerificationsRepository.findOne({
      where: { userId, status: LegacyVerificationStatus.PENDING },
    });
    if (existing) {
      return { ok: true, alreadyRequested: true, verificationId: existing.id };
    }

    const now = new Date();
    const desiredRole = UserRole.MEMBER; // Always Te Ohi for legacy payments

    await this.dataSource.transaction(async (manager) => {
      const legacyRepo = manager.getRepository(LegacyPaymentVerification);
      const usersRepo = manager.getRepository(User);

      // Create verification record
      const verification = legacyRepo.create({
        userId,
        paidWith: paidWith === 'naho' ? LegacyPaidWith.NAHO : LegacyPaidWith.TAMIGA,
        status: LegacyVerificationStatus.PENDING,
        pupuInscriptionReceived: false,
      });
      await legacyRepo.save(verification);

      // Grant optimistic access (Te Ohi - member role, 1 year from now)
      const user = await usersRepo.findOne({
        where: { id: userId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      const currentLevel = this.getUserRoleLevel(user.role);
      const desiredLevel = this.getUserRoleLevel(desiredRole);
      if (desiredLevel > currentLevel) {
        user.role = desiredRole;
      }

      // Always add 1 year from now (not from existing expiration)
      const next = new Date(now);
      next.setFullYear(next.getFullYear() + 1);
      user.paidAccessExpiresAt = next;

      await usersRepo.save(user);
    });

    return { ok: true, alreadyRequested: false };
  }

  async getMyLegacyVerification(userId: number) {
    const verification = await this.legacyVerificationsRepository.findOne({
      where: { userId, status: LegacyVerificationStatus.PENDING },
      order: { createdAt: 'DESC' },
    });

    if (!verification) {
      return { verification: null, user: null };
    }

    const user = await this.usersRepository.findOne({
      where: { id: userId },
      select: ['id', 'role', 'paidAccessExpiresAt'],
    });

    return {
      verification: {
        id: verification.id,
        paidWith: verification.paidWith,
        status: verification.status,
        createdAt: verification.createdAt,
      },
      user: user ? {
        role: user.role,
        paidAccessExpiresAt: user.paidAccessExpiresAt,
      } : null,
    };
  }

  async getPendingLegacyVerifications() {
    const verifications = await this.legacyVerificationsRepository.find({
      where: { status: LegacyVerificationStatus.PENDING },
      relations: ['user'],
      order: { createdAt: 'DESC' },
    });

    return verifications.map((v) => ({
      id: v.id,
      paidWith: v.paidWith,
      createdAt: v.createdAt,
      user: {
        id: v.user.id,
        email: v.user.email,
        firstName: v.user.firstName,
        lastName: v.user.lastName,
      },
    }));
  }

  async confirmLegacyVerification(
    verificationId: number,
    adminUserId: number,
    upgradeToPremium: boolean = false,
    expirationDay?: number,
    expirationMonth?: number,
  ) {
    const verification = await this.legacyVerificationsRepository.findOne({
      where: { id: verificationId },
      relations: ['user'],
    });
    if (!verification) {
      throw new NotFoundException('Verification not found');
    }

    if (verification.status !== LegacyVerificationStatus.PENDING) {
      throw new BadRequestException('Only pending verifications can be confirmed');
    }

    // Validate custom expiration date
    if ((expirationDay && !expirationMonth) || (!expirationDay && expirationMonth)) {
      throw new BadRequestException('Both expirationDay and expirationMonth must be provided, or neither');
    }
    if (expirationDay && expirationMonth) {
      if (expirationDay < 1 || expirationDay > 31 || expirationMonth < 1 || expirationMonth > 12) {
        throw new BadRequestException('Invalid expiration date: day must be 1-31, month must be 1-12');
      }
    }

    const now = new Date();
    const finalRole = upgradeToPremium ? UserRole.PREMIUM : UserRole.MEMBER;

    await this.dataSource.transaction(async (manager) => {
      const legacyRepo = manager.getRepository(LegacyPaymentVerification);
      const usersRepo = manager.getRepository(User);
      const transactionsRepo = manager.getRepository(Transaction);

      const freshVerification = await legacyRepo.findOne({
        where: { id: verification.id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!freshVerification || freshVerification.status !== LegacyVerificationStatus.PENDING) {
        return; // Already processed
      }

      freshVerification.status = LegacyVerificationStatus.CONFIRMED;
      await legacyRepo.save(freshVerification);

      const user = await usersRepo.findOne({
        where: { id: freshVerification.userId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      // Update role if upgrading to premium
      const currentLevel = this.getUserRoleLevel(user.role);
      const desiredLevel = this.getUserRoleLevel(finalRole);
      if (desiredLevel > currentLevel) {
        user.role = finalRole;
      }

      // Calculate expiration date
      let next: Date;
      if (expirationDay !== undefined && expirationDay !== null && expirationMonth !== undefined && expirationMonth !== null) {
        // Custom expiration date: next occurrence of day/month
        const currentYear = now.getFullYear();
        const customDate = new Date(currentYear, expirationMonth - 1, expirationDay);
        
        // Validate the date (handle invalid dates like Feb 30)
        if (customDate.getDate() !== expirationDay || customDate.getMonth() !== expirationMonth - 1) {
          throw new BadRequestException(`Invalid date: ${expirationDay}/${expirationMonth} does not exist`);
        }
        
        // If the date has passed this year, use next year
        if (customDate < now) {
          next = new Date(currentYear + 1, expirationMonth - 1, expirationDay);
        } else {
          next = customDate;
        }
        console.log(`[Legacy Verification] Using custom expiration date: ${next.toISOString()} (day: ${expirationDay}, month: ${expirationMonth})`);
      } else {
        // Default: 1 year from now
        next = new Date(now);
        next.setFullYear(next.getFullYear() + 1);
        console.log(`[Legacy Verification] Using default expiration date: ${next.toISOString()} (1 year from now)`);
      }
      user.paidAccessExpiresAt = next;

      // Grant Pūpū d'inscription (50 for Te Ohi)
      if (!freshVerification.pupuInscriptionReceived) {
        const pupuAmount = 50; // Always Te Ohi for legacy
        const balanceBefore = parseFloat(user.walletBalance.toString());
        const balanceAfter = balanceBefore + pupuAmount;
        user.walletBalance = balanceAfter;
        await usersRepo.save(user);

        // Create transaction record
        const transaction = transactionsRepo.create({
          type: TransactionType.CREDIT,
          amount: pupuAmount,
          balanceBefore,
          balanceAfter,
          status: TransactionStatus.COMPLETED,
          fromUserId: adminUserId,
          toUserId: user.id,
          description: `[Nuna'a Heritage] Pūpū d'inscription - Cotisation Te Ohi (Legacy)`,
        });
        await transactionsRepo.save(transaction);

        freshVerification.pupuInscriptionReceived = true;
        await legacyRepo.save(freshVerification);
      } else {
        await usersRepo.save(user);
      }
    });

    return { ok: true };
  }

  async rejectLegacyVerification(verificationId: number, adminUserId: number) {
    const verification = await this.legacyVerificationsRepository.findOne({
      where: { id: verificationId },
      relations: ['user'],
    });
    if (!verification) {
      throw new NotFoundException('Verification not found');
    }

    if (verification.status !== LegacyVerificationStatus.PENDING) {
      throw new BadRequestException('Only pending verifications can be rejected');
    }

    await this.dataSource.transaction(async (manager) => {
      const legacyRepo = manager.getRepository(LegacyPaymentVerification);
      const usersRepo = manager.getRepository(User);

      const freshVerification = await legacyRepo.findOne({
        where: { id: verification.id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!freshVerification || freshVerification.status !== LegacyVerificationStatus.PENDING) {
        return; // Already processed
      }

      freshVerification.status = LegacyVerificationStatus.REJECTED;
      await legacyRepo.save(freshVerification);

      // Remove user rights
      const user = await usersRepo.findOne({
        where: { id: freshVerification.userId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      // Remove rights: role → user, paidAccessExpiresAt → null
      user.role = UserRole.USER;
      user.paidAccessExpiresAt = null;
      await usersRepo.save(user);
    });

    return { ok: true };
  }
}

