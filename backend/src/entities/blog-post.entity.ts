import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';

export enum BlogStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  ARCHIVED = 'archived',
}

@Entity('blog_posts')
export class BlogPost {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  title: string;

  @Column('text')
  content: string;

  @Column({ type: 'simple-array', nullable: true })
  images: string[]; // URLs des images

  @Column({ type: 'varchar', nullable: true })
  videoUrl: string | null; // URL de la vidéo (YouTube, Vimeo, etc.)

  @Column({ type: 'varchar', length: 20, default: BlogStatus.DRAFT })
  status: BlogStatus;

  @Column({ type: 'timestamp', nullable: true })
  publishedAt: Date | null;

  @Column({ type: 'boolean', default: false })
  isPinned: boolean;

  @ManyToOne(() => User, (user) => user.blogPosts)
  @JoinColumn({ name: 'authorId' })
  author: User;

  @Column()
  authorId: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

