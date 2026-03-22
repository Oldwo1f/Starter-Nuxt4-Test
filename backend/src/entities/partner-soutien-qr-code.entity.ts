import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Partner } from './partner.entity';

@Entity('partner_soutien_qr_codes')
export class PartnerSoutienQrCode {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 64, unique: true })
  token: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  label: string | null;

  @Column({ type: 'int', nullable: true })
  partnerId: number | null;

  @ManyToOne(() => Partner, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'partnerId' })
  partner: Partner | null;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
