import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Referral, ReferralStatus } from '../entities/referral.entity';
import { User } from '../entities/user.entity';
import { Transaction, TransactionType, TransactionStatus } from '../entities/transaction.entity';
import * as crypto from 'crypto';

@Injectable()
export class ReferralService {
  constructor(
    @InjectRepository(Referral)
    private referralRepository: Repository<Referral>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Transaction)
    private transactionRepository: Repository<Transaction>,
    private dataSource: DataSource,
  ) {}

  /**
   * Génère un code de parrainage unique pour un utilisateur
   */
  async generateReferralCode(userId: number): Promise<string> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    // Si l'utilisateur a déjà un code, le retourner
    if (user.referralCode) {
      return user.referralCode;
    }

    // Générer un code unique (8 caractères alphanumériques)
    let code: string;
    let isUnique = false;
    let attempts = 0;
    const maxAttempts = 10;

    while (!isUnique && attempts < maxAttempts) {
      // Générer un code de 8 caractères
      code = crypto.randomBytes(4).toString('hex').toUpperCase();
      
      // Vérifier l'unicité
      const existing = await this.userRepository.findOne({
        where: { referralCode: code },
      });
      
      if (!existing) {
        isUnique = true;
      }
      attempts++;
    }

    if (!isUnique) {
      throw new BadRequestException('Impossible de générer un code de parrainage unique');
    }

    // Sauvegarder le code
    user.referralCode = code!;
    await this.userRepository.save(user);

    return code!;
  }

  /**
   * Récupère le code de parrainage d'un utilisateur (ou le génère s'il n'existe pas)
   */
  async getReferralCode(userId: number): Promise<string> {
    return this.generateReferralCode(userId);
  }

  /**
   * Crée une relation de parrainage lors de l'inscription
   */
  async createReferral(referrerCode: string, referredUserId: number): Promise<Referral> {
    // Trouver le parrain par son code
    const referrer = await this.userRepository.findOne({
      where: { referralCode: referrerCode },
    });

    if (!referrer) {
      throw new NotFoundException(`Code de parrainage invalide: ${referrerCode}`);
    }

    // Vérifier que l'utilisateur ne se parraine pas lui-même
    if (referrer.id === referredUserId) {
      throw new BadRequestException('Vous ne pouvez pas utiliser votre propre code de parrainage');
    }

    // Vérifier qu'il n'existe pas déjà une relation
    const existing = await this.referralRepository.findOne({
      where: {
        referrerId: referrer.id,
        referredId: referredUserId,
      },
    });

    if (existing) {
      return existing;
    }

    // Créer la relation de parrainage
    const referral = this.referralRepository.create({
      referrerId: referrer.id,
      referredId: referredUserId,
      status: ReferralStatus.INSCRIT,
    });

    return await this.referralRepository.save(referral);
  }

  /**
   * Récupère tous les filleuls d'un utilisateur
   */
  async getReferrals(userId: number) {
    const referrals = await this.referralRepository.find({
      where: { referrerId: userId },
      relations: ['referred'],
      order: { createdAt: 'DESC' },
    });

    return referrals.map((ref) => ({
      id: ref.id,
      referred: {
        id: ref.referred.id,
        email: ref.referred.email,
        firstName: ref.referred.firstName,
        lastName: ref.referred.lastName,
        avatarImage: ref.referred.avatarImage,
        role: ref.referred.role,
      },
      status: ref.status,
      createdAt: ref.createdAt,
      updatedAt: ref.updatedAt,
    }));
  }

  /**
   * Vérifie et met à jour le statut des filleuls quand un utilisateur devient membre
   * Cette méthode doit être appelée quand le rôle d'un utilisateur change vers MEMBER
   */
  async checkAndRewardReferrer(referredUserId: number): Promise<void> {
    // Récupérer l'email du filleul une seule fois avant les transactions
    const referredUser = await this.userRepository.findOne({
      where: { id: referredUserId },
    });
    const referredEmail = referredUser?.email || 'Filleul';

    // Trouver toutes les relations où cet utilisateur est le filleul
    const referrals = await this.referralRepository.find({
      where: { referredId: referredUserId },
      relations: ['referrer'],
    });

    if (referrals.length === 0) {
      return; // Pas de parrain, rien à faire
    }

    // Pour chaque parrain, vérifier si on doit créditer
    for (const referral of referrals) {
      // Si déjà validée, on ne fait rien
      if (referral.status === ReferralStatus.VALIDEE) {
        continue;
      }

      // Utiliser une transaction pour garantir l'atomicité
      await this.dataSource.transaction(async (manager) => {
        // Re-lire la relation avec un lock pour éviter les doublons
        const lockedReferral = await manager.findOne(Referral, {
          where: { id: referral.id },
          lock: { mode: 'pessimistic_write' },
        });

        if (!lockedReferral || lockedReferral.status === ReferralStatus.VALIDEE) {
          return; // Déjà traité
        }

        // Mettre à jour le statut
        lockedReferral.status = ReferralStatus.MEMBRE;
        await manager.save(lockedReferral);

        // Créditer le parrain avec 50 pupu
        const referrer = await manager.findOne(User, {
          where: { id: referral.referrerId },
          lock: { mode: 'pessimistic_write' },
        });

        if (!referrer) {
          return; // Parrain introuvable
        }

        const rewardAmount = 50;
        const balanceBefore = parseFloat(referrer.walletBalance.toString());
        const balanceAfter = balanceBefore + rewardAmount;

        // Mettre à jour le solde
        referrer.walletBalance = balanceAfter;
        await manager.save(referrer);

        // Créer la transaction CREDIT
        const creditTransaction = manager.create(Transaction, {
          type: TransactionType.CREDIT,
          amount: rewardAmount,
          balanceBefore,
          balanceAfter,
          status: TransactionStatus.COMPLETED,
          fromUserId: referredUserId, // Le filleul est l'origine
          toUserId: referrer.id,
          description: `Récompense de parrainage - ${referredEmail} est devenu membre`,
        });

        await manager.save(creditTransaction);

        // Marquer comme validée pour éviter les crédits multiples
        lockedReferral.status = ReferralStatus.VALIDEE;
        await manager.save(lockedReferral);
      });
    }
  }

  /**
   * Récupère les statistiques de parrainage d'un utilisateur
   */
  async getReferralStats(userId: number) {
    const [total, inscrits, membres, validees] = await Promise.all([
      this.referralRepository.count({ where: { referrerId: userId } }),
      this.referralRepository.count({
        where: { referrerId: userId, status: ReferralStatus.INSCRIT },
      }),
      this.referralRepository.count({
        where: { referrerId: userId, status: ReferralStatus.MEMBRE },
      }),
      this.referralRepository.count({
        where: { referrerId: userId, status: ReferralStatus.VALIDEE },
      }),
    ]);

    return {
      total,
      inscrits,
      membres,
      validees,
      rewardsEarned: validees * 50, // 50 pupu par filleul validé
    };
  }
}
