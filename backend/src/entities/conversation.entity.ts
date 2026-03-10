import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
  Unique,
} from 'typeorm';
import { User } from './user.entity';
import { Listing } from './listing.entity';
import { Message } from './message.entity';

@Entity('conversations')
@Unique(['participant1Id', 'participant2Id'])
export class Conversation {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  participant1Id: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'participant1Id' })
  participant1: User;

  @Column()
  participant2Id: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'participant2Id' })
  participant2: User;

  @Column({ nullable: true })
  listingId: number | null;

  @ManyToOne(() => Listing, { nullable: true })
  @JoinColumn({ name: 'listingId' })
  listing: Listing | null;

  @OneToMany(() => Message, (message) => message.conversation)
  messages: Message[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
