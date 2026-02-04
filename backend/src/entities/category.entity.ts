import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { Listing } from './listing.entity';

export enum CategoryType {
  BIEN = 'bien',
  SERVICE = 'service',
}

@Entity('categories')
export class Category {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({
    type: 'enum',
    enum: CategoryType,
  })
  type: CategoryType;

  @Column({ type: 'varchar', length: 50, nullable: true })
  color: string | null; // Couleur de la catégorie (ex: 'green', 'blue', 'purple', etc.)

  @Column({ type: 'varchar', nullable: true })
  parentCategoryId: number | null; // Pour les sous-catégories

  @OneToMany(() => Listing, (listing) => listing.category)
  listings: Listing[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
