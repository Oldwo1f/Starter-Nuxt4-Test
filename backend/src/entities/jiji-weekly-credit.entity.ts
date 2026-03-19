import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';

@Entity('jiji_weekly_credits')
export class JijiWeeklyCredit {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  userId: number;

  @Column({ type: 'integer' })
  amount: number;

  @Column({ type: 'varchar', length: 20 })
  roleAtCredit: string;

  @Column({ type: 'date', name: 'weekKey' })
  weekKey: Date;

  @CreateDateColumn()
  creditedAt: Date;
}
