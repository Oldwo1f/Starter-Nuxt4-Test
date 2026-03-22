import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole } from '../entities/user.entity';
import { UserBadge } from '../entities/user-badge.entity';
import { CourseProgress } from '../entities/course-progress.entity';
import { BlogPost, BlogStatus } from '../entities/blog-post.entity';
import { CultureConsultation } from '../entities/culture-consultation.entity';
import { Transaction, TransactionStatus, TransactionType } from '../entities/transaction.entity';
import { Referral, ReferralStatus } from '../entities/referral.entity';
import {
  TestimonialSubmission,
  TestimonialStatus,
} from '../entities/testimonial-submission.entity';
import { PollResponse } from '../entities/poll-response.entity';
import {
  ACADEMY_COURSE_BADGES,
  ACADEMY_FORMATEUR_POINTS_BADGES,
  BLOG_ARTICLE_BADGES,
  CULTURE_CONSULTATION_BADGES,
  DISCOVERY_BADGE_FIRST_STEP,
  DISCOVERY_BADGE_FIVE_TYPES,
  DISCOVERY_BADGE_THREE_UNIVERSES,
  DISCOVERY_BADGE_TWO_EACH,
  REFERRAL_VALIDATED_BADGES,
  SPECIAL_BADGE_COUNT_10,
  SPECIAL_BADGE_COUNT_20,
  SPECIAL_BADGE_FOUNDER_2026,
  SPECIAL_BADGE_PUPU_COLLECTOR_500,
  SPECIAL_BADGE_RESPECT_ANCIENS,
  SPECIAL_BADGE_TOA_COMMUNITY,
  SPECIAL_BADGE_TROC_PIONEER_MAY_2026,
  SPECIAL_BADGE_VIP_HERITAGE,
  SPECIAL_FOUNDER_REGISTER_BEFORE,
  SPECIAL_TOA_MIN_OTHER_BADGES,
  SPECIAL_TROC_PIONEER_COMPLETED_BEFORE,
  SOUTIEN_POINTS_BADGES,
  TE_NATIRAA_PRESENCE_BADGES,
  TESTIMONIAL_VIDEO_VALIDATED_BADGES,
  TROC_EXCHANGE_BADGES,
} from './badges.constants';
import { PUBLIC_BADGE_SERIES } from './badge-series.public';

export type PublicMemberBadgeProfileDto = {
  firstName: string | null;
  lastName: string | null;
  avatarImage: string | null;
  isCertified: boolean;
  totalBadgeCount: number;
  displayBadges: { badgeCode: string; earnedAt: string }[];
};

@Injectable()
export class BadgesService {
  constructor(
    @InjectRepository(UserBadge)
    private readonly userBadgeRepository: Repository<UserBadge>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(CourseProgress)
    private readonly progressRepository: Repository<CourseProgress>,
    @InjectRepository(BlogPost)
    private readonly blogPostRepository: Repository<BlogPost>,
    @InjectRepository(CultureConsultation)
    private readonly cultureConsultationRepository: Repository<CultureConsultation>,
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
    @InjectRepository(Referral)
    private readonly referralRepository: Repository<Referral>,
    @InjectRepository(TestimonialSubmission)
    private readonly testimonialSubmissionRepository: Repository<TestimonialSubmission>,
    @InjectRepository(PollResponse)
    private readonly pollResponseRepository: Repository<PollResponse>,
  ) {}

  async countFullyCompletedCourses(userId: number): Promise<number> {
    return this.progressRepository
      .createQueryBuilder('cp')
      .where('cp.userId = :userId', { userId })
      .andWhere('cp.progressPercentage >= :min', { min: 99.99 })
      .getCount();
  }

  /**
   * Awards Academy course-completion tier badges for the current count. Idempotent.
   * @returns badge codes newly inserted in this call
   */
  async syncAcademyCourseCompletionBadges(userId: number): Promise<string[]> {
    const completedCount = await this.countFullyCompletedCourses(userId);
    const newlyEarned: string[] = [];

    for (const { threshold, code } of ACADEMY_COURSE_BADGES) {
      if (completedCount < threshold) {
        continue;
      }
      const existing = await this.userBadgeRepository.findOne({
        where: { userId, badgeCode: code },
      });
      if (existing) {
        continue;
      }
      const row = this.userBadgeRepository.create({
        userId,
        badgeCode: code,
      });
      await this.userBadgeRepository.save(row);
      newlyEarned.push(code);
    }

    return newlyEarned;
  }

