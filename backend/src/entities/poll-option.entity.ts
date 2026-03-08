import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { Poll } from './poll.entity';
import { PollResponse } from './poll-response.entity';

@Entity('poll_options')
export class PollOption {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Poll, (poll) => poll.options, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'pollId' })
  poll: Poll;

  @Column()
  pollId: number;

  @Column()
  text: string; // Texte de l'option (pour QCM et ranking)

  @Column({ type: 'int', default: 0 })
  order: number; // Ordre d'affichage

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => PollResponse, (response) => response.option)
  responses: PollResponse[];
}
