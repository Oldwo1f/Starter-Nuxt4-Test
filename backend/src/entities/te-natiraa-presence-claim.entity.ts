import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from './user.entity';
import { TeNatiraaPresenceCode } from './te-natiraa-presence-code.entity';

@Entity('te_natiraa_presence_claims')
@Index(['userId', 'presenceCodeId'], { unique: true })
export class TeNatiraaPresenceClaim {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  presenceCodeId: number;

  @ManyToOne(() => TeNatiraaPresenceCode, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'presenceCodeId' })
  presenceCode: TeNatiraaPresenceCode;

  @CreateDateColumn()
  claimedAt: Date;
}
