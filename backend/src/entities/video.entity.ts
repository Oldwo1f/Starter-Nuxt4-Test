import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { AcademyModule } from './module.entity';

@Entity('videos')
export class Video {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  moduleId: number;

  @ManyToOne(() => AcademyModule, (module) => module.videos, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'moduleId' })
  academyModule: AcademyModule;

  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'varchar', nullable: true })
  videoFile: string | null; // Chemin du fichier uploadé

  @Column({ type: 'varchar', nullable: true })
  videoUrl: string | null; // URL YouTube

  @Column({ type: 'int', nullable: true })
  duration: number | null; // Durée en secondes

  @Column({ type: 'int', default: 0 })
  order: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
