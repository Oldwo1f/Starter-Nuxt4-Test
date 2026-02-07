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

@Entity('goodies')
export class Goodie {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ type: 'varchar', nullable: true })
  link: string | null;

  @Column('text', { nullable: true })
  description: string | null;

  @Column({ type: 'varchar', nullable: true })
  imageUrl: string | null; // Image carrée du goodie

  @Column({ type: 'varchar', nullable: true })
  offeredByName: string | null; // Nom de la personne qui offre

  @Column({ type: 'varchar', nullable: true })
  offeredByLink: string | null; // Lien de la personne qui offre

  @Column({ type: 'boolean', default: true })
  isPublic: boolean; // Accessible à tous ou réservé aux connectés

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'createdById' })
  createdBy: User | null;

  @Column({ nullable: true })
  createdById: number | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
