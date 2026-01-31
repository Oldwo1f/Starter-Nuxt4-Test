import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole } from '../entities/user.entity';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  async create(
    email: string,
    password: string,
    role: UserRole = UserRole.USER,
    firstName?: string,
    lastName?: string,
  ): Promise<User> {
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = this.usersRepository.create({
      email,
      password: hashedPassword,
      role,
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
        'lastLogin',
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
      'user.lastLogin',
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
        '(user.email ILIKE :search OR user.firstName ILIKE :search OR user.lastName ILIKE :search OR CAST(user.id AS TEXT) ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    // Apply sorting
    const validSortColumns = ['id', 'email', 'firstName', 'lastName', 'role', 'emailVerified', 'isActive', 'lastLogin', 'createdAt', 'updatedAt'];
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
    await this.usersRepository.update(userId, { role: newRole });
    const user = await this.findById(userId);
    if (!user) {
      throw new Error('User not found');
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
    },
  ): Promise<User> {
    const updateData: any = {};
    if (updates.firstName !== undefined) updateData.firstName = updates.firstName;
    if (updates.lastName !== undefined) updateData.lastName = updates.lastName;
    if (updates.avatarImage !== undefined) updateData.avatarImage = updates.avatarImage;
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
}

