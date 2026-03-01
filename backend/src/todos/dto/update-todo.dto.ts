import { IsString, IsOptional, IsIn } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import type { TodoAssignedTo, TodoStatus } from '../../entities/todo.entity';

export class UpdateTodoDto {
  @ApiPropertyOptional({ description: 'Titre de la tâche' })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiPropertyOptional({ description: 'Description de la tâche' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    description: 'Statut de la tâche',
    enum: ['en_cours', 'finish', 'pour_plus_tard'],
  })
  @IsOptional()
  @IsIn(['en_cours', 'finish', 'pour_plus_tard'])
  status?: TodoStatus;

  @ApiPropertyOptional({
    description: 'Personne assignée à la tâche',
    enum: ['naho', 'tamiga', 'alexis', 'vai'],
  })
  @IsString()
  @IsOptional()
  @IsIn(['naho', 'tamiga', 'alexis', 'vai'])
  assignedTo?: TodoAssignedTo;
}
