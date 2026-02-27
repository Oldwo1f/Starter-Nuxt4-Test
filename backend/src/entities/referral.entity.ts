import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from './user.entity';

export enum ReferralStatus {
  INSCRIT = 'inscrit', // Inscrit mais pas encore membre
  MEMBRE = 'membre', // Devenu membre
  VALIDEE = 'validee', // Récompense créditée
}

@Entity('referrals')
@Index(['referrerId', 'referredId'], { unique: true })
export class Referral {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  referrerId: number; // ID du parrain

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'referrerId' })
  referrer: User;

  @Column()
  referredId: number; // ID du filleul

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'referredId' })
  referred: User;

  @Column({
    type: 'enum',
    enum: ReferralStatus,
    default: ReferralStatus.INSCRIT,
  })
  status: ReferralStatus;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
