/**
 * Admin agent tools for todos management.
 */
import { TodosService } from '../../todos/todos.service';
import { CreateTodoDto } from '../../todos/dto/create-todo.dto';
import { UpdateTodoDto } from '../../todos/dto/update-todo.dto';

export const listTodosTool = {
  type: 'function' as const,
  function: {
    name: 'list_todos',
    description: 'Liste toutes les tâches (todos) internes.',
    parameters: { type: 'object', properties: {} },
  },
};

export const getTodoTool = {
  type: 'function' as const,
  function: {
    name: 'get_todo',
    description: 'Récupère une tâche par son ID.',
    parameters: {
      type: 'object',
      properties: { id: { type: 'number', description: 'ID de la tâche' } },
      required: ['id'],
    },
  },
};

export const createTodoTool = {
  type: 'function' as const,
  function: {
    name: 'create_todo',
    description: 'Crée une nouvelle tâche. Nécessite title et assignedTo.',
    parameters: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Titre de la tâche' },
        description: { type: 'string', description: 'Description' },
        status: { type: 'string', enum: ['en_cours', 'finish', 'pour_plus_tard'], description: 'Statut (défaut: en_cours)' },
        assignedTo: { type: 'string', enum: ['naho', 'tamiga', 'alexis', 'vai'], description: 'Personne assignée' },
      },
      required: ['title', 'assignedTo'],
    },
  },
};

export const updateTodoTool = {
  type: 'function' as const,
  function: {
    name: 'update_todo',
    description: 'Met à jour une tâche existante.',
    parameters: {
      type: 'object',
      properties: {
        id: { type: 'number', description: 'ID de la tâche' },
        title: { type: 'string' },
        description: { type: 'string' },
        status: { type: 'string', enum: ['en_cours', 'finish', 'pour_plus_tard'] },
        assignedTo: { type: 'string', enum: ['naho', 'tamiga', 'alexis', 'vai'] },
      },
      required: ['id'],
    },
  },
};

export const deleteTodoTool = {
  type: 'function' as const,
  function: {
    name: 'delete_todo',
    description: 'Supprime une tâche par ID. Irréversible.',
    parameters: {
      type: 'object',
      properties: { id: { type: 'number', description: 'ID de la tâche' } },
      required: ['id'],
    },
  },
};

export async function executeListTodos(todosService: TodosService): Promise<string> {
  const todos = await todosService.findAll();
  return JSON.stringify(todos, null, 2);
}

export async function executeGetTodo(todosService: TodosService, args: { id: number }): Promise<string> {
  const todo = await todosService.findOne(args.id);
  return JSON.stringify(todo, null, 2);
}

export async function executeCreateTodo(
  todosService: TodosService,
  args: {
    title: string;
    description?: string;
    status?: 'en_cours' | 'finish' | 'pour_plus_tard';
    assignedTo: 'naho' | 'tamiga' | 'alexis' | 'vai';
  },
): Promise<string> {
  const dto: CreateTodoDto = {
    title: args.title,
    description: args.description,
    status: args.status ?? 'en_cours',
    assignedTo: args.assignedTo,
  };
  const todo = await todosService.create(dto);
  return JSON.stringify(todo, null, 2);
}

export async function executeUpdateTodo(
  todosService: TodosService,
  args: {
    id: number;
    title?: string;
    description?: string;
    status?: 'en_cours' | 'finish' | 'pour_plus_tard';
    assignedTo?: 'naho' | 'tamiga' | 'alexis' | 'vai';
  },
): Promise<string> {
  const dto: UpdateTodoDto = {};
  if (args.title !== undefined) dto.title = args.title;
  if (args.description !== undefined) dto.description = args.description;
  if (args.status !== undefined) dto.status = args.status;
  if (args.assignedTo !== undefined) dto.assignedTo = args.assignedTo;
  const todo = await todosService.update(args.id, dto);
  return JSON.stringify(todo, null, 2);
}

export async function executeDeleteTodo(todosService: TodosService, args: { id: number }): Promise<string> {
  await todosService.remove(args.id);
  return JSON.stringify({ success: true, message: `Tâche ${args.id} supprimée` });
}
