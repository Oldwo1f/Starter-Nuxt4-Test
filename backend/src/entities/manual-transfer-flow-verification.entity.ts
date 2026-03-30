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

/** Cotisation payée via coordonnées affichées (CCP, RIB Déblock, Déblock instantané) — hors legacy Naho/Tamiga */
export enum ManualTransferFlowChannel {
  CCP_MARAMA = 'ccp_marama',
  DEBLOCK_RIB = 'deblock_rib',
  DEBLOCK_INSTANT = 'deblock_instant',
}

export enum ManualTransferFlowStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  REJECTED = 'rejected',
}

@Entity('manual_transfer_flow_verifications')
export class ManualTransferFlowVerification {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  userId: number;

  @Column({ type: 'varchar' })
  channel: ManualTransferFlowChannel;

  @Column({ type: 'varchar', default: ManualTransferFlowStatus.PENDING })
  status: ManualTransferFlowStatus;

  @Column({ type: 'boolean', default: false })
  pupuInscriptionReceived: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
