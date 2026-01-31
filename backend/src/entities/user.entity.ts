import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { BlogPost } from './blog-post.entity';

export enum UserRole {
  // Staff roles
  SUPERADMIN = 'superadmin',
  ADMIN = 'admin',
  MODERATOR = 'moderator',
  // User roles
  USER = 'user',
  MEMBER = 'member',
  PREMIUM = 'premium',
  VIP = 'vip',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  email: string;

  @Column()
  password: string;

  @Column({ type: 'varchar', nullable: true })
  firstName: string | null;

  @Column({ type: 'varchar', nullable: true })
  lastName: string | null;

  @Column({ type: 'varchar', nullable: true })
  avatarImage: string | null;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.USER,
  })
  role: UserRole;

  @Column({ type: 'boolean', default: false })
  emailVerified: boolean;

  @Column({ type: 'varchar', nullable: true })
  emailVerificationToken: string | null;

  @Column({ type: 'timestamp', nullable: true })
  emailVerificationTokenExpiry: Date | null;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'timestamp', nullable: true })
  lastLogin: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  emailChangedAt: Date | null;

  @Column({ type: 'varchar', nullable: true })
  resetToken: string | null;

  @Column({ type: 'timestamp', nullable: true })
  resetTokenExpiry: Date | null;

  @Column({ type: 'varchar', nullable: true, unique: true })
  facebookId: string | null;

  @Column({ type: 'varchar', nullable: true })
  facebookEmail: string | null;

  @OneToMany(() => BlogPost, (blogPost) => blogPost.author)
  blogPosts: BlogPost[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

