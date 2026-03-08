import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { PollOption } from './poll-option.entity';
import { PollResponse } from './poll-response.entity';

export enum PollType {
  QCM = 'qcm',
  RANKING = 'ranking',
}

export enum PollAccessLevel {
  PUBLIC = 'public',
  MEMBER = 'member',
}

export enum PollStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  ENDED = 'ended',
}

@Entity('polls')
export class Poll {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  title: string;

  @Column('text', { nullable: true })
  description: string | null;

  @Column({
    type: 'enum',
    enum: PollType,
  })
  type: PollType;

  @Column({
    type: 'enum',
    enum: PollAccessLevel,
    default: PollAccessLevel.PUBLIC,
  })
  accessLevel: PollAccessLevel;

  @Column({
    type: 'enum',
    enum: PollStatus,
    default: PollStatus.DRAFT,
  })
  status: PollStatus;

  @OneToMany(() => PollOption, (option) => option.poll, { cascade: true })
  options: PollOption[];

  @OneToMany(() => PollResponse, (response) => response.poll)
  responses: PollResponse[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
