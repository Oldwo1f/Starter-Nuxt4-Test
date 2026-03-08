import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Poll } from './poll.entity';
import { PollOption } from './poll-option.entity';
import { User } from './user.entity';

@Entity('poll_responses')
@Index(['pollId', 'userId'], { unique: true, where: '"userId" IS NOT NULL' })
export class PollResponse {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Poll, (poll) => poll.responses, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'pollId' })
  poll: Poll;

  @Column()
  pollId: number;

  @ManyToOne(() => User, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User | null;

  @Column({ nullable: true })
  userId: number | null;

  @ManyToOne(() => PollOption, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'optionId' })
  option: PollOption | null;

  @Column({ nullable: true })
  optionId: number | null; // Pour QCM : l'option choisie

  @Column({ type: 'jsonb', nullable: true })
  ranking: Array<{ optionId: number; position: number }> | null; // Pour ranking : classement

  @CreateDateColumn()
  createdAt: Date;
}
