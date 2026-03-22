import { unlinkSync } from 'fs';
import { basename } from 'path';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In } from 'typeorm';
import {
  TestimonialSubmission,
  TestimonialStatus,
  TestimonialSubject,
} from '../entities/testimonial-submission.entity';
import { BadgesService } from '../badges/badges.service';
import { User } from '../entities/user.entity';
import { Partner } from '../entities/partner.entity';
import { Listing } from '../entities/listing.entity';
import { Transaction, TransactionStatus, TransactionType } from '../entities/transaction.entity';

export const TESTIMONIAL_MIN_DURATION_SEC = 45;
export const TESTIMONIAL_MAX_DURATION_SEC = 90;
export const TESTIMONIAL_PUPU_REWARD = 5;

const ALLOWED_VIDEO_MIMES = new Set([
  'video/mp4',
  'video/webm',
  'video/ogg',
  'video/quicktime',
]);

function sameCalendarMonth(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

export function testimonialExtFromMime(mime: string): string {
  if (mime === 'video/quicktime') return 'mov';
  if (mime === 'video/webm') return 'webm';
  if (mime === 'video/ogg') return 'ogv';
  return 'mp4';
}

/** Navigateurs / FormData envoient parfois text/plain ou octet-stream pour un Blob — on se fie à l’extension. */
const AMBIGUOUS_UPLOAD_MIMES = new Set([
  'application/octet-stream',
  'text/plain',
  'application/x-www-form-urlencoded',
  '',
]);

/** Évite la confusion avec le type DOM `File` du même nom. */
export type TestimonialUploadFile = {
  mimetype: string;
  originalname: string;
};

/**
 * Corrige file.mimetype avant stockage / validation (mutate).
 * @throws BadRequestException si le fichier ne peut pas être interprété comme une vidéo supportée.
 */
export function normalizeTestimonialMulterFile(file: TestimonialUploadFile): void {
  if (ALLOWED_VIDEO_MIMES.has(file.mimetype)) {
    return;
  }
  if (!AMBIGUOUS_UPLOAD_MIMES.has(file.mimetype)) {
    throw new BadRequestException(
      `Type vidéo non autorisé (${file.mimetype}). Utilisez mp4, webm ou mov.`,
    );
  }
  const name = basename(file.originalname || '').toLowerCase();
  const ext = name.includes('.') ? (name.split('.').pop() as string) : '';
  const extToMime: Record<string, string> = {
    mp4: 'video/mp4',
    m4v: 'video/mp4',
    webm: 'video/webm',
    mov: 'video/quicktime',
    ogv: 'video/ogg',
    ogg: 'video/ogg',
  };
  const resolved = extToMime[ext];
  if (!resolved) {
    throw new BadRequestException(
      `Type vidéo non reconnu pour ce fichier (${file.mimetype}, .${ext || '?'}). Utilisez mp4, webm ou mov.`,
    );
  }
  file.mimetype = resolved;
}

@Injectable()
export class TestimonialsService {
  constructor(
    @InjectRepository(TestimonialSubmission)
    private readonly testimonialRepo: Repository<TestimonialSubmission>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Partner)
    private readonly partnerRepo: Repository<Partner>,
    @InjectRepository(Listing)
    private readonly listingRepo: Repository<Listing>,
    private readonly dataSource: DataSource,
    private readonly badgesService: BadgesService,
  ) {}

  parseCreatePayload(body: Record<string, unknown>): {
    subject: TestimonialSubject;
    durationSeconds: number;
    partnerId: number | null;
    listingId: number | null;
  } {
    const subject = body.subject as string;
    if (!Object.values(TestimonialSubject).includes(subject as TestimonialSubject)) {
      throw new BadRequestException('Sujet invalide');
    }
    const durationRaw = body.durationSeconds;
    const durationSeconds =
      typeof durationRaw === 'string' ? parseInt(durationRaw, 10) : Number(durationRaw);
    if (
      Number.isNaN(durationSeconds) ||
      durationSeconds < TESTIMONIAL_MIN_DURATION_SEC ||
      durationSeconds > TESTIMONIAL_MAX_DURATION_SEC
    ) {
      throw new BadRequestException(
        `Durée invalide : entre ${TESTIMONIAL_MIN_DURATION_SEC} et ${TESTIMONIAL_MAX_DURATION_SEC} secondes`,
      );
    }

    let partnerId: number | null = null;
    let listingId: number | null = null;

    if (body.partnerId !== undefined && body.partnerId !== '' && body.partnerId !== null) {
      const p =
        typeof body.partnerId === 'string' ? parseInt(body.partnerId as string, 10) : Number(body.partnerId);
      if (!Number.isNaN(p)) partnerId = p;
    }
    if (body.listingId !== undefined && body.listingId !== '' && body.listingId !== null) {
      const l =
        typeof body.listingId === 'string' ? parseInt(body.listingId as string, 10) : Number(body.listingId);
      if (!Number.isNaN(l)) listingId = l;
    }

    const subj = subject as TestimonialSubject;
    if (subj === TestimonialSubject.PARTNER) {
      if (partnerId == null) {
        throw new BadRequestException('Un partenaire est requis pour ce sujet');
      }
      listingId = null;
    } else if (subj === TestimonialSubject.TROC) {
      if (listingId == null) {
        throw new BadRequestException('Une annonce est requise pour ce sujet');
      }
      partnerId = null;
    } else {
      partnerId = null;
      listingId = null;
    }

    return { subject: subj, durationSeconds, partnerId, listingId };
  }

  validateVideoFile(file: TestimonialUploadFile & { size: number }): void {
    if (!file) {
      throw new BadRequestException('Fichier vidéo requis');
    }
    normalizeTestimonialMulterFile(file);
    if (!ALLOWED_VIDEO_MIMES.has(file.mimetype)) {
      throw new BadRequestException('Format vidéo non autorisé');
    }
    const maxBytes = parseInt(process.env.MAX_TESTIMONIAL_VIDEO_BYTES || '104857600', 10);
    if (file.size > maxBytes) {
      throw new BadRequestException('Vidéo trop volumineuse');
    }
  }

  getVideoPublicUrl(userId: number, filename: string): string {
    return `/uploads/testimonials/${userId}/${filename}`;
  }

  async createSubmission(
    userId: number,
    payload: {
      subject: TestimonialSubject;
      durationSeconds: number;
      partnerId: number | null;
      listingId: number | null;
    },
    file: TestimonialUploadFile & { size: number; filename?: string; path?: string },
  ): Promise<TestimonialSubmission> {
    this.validateVideoFile(file);

    const discardUpload = () => {
      if (file.path) {
        try {
          unlinkSync(file.path);
        } catch {
          /* ignore */
        }
      }
    };

    const existingPending = await this.testimonialRepo.findOne({
      where: { userId, status: TestimonialStatus.PENDING },
    });
    if (existingPending) {
      discardUpload();
      throw new ConflictException('Vous avez déjà un témoignage en cours de modération');
    }

    if (payload.partnerId != null) {
      const partner = await this.partnerRepo.findOne({ where: { id: payload.partnerId } });
      if (!partner) {
        discardUpload();
        throw new BadRequestException('Partenaire introuvable');
      }
    }

    if (payload.listingId != null) {
      const listing = await this.listingRepo.findOne({ where: { id: payload.listingId } });
      if (!listing || listing.sellerId !== userId) {
        discardUpload();
        throw new BadRequestException('Annonce introuvable ou vous n’en êtes pas l’auteur');
      }
    }

    const filename = file.filename;
    if (!filename) {
      throw new BadRequestException('Nom de fichier manquant');
    }
    const videoUrl = this.getVideoPublicUrl(userId, filename);

    const row = this.testimonialRepo.create({
      userId,
      subject: payload.subject,
      partnerId: payload.partnerId,
      listingId: payload.listingId,
      videoUrl,
      durationSeconds: payload.durationSeconds,
      status: TestimonialStatus.PENDING,
    });

    try {
      return await this.testimonialRepo.save(row);
    } catch (e) {
      discardUpload();
      throw e;
    }
  }

  async getMine(userId: number) {
    const pending = await this.testimonialRepo.findOne({
      where: { userId, status: TestimonialStatus.PENDING },
      relations: ['partner', 'listing'],
      order: { createdAt: 'DESC' },
    });

    const lastReviewed = await this.testimonialRepo.findOne({
      where: { userId, status: In([TestimonialStatus.APPROVED, TestimonialStatus.REJECTED]) },
      order: { reviewedAt: 'DESC', id: 'DESC' },
      relations: ['partner', 'listing'],
    });

    return {
      pending: pending ? this.toMemberDto(pending) : null,
      lastReviewed: lastReviewed ? this.toMemberReviewDto(lastReviewed) : null,
    };
  }

  private toMemberDto(s: TestimonialSubmission) {
    return {
      id: s.id,
      videoUrl: s.videoUrl,
      subject: s.subject,
      partnerId: s.partnerId,
      listingId: s.listingId,
      durationSeconds: s.durationSeconds,
      createdAt: s.createdAt,
    };
  }

  private toMemberReviewDto(s: TestimonialSubmission) {
    return {
      id: s.id,
      status: s.status,
      reviewedAt: s.reviewedAt,
      rejectionReason: s.rejectionReason,
      pupuGranted: s.pupuGranted,
      pupuAmount: Number(s.pupuAmount),
    };
  }

  async listPendingForAdmin(page = 1, limit = 20) {
    const take = Math.min(Math.max(limit, 1), 50);
    const skip = Math.max(page - 1, 0) * take;
    const [items, total] = await this.testimonialRepo.findAndCount({
      where: { status: TestimonialStatus.PENDING },
      relations: ['user', 'partner', 'listing'],
      order: { createdAt: 'ASC' },
      skip,
      take,
    });
    return {
      data: items.map((s) => this.toAdminDto(s)),
      total,
      page,
      limit: take,
    };
  }

  private toAdminDto(s: TestimonialSubmission) {
    const u = s.user;
    return {
      id: s.id,
      videoUrl: s.videoUrl,
      subject: s.subject,
      durationSeconds: s.durationSeconds,
      createdAt: s.createdAt,
      partnerId: s.partnerId,
      partnerName: s.partner?.name ?? null,
      listingId: s.listingId,
      listingTitle: s.listing?.title ?? null,
      user: u
        ? {
            id: u.id,
            email: u.email,
            firstName: u.firstName,
            lastName: u.lastName,
          }
        : null,
    };
  }

  async approve(submissionId: number, reviewerId: number): Promise<TestimonialSubmission> {
    const submission = await this.dataSource.transaction(async (manager) => {
      const subRepo = manager.getRepository(TestimonialSubmission);
      const row = await subRepo.findOne({
        where: { id: submissionId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!row) {
        throw new NotFoundException('Témoignage introuvable');
      }
      if (row.status !== TestimonialStatus.PENDING) {
        throw new BadRequestException('Ce témoignage a déjà été traité');
      }

      const user = await manager.findOne(User, {
        where: { id: row.userId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!user) {
        throw new NotFoundException('Utilisateur introuvable');
      }

      const now = new Date();
      let pupuGranted = false;
      let pupuAmount = 0;

      if (
        !user.lastTestimonialPupuAt ||
        !sameCalendarMonth(user.lastTestimonialPupuAt, now)
      ) {
        pupuGranted = true;
        pupuAmount = TESTIMONIAL_PUPU_REWARD;
        const balanceBefore = parseFloat(user.walletBalance.toString());
        const balanceAfter = balanceBefore + pupuAmount;
        user.walletBalance = balanceAfter;
        user.lastTestimonialPupuAt = now;
        await manager.save(user);

        const tx = manager.create(Transaction, {
          type: TransactionType.CREDIT,
          amount: pupuAmount,
          balanceBefore,
          balanceAfter,
          status: TransactionStatus.COMPLETED,
          fromUserId: reviewerId,
          toUserId: user.id,
          description: `[Nuna'a Heritage] Témoignage vidéo validé`,
        });
        await manager.save(tx);
      }

      row.status = TestimonialStatus.APPROVED;
      row.reviewedAt = now;
      row.reviewedById = reviewerId;
      row.pupuGranted = pupuGranted;
      row.pupuAmount = pupuAmount;
      row.rejectionReason = null;
      await subRepo.save(row);

      return row;
    });

    await this.badgesService.syncTestimonialVideoBadges(submission.userId);
    return submission;
  }

  async reject(
    submissionId: number,
    reviewerId: number,
    reason?: string,
  ): Promise<TestimonialSubmission> {
    const submission = await this.testimonialRepo.findOne({
      where: { id: submissionId },
    });
    if (!submission) {
      throw new NotFoundException('Témoignage introuvable');
    }
    if (submission.status !== TestimonialStatus.PENDING) {
      throw new BadRequestException('Ce témoignage a déjà été traité');
    }

    const trimmed = reason?.trim()?.slice(0, 500) || null;
    submission.status = TestimonialStatus.REJECTED;
    submission.reviewedAt = new Date();
    submission.reviewedById = reviewerId;
    submission.rejectionReason = trimmed;
    submission.pupuGranted = false;
    submission.pupuAmount = 0;
    return this.testimonialRepo.save(submission);
  }
}
