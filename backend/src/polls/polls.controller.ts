import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  ParseIntPipe,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiParam,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { PollsService } from './polls.service';
import { CreatePollDto } from './dto/create-poll.dto';
import { UpdatePollDto } from './dto/update-poll.dto';
import { SubmitResponseDto } from './dto/submit-response.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/optional-jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { UserRole } from '../entities/user.entity';
import { PollStatus, PollAccessLevel, PollType } from '../entities/poll.entity';

@ApiTags('polls')
@Controller('polls')
export class PollsController {
  constructor(private readonly pollsService: PollsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.MODERATOR)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Create a new poll',
    description: 'Create a new poll (admin/staff only)',
  })
  @ApiBody({ type: CreatePollDto })
  @ApiResponse({ status: 201, description: 'Poll successfully created' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin/Staff only' })
  async create(@Body() createPollDto: CreatePollDto, @Request() req: any) {
    return this.pollsService.create(createPollDto, req.user);
  }

  @Get()
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({
    summary: 'Get all polls with pagination',
    description: 'Retrieve a paginated list of polls with filtering options',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'pageSize', required: false, type: Number, example: 10 })
  @ApiQuery({ name: 'status', enum: PollStatus, required: false })
  @ApiQuery({ name: 'accessLevel', enum: PollAccessLevel, required: false })
  @ApiQuery({ name: 'type', enum: PollType, required: false })
  @ApiResponse({ status: 200, description: 'Paginated list of polls retrieved successfully' })
  async findAll(
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
    @Query('status') status?: PollStatus,
    @Query('accessLevel') accessLevel?: PollAccessLevel,
    @Query('type') type?: PollType,
    @Request() req?: any,
  ) {
    return this.pollsService.findAll(
      page ? Number(page) : 1,
      pageSize ? Number(pageSize) : 10,
      status,
      accessLevel,
      type,
      req.user,
    );
  }

  @Get('active')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({
    summary: 'Get active polls',
    description: 'Retrieve active polls for home page (limited to 4)',
  })
  @ApiResponse({ status: 200, description: 'Active polls retrieved successfully' })
  async findActive(@Request() req?: any) {
    return this.pollsService.findActive(req.user);
  }

  @Get(':id/responses')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.MODERATOR)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get all responses for a poll',
    description: 'Get all responses for a poll (admin/staff only)',
  })
  @ApiParam({ name: 'id', description: 'Poll ID', type: 'number' })
  @ApiResponse({ status: 200, description: 'Responses retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin/Staff only' })
  @ApiResponse({ status: 404, description: 'Poll not found' })
  async getResponses(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    return this.pollsService.getResponses(id, req.user);
  }

  @Get(':id/has-responded')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({
    summary: 'Check if user has responded',
    description: 'Check if the current user has already responded to the poll',
  })
  @ApiParam({ name: 'id', description: 'Poll ID', type: 'number' })
  @ApiResponse({ status: 200, description: 'Response status retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Poll not found' })
  async hasResponded(@Param('id', ParseIntPipe) id: number, @Request() req?: any) {
    if (!req.user) {
      return { hasResponded: false };
    }
    const hasResponded = await this.pollsService.hasUserResponded(id, req.user.id);
    return { hasResponded };
  }

  @Get(':id/results')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({
    summary: 'Get poll results',
    description: 'Get poll results (only if user has responded)',
  })
  @ApiParam({ name: 'id', description: 'Poll ID', type: 'number' })
  @ApiResponse({ status: 200, description: 'Poll results retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Must respond first' })
  @ApiResponse({ status: 404, description: 'Poll not found' })
  async getResults(@Param('id', ParseIntPipe) id: number, @Request() req?: any) {
    return this.pollsService.getResults(id, req.user);
  }

  @Get(':id')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({
    summary: 'Get a poll by ID',
    description: 'Retrieve a specific poll by its ID',
  })
  @ApiParam({ name: 'id', description: 'Poll ID', type: 'number' })
  @ApiResponse({ status: 200, description: 'Poll retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Poll not found' })
  async findOne(@Param('id', ParseIntPipe) id: number, @Request() req?: any) {
    return this.pollsService.findOne(id, req.user);
  }

  @Post(':id/respond')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({
    summary: 'Submit a poll response',
    description: 'Submit a response to a poll (QCM or ranking)',
  })
  @ApiParam({ name: 'id', description: 'Poll ID', type: 'number' })
  @ApiBody({ type: SubmitResponseDto })
  @ApiResponse({ status: 201, description: 'Response successfully submitted' })
  @ApiResponse({ status: 400, description: 'Bad request - Invalid response or already responded' })
  @ApiResponse({ status: 403, description: 'Forbidden - Member access required' })
  @ApiResponse({ status: 404, description: 'Poll not found' })
  async submitResponse(
    @Param('id', ParseIntPipe) id: number,
    @Body() submitResponseDto: SubmitResponseDto,
    @Request() req?: any,
  ) {
    return this.pollsService.submitResponse(id, submitResponseDto, req.user);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.MODERATOR)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Update a poll',
    description: 'Update an existing poll (admin/staff only)',
  })
  @ApiParam({ name: 'id', description: 'Poll ID', type: 'number' })
  @ApiBody({ type: UpdatePollDto })
  @ApiResponse({ status: 200, description: 'Poll successfully updated' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin/Staff only' })
  @ApiResponse({ status: 404, description: 'Poll not found' })
  async update(@Param('id', ParseIntPipe) id: number, @Body() updatePollDto: UpdatePollDto, @Request() req: any) {
    return this.pollsService.update(id, updatePollDto, req.user);
  }

  @Delete('responses/:responseId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.MODERATOR)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Delete a poll response',
    description: 'Delete a specific poll response (admin/staff only)',
  })
  @ApiParam({ name: 'responseId', description: 'Response ID', type: 'number' })
  @ApiResponse({ status: 200, description: 'Response successfully deleted' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin/Staff only' })
  @ApiResponse({ status: 404, description: 'Response not found' })
  async removeResponse(@Param('responseId', ParseIntPipe) responseId: number) {
    return this.pollsService.removeResponse(responseId);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.MODERATOR)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Delete a poll',
    description: 'Delete a poll by ID (admin/staff only)',
  })
  @ApiParam({ name: 'id', description: 'Poll ID', type: 'number' })
  @ApiResponse({ status: 200, description: 'Poll successfully deleted' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin/Staff only' })
  @ApiResponse({ status: 404, description: 'Poll not found' })
  async remove(@Param('id', ParseIntPipe) id: number) {
    return this.pollsService.remove(id);
  }
}
