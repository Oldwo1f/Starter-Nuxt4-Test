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

export enum CultureType {
  REPORTAGE = 'reportage',
  DOCUMENTAIRE = 'documentaire',
  INTERVIEW = 'interview',
}

@Entity('cultures')
export class Culture {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  title: string;

  @Column({
    type: 'enum',
    enum: CultureType,
  })
  type: CultureType;

  @Column({ type: 'varchar' })
  youtubeUrl: string;

  @Column({ type: 'varchar', nullable: true })
  director: string | null; // Réalisateur

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
