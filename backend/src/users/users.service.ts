import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { User, UserRole } from '../entities/user.entity';
import * as bcrypt from 'bcrypt';
import { Transaction } from '../entities/transaction.entity';
import { Listing } from '../entities/listing.entity';
import { BlogPost } from '../entities/blog-post.entity';
import { CourseProgress } from '../entities/course-progress.entity';
import { Referral } from '../entities/referral.entity';
import { BankTransferPayment } from '../entities/bank-transfer-payment.entity';
import { StripePayment } from '../entities/stripe-payment.entity';
import { LegacyPaymentVerification } from '../entities/legacy-payment-verification.entity';
import { RefreshToken } from '../entities/refresh-token.entity';
import { PollResponse } from '../entities/poll-response.entity';
import { Conversation } from '../entities/conversation.entity';
import { Goodie } from '../entities/goodie.entity';
import { Culture } from '../entities/culture.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    private dataSource: DataSource,
  ) {}

  async create(
    email: string,
    password: string,
    role: UserRole = UserRole.USER,
    phoneNumber?: string,
    firstName?: string,
    lastName?: string,
  ): Promise<User> {
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = this.usersRepository.create({
      email,
      password: hashedPassword,
      role,
      phoneNumber: phoneNumber?.trim() || null,
      firstName: firstName || null,
      lastName: lastName || null,
      emailVerified: false,
      isActive: true,
    });
    return this.usersRepository.save(user);
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { email } });
  }

  async findById(id: number): Promise<User | null> {
    return this.usersRepository.findOne({ where: { id } });
  }

  async findAll(): Promise<User[]> {
    return this.usersRepository.find({
      select: [
        'id',
        'email',
        'firstName',
        'lastName',
        'avatarImage',
        'role',
        'emailVerified',
        'isActive',
        'isCertified',
        'lastLogin',
        'walletBalance',
        'createdAt',
        'updatedAt',
      ],
    });
  }

  async findAllPaginated(
    page: number = 1,
    pageSize: number = 10,
    search?: string,
    role?: string,
    id?: number,
    createdAt?: string,
    sortBy: string = 'id',
    sortOrder: 'ASC' | 'DESC' = 'ASC',
    filters?: {
      firstName?: string;
      lastName?: string;
      email?: string;
      commune?: string;
    },
  ) {
    const queryBuilder = this.usersRepository.createQueryBuilder('user');

    // Select only needed fields
    queryBuilder.select([
      'user.id',
      'user.email',
      'user.firstName',
      'user.lastName',
      'user.avatarImage',
      'user.role',
      'user.emailVerified',
      'user.isActive',
      'user.isCertified',
      'user.lastLogin',
      'user.walletBalance',
      'user.commune',
      'user.phoneNumber',
      'user.createdAt',
      'user.updatedAt',
    ]);

    // Apply filters
    if (id) {
      queryBuilder.andWhere('user.id = :id', { id });
    }

    if (role) {
      queryBuilder.andWhere('user.role = :role', { role });
    }

    if (createdAt) {
      const startOfDay = new Date(createdAt);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(createdAt);
      endOfDay.setHours(23, 59, 59, 999);
      queryBuilder.andWhere('user.createdAt >= :startOfDay', { startOfDay });
      queryBuilder.andWhere('user.createdAt <= :endOfDay', { endOfDay });
    }

    if (search) {
      queryBuilder.andWhere(
        '(user.email ILIKE :search OR user.firstName ILIKE :search OR user.lastName ILIKE :search OR user.commune ILIKE :search OR user.phoneNumber ILIKE :search OR CAST(user.id AS TEXT) ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    if (filters?.firstName) {
      queryBuilder.andWhere('user.firstName ILIKE :firstName', { firstName: `%${filters.firstName}%` });
    }
    if (filters?.lastName) {
      queryBuilder.andWhere('user.lastName ILIKE :lastName', { lastName: `%${filters.lastName}%` });
    }
    if (filters?.email) {
      queryBuilder.andWhere('user.email ILIKE :email', { email: `%${filters.email}%` });
    }
    if (filters?.commune) {
      queryBuilder.andWhere('user.commune ILIKE :commune', { commune: `%${filters.commune}%` });
    }

    // Apply sorting
    const validSortColumns = ['id', 'email', 'firstName', 'lastName', 'phoneNumber', 'role', 'emailVerified', 'isActive', 'lastLogin', 'createdAt', 'updatedAt'];
    const sortColumn = validSortColumns.includes(sortBy) ? sortBy : 'id';
    queryBuilder.orderBy(`user.${sortColumn}`, sortOrder);

    // Get total count before pagination
    const total = await queryBuilder.getCount();

    // Apply pagination
    const skip = (page - 1) * pageSize;
    queryBuilder.skip(skip).take(pageSize);

    // Execute query
    const data = await queryBuilder.getMany();

    // Calculate pagination metadata
    const totalPages = Math.ceil(total / pageSize);
    const hasNext = page < totalPages;
    const hasPrev = page > 1;

    return {
      data,
      total,
      page,
      pageSize,
      totalPages,
      hasNext,
      hasPrev,
    };
  }

  async validatePassword(user: User, password: string): Promise<boolean> {
    if (!user.password) {
      return false; // Facebook users don't have passwords
    }
    return bcrypt.compare(password, user.password);
  }

  async updatePassword(userId: number, newPassword: string): Promise<void> {
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await this.usersRepository.update(userId, {
      password: hashedPassword,
      resetToken: null,
      resetTokenExpiry: null,
    });
  }

  async setResetToken(email: string, token: string, expiry: Date): Promise<void> {
    await this.usersRepository.update(
      { email },
      {
        resetToken: token,
        resetTokenExpiry: expiry,
      },
    );
  }

  async findByResetToken(token: string): Promise<User | null> {
    return this.usersRepository.findOne({
      where: { resetToken: token },
    });
  }

  async clearResetToken(userId: number): Promise<void> {
    await this.usersRepository.update(userId, {
      resetToken: null,
      resetTokenExpiry: null,
    });
  }

  async updateRole(userId: number, newRole: UserRole): Promise<User> {
    const oldUser = await this.findById(userId);
    if (!oldUser) {
      throw new Error('User not found');
    }

    await this.usersRepository.update(userId, { role: newRole });
    const user = await this.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Si l'utilisateur devient MEMBER et qu'il était USER avant, vérifier les parrainages
    if (newRole === UserRole.MEMBER && oldUser.role === UserRole.USER) {
      // Note: On utilise une injection optionnelle pour éviter la dépendance circulaire
      // Le ReferralService sera injecté via le module si disponible
      // Pour l'instant, on laisse cette logique dans le ReferralService.checkAndRewardReferrer
      // qui sera appelé depuis le contrôleur ou un hook
    }

    return user;
  }

  async remove(userId: number): Promise<void> {
    const result = await this.usersRepository.delete(userId);
    if (result.affected === 0) {
      throw new Error('User not found');
    }
  }

  async updateLastLogin(userId: number): Promise<void> {
    await this.usersRepository.update(userId, {
      lastLogin: new Date(),
    });
  }

  async setEmailVerificationToken(
    userId: number,
    token: string,
    expiry: Date,
  ): Promise<void> {
    await this.usersRepository.update(userId, {
      emailVerificationToken: token,
      emailVerificationTokenExpiry: expiry,
    });
  }

  async verifyEmail(token: string): Promise<User | null> {
    const user = await this.usersRepository.findOne({
      where: { emailVerificationToken: token },
    });
    if (!user) {
      return null;
    }

    if (!user.emailVerificationTokenExpiry || user.emailVerificationTokenExpiry < new Date()) {
      return null;
    }

    await this.usersRepository.update(user.id, {
      emailVerified: true,
      emailVerificationToken: null,
      emailVerificationTokenExpiry: null,
    });

    return this.findById(user.id);
  }

  async findByEmailVerificationToken(token: string): Promise<User | null> {
    return this.usersRepository.findOne({
      where: { emailVerificationToken: token },
    });
  }

  async updateUser(
    userId: number,
    updates: {
      firstName?: string;
      lastName?: string;
      avatarImage?: string;
      email?: string;
      phoneNumber?: string;
      commune?: string;
      isCertified?: boolean;
      contactPreferences?: {
        order: string[];
        accounts: {
          messenger?: string;
          telegram?: string;
          whatsapp?: string;
        };
      };
      tradingPreferences?: string[];
    },
  ): Promise<User> {
    const updateData: any = {};
    if (updates.firstName !== undefined) updateData.firstName = updates.firstName;
    if (updates.lastName !== undefined) updateData.lastName = updates.lastName;
    if (updates.avatarImage !== undefined) updateData.avatarImage = updates.avatarImage;
    if (updates.phoneNumber !== undefined) updateData.phoneNumber = updates.phoneNumber;
    if (updates.commune !== undefined) updateData.commune = updates.commune;
    if (updates.isCertified !== undefined) updateData.isCertified = updates.isCertified;
    if (updates.contactPreferences !== undefined) updateData.contactPreferences = updates.contactPreferences;
    if (updates.tradingPreferences !== undefined) updateData.tradingPreferences = updates.tradingPreferences;
    if (updates.email !== undefined) {
      updateData.email = updates.email;
      updateData.emailVerified = false; // Email change requires re-verification
      updateData.emailChangedAt = new Date();
    }

    await this.usersRepository.update(userId, updateData);
    const user = await this.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }
    return user;
  }

  async deactivateUser(userId: number): Promise<void> {
    await this.usersRepository.update(userId, {
      isActive: false,
    });
  }

  async activateUser(userId: number): Promise<void> {
    await this.usersRepository.update(userId, {
      isActive: true,
    });
  }

  async findByFacebookId(facebookId: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { facebookId } });
  }

  /**
   * Deletes a user and all their related data (for Facebook data deletion callback).
   * Order respects foreign key constraints.
   * @returns true if user was found and deleted, false if user not found
   */
  async deleteUserByFacebookIdWithCascade(facebookId: string): Promise<boolean> {
    const user = await this.findByFacebookId(facebookId);
    if (!user) {
      return false;
    }

    const userId = user.id;
    const transactionRepo = this.dataSource.getRepository(Transaction);
    const listingRepo = this.dataSource.getRepository(Listing);
    const blogPostRepo = this.dataSource.getRepository(BlogPost);
    const courseProgressRepo = this.dataSource.getRepository(CourseProgress);
    const referralRepo = this.dataSource.getRepository(Referral);
    const bankTransferRepo = this.dataSource.getRepository(BankTransferPayment);
    const stripeRepo = this.dataSource.getRepository(StripePayment);
    const legacyPaymentRepo = this.dataSource.getRepository(LegacyPaymentVerification);
    const refreshTokenRepo = this.dataSource.getRepository(RefreshToken);
    const pollResponseRepo = this.dataSource.getRepository(PollResponse);
    const conversationRepo = this.dataSource.getRepository(Conversation);
    const goodieRepo = this.dataSource.getRepository(Goodie);
    const cultureRepo = this.dataSource.getRepository(Culture);

    // 1. Transactions (fromUser or toUser)
    await transactionRepo
      .createQueryBuilder()
      .delete()
      .where('fromUserId = :userId OR toUserId = :userId', { userId })
      .execute();

    // 2. Conversations (participant1 or participant2) - CASCADE deletes their messages
    await conversationRepo
      .createQueryBuilder()
      .delete()
      .where('participant1Id = :userId OR participant2Id = :userId', { userId })
      .execute();

    // 4. Listings (seller)
    await listingRepo
      .createQueryBuilder()
      .delete()
      .where('sellerId = :userId', { userId })
      .execute();

    // 5. Blog posts (author)
    await blogPostRepo
      .createQueryBuilder()
      .delete()
      .where('authorId = :userId', { userId })
      .execute();

    // 6. Course progress
    await courseProgressRepo
      .createQueryBuilder()
      .delete()
      .where('userId = :userId', { userId })
      .execute();

    // 7. Referrals (referrer or referred)
    await referralRepo
      .createQueryBuilder()
      .delete()
      .where('referrerId = :userId OR referredId = :userId', { userId })
      .execute();

    // 8. Bank transfer payments
    await bankTransferRepo
      .createQueryBuilder()
      .delete()
      .where('userId = :userId', { userId })
      .execute();

    // 9. Stripe payments
    await stripeRepo
      .createQueryBuilder()
      .delete()
      .where('userId = :userId', { userId })
      .execute();

    // 10. Legacy payment verifications
    await legacyPaymentRepo
      .createQueryBuilder()
      .delete()
      .where('userId = :userId', { userId })
      .execute();

    // 11. Refresh tokens
    await refreshTokenRepo
      .createQueryBuilder()
      .delete()
      .where('userId = :userId', { userId })
      .execute();

    // 12. Poll responses
    await pollResponseRepo
      .createQueryBuilder()
      .delete()
      .where('userId = :userId', { userId })
      .execute();

    // 13. Reassign goodies and cultures (set createdById to null)
    await goodieRepo
      .createQueryBuilder()
      .update()
      .set({ createdById: null })
      .where('createdById = :userId', { userId })
      .execute();

    await cultureRepo
      .createQueryBuilder()
      .update()
      .set({ createdById: null })
      .where('createdById = :userId', { userId })
      .execute();

    // 14. Delete user
    await this.usersRepository.delete(userId);
    return true;
  }

  async findOrCreateByFacebook(
    facebookId: string,
    email: string,
    firstName?: string,
    lastName?: string,
    avatarImage?: string,
  ): Promise<User> {
    // First, try to find by facebookId
    let user = await this.findByFacebookId(facebookId);
    if (user) {
      // Update last login
      await this.updateLastLogin(user.id);
      // Update user info if provided
      if (firstName || lastName || avatarImage) {
        const updates: any = {};
        if (firstName !== undefined) updates.firstName = firstName;
        if (lastName !== undefined) updates.lastName = lastName;
        if (avatarImage !== undefined) updates.avatarImage = avatarImage;
        if (Object.keys(updates).length > 0) {
          await this.usersRepository.update(user.id, updates);
          user = await this.findById(user.id);
        }
      }
      return user!;
    }

    // If not found by facebookId, try to find by email
    user = await this.findByEmail(email);
    if (user) {
      // Link Facebook account to existing user
      await this.usersRepository.update(user.id, {
        facebookId,
        facebookEmail: email,
        // Update name and avatar if not already set
        firstName: user.firstName || firstName || null,
        lastName: user.lastName || lastName || null,
        avatarImage: user.avatarImage || avatarImage || null,
      });
      await this.updateLastLogin(user.id);
      return (await this.findById(user.id))!;
    }

    // Create new user
    const newUser = this.usersRepository.create({
      email,
      password: null, // No password for Facebook accounts
      facebookId,
      facebookEmail: email,
      firstName: firstName || null,
      lastName: lastName || null,
      avatarImage: avatarImage || null,
      emailVerified: true, // Facebook verifies emails
      isActive: true,
      role: UserRole.USER,
    });
    const savedUser = await this.usersRepository.save(newUser);
    await this.updateLastLogin(savedUser.id);
    return savedUser;
  }
}