  async countActiveBlogPostsByAuthor(authorId: number): Promise<number> {
    return this.blogPostRepository.count({
      where: { authorId, status: BlogStatus.ACTIVE },
    });
  }

  /**
   * Badges « articles validés » (statut active). Idempotent.
   */
  async syncBlogCollaborativeBadges(authorId: number): Promise<string[]> {
    const count = await this.countActiveBlogPostsByAuthor(authorId);
    const newlyEarned: string[] = [];

    for (const { threshold, code } of BLOG_ARTICLE_BADGES) {
      if (count < threshold) {
        continue;
      }
      const existing = await this.userBadgeRepository.findOne({
        where: { userId: authorId, badgeCode: code },
      });
      if (existing) {
        continue;
      }
      await this.userBadgeRepository.save(
        this.userBadgeRepository.create({
          userId: authorId,
          badgeCode: code,
        }),
      );
      newlyEarned.push(code);
    }

    return newlyEarned;
  }

  async countCultureConsultationsByUser(userId: number): Promise<number> {
    return this.cultureConsultationRepository.count({ where: { userId } });
  }

  /**
   * Badges « consultation de contenus Culture ». Idempotent.
   */
  async syncCultureConsultationBadges(userId: number): Promise<string[]> {
    const count = await this.countCultureConsultationsByUser(userId);
    const newlyEarned: string[] = [];

    for (const { threshold, code } of CULTURE_CONSULTATION_BADGES) {
      if (count < threshold) {
        continue;
      }
      const existing = await this.userBadgeRepository.findOne({
        where: { userId, badgeCode: code },
      });
      if (existing) {
        continue;
      }
      await this.userBadgeRepository.save(
        this.userBadgeRepository.create({
          userId,
          badgeCode: code,
        }),
      );
      newlyEarned.push(code);
    }

    return newlyEarned;
  }

