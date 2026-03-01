import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { TodosService } from './todos.service';
import { CreateTodoDto } from './dto/create-todo.dto';
import { UpdateTodoDto } from './dto/update-todo.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { UserRole } from '../entities/user.entity';
import { Todo } from '../entities/todo.entity';

@ApiTags('todos')
@Controller('todos')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.MODERATOR)
@ApiBearerAuth('JWT-auth')
export class TodosController {
  constructor(private readonly todosService: TodosService) {}

  @Post()
  @ApiOperation({
    summary: 'Create a new todo',
    description: 'Create a new todo task (admin/staff only)',
  })
  @ApiResponse({ status: 201, description: 'Todo successfully created', type: Todo })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin/Staff only' })
  create(@Body() createTodoDto: CreateTodoDto): Promise<Todo> {
    return this.todosService.create(createTodoDto);
  }

  @Get()
  @ApiOperation({
    summary: 'Get all todos',
    description: 'Retrieve all todo tasks (admin/staff only)',
  })
  @ApiResponse({ status: 200, description: 'List of todos', type: [Todo] })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin/Staff only' })
  findAll(): Promise<Todo[]> {
    return this.todosService.findAll();
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get todo by ID',
    description: 'Retrieve a specific todo by its ID (admin/staff only)',
  })
  @ApiParam({ name: 'id', description: 'Todo ID', type: 'number' })
  @ApiResponse({ status: 200, description: 'Todo retrieved successfully', type: Todo })
  @ApiResponse({ status: 404, description: 'Todo not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin/Staff only' })
  findOne(@Param('id', ParseIntPipe) id: number): Promise<Todo> {
    return this.todosService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update a todo',
    description: 'Update a todo task (admin/staff only)',
  })
  @ApiParam({ name: 'id', description: 'Todo ID', type: 'number' })
  @ApiResponse({ status: 200, description: 'Todo successfully updated', type: Todo })
  @ApiResponse({ status: 404, description: 'Todo not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin/Staff only' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateTodoDto: UpdateTodoDto,
  ): Promise<Todo> {
    return this.todosService.update(id, updateTodoDto);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Delete a todo',
    description: 'Delete a todo task (admin/staff only)',
  })
  @ApiParam({ name: 'id', description: 'Todo ID', type: 'number' })
  @ApiResponse({ status: 200, description: 'Todo successfully deleted' })
  @ApiResponse({ status: 404, description: 'Todo not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin/Staff only' })
  remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.todosService.remove(id);
  }
}
