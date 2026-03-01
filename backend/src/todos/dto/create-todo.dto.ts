import { IsString, IsNotEmpty, IsOptional, IsIn } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { TodoAssignedTo, TodoStatus } from '../../entities/todo.entity';

export class CreateTodoDto {
  @ApiProperty({ description: 'Titre de la tâche' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiPropertyOptional({ description: 'Description de la tâche' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    description: 'Statut de la tâche',
    enum: ['en_cours', 'finish', 'pour_plus_tard'],
    default: 'en_cours',
  })
  @IsOptional()
  @IsIn(['en_cours', 'finish', 'pour_plus_tard'])
  status?: TodoStatus;

  @ApiProperty({
    description: 'Personne assignée à la tâche',
    enum: ['naho', 'tamiga', 'alexis', 'vai'],
  })
  @IsString()
  @IsNotEmpty()
  @IsIn(['naho', 'tamiga', 'alexis', 'vai'])
  assignedTo: TodoAssignedTo;
}
