import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export type TodoAssignedTo = 'naho' | 'tamiga' | 'alexis' | 'vai';
export type TodoStatus = 'en_cours' | 'finish' | 'pour_plus_tard';

@Entity('todos')
export class Todo {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({
    type: 'varchar',
    default: 'en_cours',
  })
  status: TodoStatus;

  @Column({
    type: 'varchar',
  })
  assignedTo: TodoAssignedTo;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
