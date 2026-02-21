import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { AcademyModule } from './module.entity';

@Entity('courses')
export class Course {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'varchar', nullable: true })
  thumbnailImage: string | null;

  @Column({ type: 'boolean', default: false })
  isPublished: boolean;

  @Column({ type: 'int', default: 0 })
  order: number;

  // Instructor information
  @Column({ type: 'varchar', nullable: true })
  instructorAvatar: string | null;

  @Column({ type: 'varchar', nullable: true })
  instructorFirstName: string | null;

  @Column({ type: 'varchar', nullable: true })
  instructorLastName: string | null;

  @Column({ type: 'varchar', nullable: true })
  instructorTitle: string | null; // Qualité/titre du formateur

  @Column({ type: 'varchar', nullable: true })
  instructorLink: string | null; // Lien pour retrouver le formateur

  @OneToMany(() => AcademyModule, (module) => module.course, { cascade: true })
  modules: AcademyModule[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
