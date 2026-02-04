import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { Listing } from './listing.entity';

@Entity('locations')
export class Location {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  archipel: string;

  @Column()
  commune: string;

  @Column()
  ile: string;

  @Column({ type: 'boolean', default: false })
  isDigital: boolean; // Pour l'option "Digital / À distance"

  @OneToMany(() => Listing, (listing) => listing.location)
  listings: Listing[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
