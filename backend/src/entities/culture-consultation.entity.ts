import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  Unique,
} from 'typeorm';
import { User } from './user.entity';
import { Culture } from './culture.entity';

@Entity('culture_consultation')
@Unique(['userId', 'cultureId'])
@Index(['userId'])
export class CultureConsultation {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  cultureId: number;

  @ManyToOne(() => Culture, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'cultureId' })
  culture: Culture;

  @CreateDateColumn({ type: 'timestamptz' })
  consultedAt: Date;
}