  /**
   * Badges « Academy — création de formations » selon le compteur de formations publiées (admin). Idempotent.
   */
  async syncAcademyFormateurPointsBadges(userId: number): Promise<string[]> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      select: ['id', 'formateurPoints'],
    });
    const points = user?.formateurPoints ?? 0;
    const newlyEarned: string[] = [];

    for (const { threshold, code } of ACADEMY_FORMATEUR_POINTS_BADGES) {
      if (points < threshold) {
        continue;
      }
      const existing = await this.userBadgeRepository.findOne({
        where: { userId, badgeCode: code },
      });
      if (existing) {
        continue;
      }
      await this.userBadgeRepository.save(
        this.userBadgeRepository.create({
          userId,
          badgeCode: code,
        }),
      );
      newlyEarned.push(code);
    }

    return newlyEarned;
  }

  /**
   * Badges « Soutien » selon les points soutien (admin / modération). Idempotent.
   */
  async syncSoutienPointsBadges(userId: number): Promise<string[]> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      select: ['id', 'soutienPoints'],
    });
    const points = user?.soutienPoints ?? 0;
    const newlyEarned: string[] = [];

    for (const { threshold, code } of SOUTIEN_POINTS_BADGES) {
      if (points < threshold) {
        continue;
      }
      const existing = await this.userBadgeRepository.findOne({
        where: { userId, badgeCode: code },
      });
      if (existing) {
        continue;
      }
      await this.userBadgeRepository.save(
        this.userBadgeRepository.create({
          userId,
          badgeCode: code,
        }),
      );
      newlyEarned.push(code);
    }

    return newlyEarned;
  }

  /**
   * Badges « Te Natira'a — présence » (scan QR). Idempotent.
   */
  async syncTeNatiraaPresenceBadges(userId: number): Promise<string[]> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      select: ['id', 'tenatiraaPresencePoints'],
    });
    const points = user?.tenatiraaPresencePoints ?? 0;
    const newlyEarned: string[] = [];

    for (const { threshold, code } of TE_NATIRAA_PRESENCE_BADGES) {
      if (points < threshold) {
        continue;
      }
      const existing = await this.userBadgeRepository.findOne({
        where: { userId, badgeCode: code },
      });
      if (existing) {
        continue;
      }
      await this.userBadgeRepository.save(
        this.userBadgeRepository.create({
          userId,
          badgeCode: code,
        }),
      );
      newlyEarned.push(code);
    }

    return newlyEarned;
  }

  async countApprovedTestimonialVideosByUser(userId: number): Promise<number> {
    return this.testimonialSubmissionRepository.count({
      where: { userId, status: TestimonialStatus.APPROVED },
    });
  }

  /**
   * Badges « témoignages vidéo » (validations admin). Idempotent.
   */
  async syncTestimonialVideoBadges(userId: number): Promise<string[]> {
    const count = await this.countApprovedTestimonialVideosByUser(userId);
    const newlyEarned: string[] = [];

    for (const { threshold, code } of TESTIMONIAL_VIDEO_VALIDATED_BADGES) {
      if (count < threshold) {
        continue;
      }
      const existing = await this.userBadgeRepository.findOne({
        where: { userId, badgeCode: code },
      });
      if (existing) {
        continue;
      }
      await this.userBadgeRepository.save(
        this.userBadgeRepository.create({
          userId,
          badgeCode: code,
        }),
      );
      newlyEarned.push(code);
    }

    return newlyEarned;
  }

  /**
   * Activités « Troc » comptées pour les badges :
   * - `exchange` complété (achat annonce via POST /wallet/exchange) : acheteur = from, vendeur = to ;
   * - `debit` complété (transfert Pūpū entre membres, ex. page wallet ou « Transférer des Pūpū » marketplace) : une ligne, les deux parties matchent.
   * On ne compte pas les `credit` seuls pour éviter de doubler un même transfert (chaque transfert crée débit + crédit).
   */
  async countCompletedTrocExchangesForUser(userId: number): Promise<number> {
    return this.transactionRepository
      .createQueryBuilder('t')
      .where('t.status = :status', { status: TransactionStatus.COMPLETED })
      .andWhere(
        '(t.type = :exchange AND (t.fromUserId = :userId OR t.toUserId = :userId)) OR (t.type = :debit AND (t.fromUserId = :userId OR t.toUserId = :userId))',
        {
          exchange: TransactionType.EXCHANGE,
          debit: TransactionType.DEBIT,
          userId,
        },
      )
      .getCount();
  }

  /** Filleuls dont le parrainage est au statut validé (récompense créditée) */
  async countValidatedReferralsByReferrer(referrerId: number): Promise<number> {
    return this.referralRepository.count({
      where: { referrerId, status: ReferralStatus.VALIDEE },
    });
  }

  /** Au moins un filleul inscrit avec le code du parrain (tout statut) — série Découverte / Connecter */
  async countReferralsAsReferrer(referrerId: number): Promise<number> {
    return this.referralRepository.count({ where: { referrerId } });
  }

  async countPollResponsesByUser(userId: number): Promise<number> {
    return this.pollResponseRepository.count({ where: { userId } });
  }

  /**
   * Badges parrainage (filleuls validés). Idempotent.
   */
  async syncReferralValidatedBadges(referrerId: number): Promise<string[]> {
    const count = await this.countValidatedReferralsByReferrer(referrerId);
    const newlyEarned: string[] = [];

    for (const { threshold, code } of REFERRAL_VALIDATED_BADGES) {
      if (count < threshold) {
        continue;
      }
      const existing = await this.userBadgeRepository.findOne({
        where: { userId: referrerId, badgeCode: code },
      });
      if (existing) {
        continue;
      }
      await this.userBadgeRepository.save(
        this.userBadgeRepository.create({
          userId: referrerId,
          badgeCode: code,
        }),
      );
      newlyEarned.push(code);
    }

    return newlyEarned;
  }

  /**
   * Badges série Troc (échanges marketplace). Idempotent.
   */
  async syncTrocExchangeBadges(userId: number): Promise<string[]> {
    const count = await this.countCompletedTrocExchangesForUser(userId);
    const newlyEarned: string[] = [];

    for (const { threshold, code } of TROC_EXCHANGE_BADGES) {
      if (count < threshold) {
        continue;
      }
      const existing = await this.userBadgeRepository.findOne({
        where: { userId, badgeCode: code },
      });
      if (existing) {
        continue;
      }
      await this.userBadgeRepository.save(
        this.userBadgeRepository.create({
          userId,
          badgeCode: code,
        }),
      );
      newlyEarned.push(code);
    }

    return newlyEarned;
  }

  /**
   * Compteurs 0–3 par univers : Transmettre (cours / blog / formateur), Connecter (troc / parrain / Te Natira’a), Inspirer (culture / témoignage / sondage).
   */
  async getDiscoveryUniverseCounts(userId: number): Promise<{
    transmettre: number;
    connecter: number;
    inspirer: number;
  }> {
    const [
      completedCourses,
      blogCount,
      userRow,
      trocCount,
      referralCount,
      cultureCount,
      testimonialCount,
      pollCount,
    ] = await Promise.all([
      this.countFullyCompletedCourses(userId),
      this.countActiveBlogPostsByAuthor(userId),
      this.userRepository.findOne({
        where: { id: userId },
        select: ['id', 'formateurPoints', 'tenatiraaPresencePoints'],
      }),
      this.countCompletedTrocExchangesForUser(userId),
      this.countReferralsAsReferrer(userId),
      this.countCultureConsultationsByUser(userId),
      this.countApprovedTestimonialVideosByUser(userId),
      this.countPollResponsesByUser(userId),
    ]);

    let transmettre = 0;
    if (completedCourses >= 1) transmettre += 1;
    if (blogCount >= 1) transmettre += 1;
    if ((userRow?.formateurPoints ?? 0) >= 1) transmettre += 1;

    let connecter = 0;
    if (trocCount >= 1) connecter += 1;
    if (referralCount >= 1) connecter += 1;
    if ((userRow?.tenatiraaPresencePoints ?? 0) >= 1) connecter += 1;

    let inspirer = 0;
    if (cultureCount >= 1) inspirer += 1;
    if (testimonialCount >= 1) inspirer += 1;
    if (pollCount >= 1) inspirer += 1;

    return { transmettre, connecter, inspirer };
  }

  /**
   * Badges série Découverte (paliers composites). Idempotent.
   */
  async syncDiscoveryBadges(userId: number): Promise<string[]> {
    const { transmettre: t, connecter: c, inspirer: i } =
      await this.getDiscoveryUniverseCounts(userId);
    const sum = t + c + i;
    const min = Math.min(t, c, i);

    const tiers: { code: string; eligible: boolean }[] = [
      { code: DISCOVERY_BADGE_FIRST_STEP, eligible: sum >= 1 },
      { code: DISCOVERY_BADGE_THREE_UNIVERSES, eligible: min >= 1 },
      { code: DISCOVERY_BADGE_FIVE_TYPES, eligible: min >= 2 },
      { code: DISCOVERY_BADGE_TWO_EACH, eligible: min >= 3 },
    ];

    const newlyEarned: string[] = [];
    for (const { code, eligible } of tiers) {
      if (!eligible) continue;
      const existing = await this.userBadgeRepository.findOne({
        where: { userId, badgeCode: code },
      });
      if (existing) continue;
      await this.userBadgeRepository.save(
        this.userBadgeRepository.create({ userId, badgeCode: code }),
      );
      newlyEarned.push(code);
    }
    return newlyEarned;
  }

  async getGamificationCounters(userId: number): Promise<{
    formateurPoints: number;
    soutienPoints: number;
    tenatiraaPresencePoints: number;
    walletPupuBalance: number;
  }> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      select: [
        'id',
        'formateurPoints',
        'soutienPoints',
        'tenatiraaPresencePoints',
        'walletBalance',
      ],
    });
    return {
      formateurPoints: user?.formateurPoints ?? 0,
      soutienPoints: user?.soutienPoints ?? 0,
      tenatiraaPresencePoints: user?.tenatiraaPresencePoints ?? 0,
      walletPupuBalance: Number(user?.walletBalance ?? 0),
    };
  }

  /**
   * Troc compté comme pour les badges, complété avant une date (cutoff exclusive, UTC).
   */
  async hasCompletedTrocBefore(userId: number, cutoffUtc: Date): Promise<boolean> {
    const n = await this.transactionRepository
      .createQueryBuilder('t')
      .where('t.status = :status', { status: TransactionStatus.COMPLETED })
      .andWhere(
        '(t.type = :exchange AND (t.fromUserId = :userId OR t.toUserId = :userId)) OR (t.type = :debit AND (t.fromUserId = :userId OR t.toUserId = :userId))',
        {
          exchange: TransactionType.EXCHANGE,
          debit: TransactionType.DEBIT,
          userId,
        },
      )
      .andWhere('t.createdAt < :cutoff', { cutoff: cutoffUtc })
      .getCount();
    return n > 0;
  }

  private async tryInsertBadge(userId: number, badgeCode: string, eligible: boolean): Promise<boolean> {
    if (!eligible) {
      return false;
    }
    const existing = await this.userBadgeRepository.findOne({
      where: { userId, badgeCode },
    });
    if (existing) {
      return false;
    }
    await this.userBadgeRepository.save(
      this.userBadgeRepository.create({ userId, badgeCode }),
    );
    return true;
  }

  /**
   * Compte les badges obtenus hors les deux paliers « nombre total » (pour ne pas les compter dans leur propre seuil).
   */
  private async countBadgesExcludingMilestoneTotals(userId: number): Promise<number> {
    return this.userBadgeRepository
      .createQueryBuilder('ub')
      .where('ub.userId = :userId', { userId })
      .andWhere('ub.badgeCode NOT IN (:...codes)', {
        codes: [SPECIAL_BADGE_COUNT_10, SPECIAL_BADGE_COUNT_20],
      })
      .getCount();
  }

  /**
   * Badges spéciaux (indépendants). Toa : plus de SPECIAL_TOA_MIN_OTHER_BADGES badges hors Toa.
   */
  async syncSpecialBadges(userId: number): Promise<string[]> {
    const newlyEarned: string[] = [];
    const user = await this.userRepository.findOne({
      where: { id: userId },
      select: ['id', 'createdAt', 'role', 'walletBalance', 'respectAnciensBadgeGranted'],
    });
    if (!user) {
      return newlyEarned;
    }

    const founderCutoff = new Date(SPECIAL_FOUNDER_REGISTER_BEFORE);
    if (await this.tryInsertBadge(userId, SPECIAL_BADGE_FOUNDER_2026, user.createdAt < founderCutoff)) {
      newlyEarned.push(SPECIAL_BADGE_FOUNDER_2026);
    }

    const trocCutoff = new Date(SPECIAL_TROC_PIONEER_COMPLETED_BEFORE);
    const earlyTroc = await this.hasCompletedTrocBefore(userId, trocCutoff);
    if (await this.tryInsertBadge(userId, SPECIAL_BADGE_TROC_PIONEER_MAY_2026, earlyTroc)) {
      newlyEarned.push(SPECIAL_BADGE_TROC_PIONEER_MAY_2026);
    }

    const balance = Number(user.walletBalance);
    if (await this.tryInsertBadge(userId, SPECIAL_BADGE_PUPU_COLLECTOR_500, balance >= 500)) {
      newlyEarned.push(SPECIAL_BADGE_PUPU_COLLECTOR_500);
    }

    if (await this.tryInsertBadge(userId, SPECIAL_BADGE_VIP_HERITAGE, user.role === UserRole.VIP)) {
      newlyEarned.push(SPECIAL_BADGE_VIP_HERITAGE);
    }

    if (
      await this.tryInsertBadge(
        userId,
        SPECIAL_BADGE_RESPECT_ANCIENS,
        user.respectAnciensBadgeGranted === true,
      )
    ) {
      newlyEarned.push(SPECIAL_BADGE_RESPECT_ANCIENS);
    }

    const exclMilestone = await this.countBadgesExcludingMilestoneTotals(userId);
    if (await this.tryInsertBadge(userId, SPECIAL_BADGE_COUNT_10, exclMilestone >= 10)) {
      newlyEarned.push(SPECIAL_BADGE_COUNT_10);
    }
    const exclMilestoneAfter10 = await this.countBadgesExcludingMilestoneTotals(userId);
    if (await this.tryInsertBadge(userId, SPECIAL_BADGE_COUNT_20, exclMilestoneAfter10 >= 20)) {
      newlyEarned.push(SPECIAL_BADGE_COUNT_20);
    }

    const nonToaCount = await this.userBadgeRepository
      .createQueryBuilder('ub')
      .where('ub.userId = :userId', { userId })
      .andWhere('ub.badgeCode != :toa', { toa: SPECIAL_BADGE_TOA_COMMUNITY })
      .getCount();

    if (
      await this.tryInsertBadge(
        userId,
        SPECIAL_BADGE_TOA_COMMUNITY,
        nonToaCount > SPECIAL_TOA_MIN_OTHER_BADGES,
      )
    ) {
      newlyEarned.push(SPECIAL_BADGE_TOA_COMMUNITY);
    }

    return newlyEarned;
  }

  /** Après PATCH admin sur `respectAnciensBadgeGranted` : crée le badge sans attendre GET /badges */
  async syncRespectAnciensBadgeOnly(userId: number): Promise<void> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      select: ['id', 'respectAnciensBadgeGranted'],
    });
    if (user?.respectAnciensBadgeGranted) {
      await this.tryInsertBadge(userId, SPECIAL_BADGE_RESPECT_ANCIENS, true);
    }
  }

  /**
   * Compte brut des lignes user_badge (sans sync) — listes marketplace, messages, admin.
   */
  async countBadgesByUserIds(userIds: number[]): Promise<Map<number, number>> {
    const map = new Map<number, number>();
    const unique = [...new Set(userIds)].filter((id) => Number.isFinite(id));
    for (const id of unique) {
      map.set(id, 0);
    }
    if (unique.length === 0) {
      return map;
    }
    const rows = await this.userBadgeRepository
      .createQueryBuilder('ub')
      .select('ub.userId', 'userId')
      .addSelect('COUNT(ub.id)', 'cnt')
      .where('ub.userId IN (:...ids)', { ids: unique })
      .groupBy('ub.userId')
      .getRawMany();
    for (const r of rows) {
      map.set(Number(r.userId), parseInt(String(r.cnt), 10));
    }
    return map;
  }

  async listBadgesForUser(userId: number): Promise<UserBadge[]> {
    await this.syncAcademyCourseCompletionBadges(userId);
    await this.syncBlogCollaborativeBadges(userId);
    await this.syncCultureConsultationBadges(userId);
    await this.syncAcademyFormateurPointsBadges(userId);
    await this.syncSoutienPointsBadges(userId);
    await this.syncTeNatiraaPresenceBadges(userId);
    await this.syncTestimonialVideoBadges(userId);
    await this.syncTrocExchangeBadges(userId);
    await this.syncReferralValidatedBadges(userId);
    await this.syncDiscoveryBadges(userId);
    await this.syncSpecialBadges(userId);
    return this.userBadgeRepository.find({
      where: { userId },
      order: { earnedAt: 'ASC' },
    });
  }

  /**
   * Profil badges pour affichage public (marketplace) : meilleur badge par série, tri gratifiant.
   */
  async getPublicMemberBadgeProfile(targetUserId: number): Promise<PublicMemberBadgeProfileDto> {
    const user = await this.userRepository.findOne({
      where: { id: targetUserId },
      select: ['id', 'firstName', 'lastName', 'avatarImage', 'isCertified'],
    });
    if (!user) {
      throw new NotFoundException();
    }

    const rows = await this.listBadgesForUser(targetUserId);
    const earned = new Map(rows.map((r) => [r.badgeCode, r.earnedAt]));

    type Sortable = {
      badgeCode: string;
      earnedAt: Date;
      tierRank: number;
      seriesPriority: number;
    };

    const display: Sortable[] = [];

    for (const series of PUBLIC_BADGE_SERIES) {
      let bestIdx = -1;
      let bestCode: string | null = null;
      for (let i = 0; i < series.codes.length; i++) {
        const c = series.codes[i];
        if (earned.has(c)) {
          bestIdx = i;
          bestCode = c;
        }
      }
      if (bestCode !== null && bestIdx >= 0) {
        display.push({
          badgeCode: bestCode,
          earnedAt: earned.get(bestCode)!,
          tierRank: bestIdx,
          seriesPriority: series.seriesPriority,
        });
      }
    }

    const allSeriesCodes = new Set<string>();
    for (const s of PUBLIC_BADGE_SERIES) {
      for (const c of s.codes) {
        allSeriesCodes.add(c);
      }
    }
    for (const r of rows) {
      if (!allSeriesCodes.has(r.badgeCode)) {
        display.push({
          badgeCode: r.badgeCode,
          earnedAt: r.earnedAt,
          tierRank: -1,
          seriesPriority: 0,
        });
      }
    }

    display.sort((a, b) =>
      b.tierRank !== a.tierRank ? b.tierRank - a.tierRank : b.seriesPriority - a.seriesPriority,
    );

    return {
      firstName: user.firstName,
      lastName: user.lastName,
      avatarImage: user.avatarImage,
      isCertified: user.isCertified === true,
      totalBadgeCount: rows.length,
      displayBadges: display.map((d) => ({
        badgeCode: d.badgeCode,
        earnedAt: d.earnedAt.toISOString(),
      })),
    };
  }
}
