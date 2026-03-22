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
import { PartnerSoutienQrCode } from './partner-soutien-qr-code.entity';

@Entity('partner_soutien_qr_claims')
@Index(['userId', 'soutienQrCodeId'], { unique: true })
export class PartnerSoutienQrClaim {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  soutienQrCodeId: number;

  @ManyToOne(() => PartnerSoutienQrCode, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'soutienQrCodeId' })
  soutienQrCode: PartnerSoutienQrCode;

  @CreateDateColumn()
  claimedAt: Date;
}
