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
import { CultureService } from './culture.service';
import { CreateCultureDto } from './dto/create-culture.dto';
import { UpdateCultureDto } from './dto/update-culture.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/optional-jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { UserRole } from '../entities/user.entity';
import { CultureType } from '../entities/culture.entity';

@ApiTags('culture')
@Controller('culture')
export class CultureController {
  constructor(private readonly cultureService: CultureService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.MODERATOR)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Create a new culture video',
    description: 'Create a new culture video (admin/staff only)',
  })
  @ApiBody({ type: CreateCultureDto })
  @ApiResponse({ status: 201, description: 'Culture video successfully created' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin/Staff only' })
  async create(@Body() createCultureDto: CreateCultureDto, @Request() req) {
    return this.cultureService.create(
      createCultureDto.title,
      createCultureDto.type,
      createCultureDto.youtubeUrl,
      createCultureDto.director,
      createCultureDto.isPublic ?? true,
      req.user?.id,
    );
  }

  @Get()
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({
    summary: 'Get all culture videos',
    description: 'Retrieve all culture videos. Public videos are visible to all, private ones only to authenticated users.',
  })
  @ApiQuery({
    name: 'type',
    enum: CultureType,
    required: false,
    description: 'Filter by video type',
  })
  @ApiResponse({ status: 200, description: 'List of culture videos retrieved successfully' })
  async findAll(@Request() req, @Query('type') type?: CultureType) {
    const isAuthenticated = !!req.user;
    if (type) {
      return this.cultureService.findByType(type, isAuthenticated);
    }
    return this.cultureService.findAll(isAuthenticated);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get a culture video by ID',
    description: 'Retrieve a specific culture video by its ID',
  })
  @ApiParam({ name: 'id', description: 'Culture video ID', type: 'number' })
  @ApiResponse({ status: 200, description: 'Culture video retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Culture video not found' })
  async findOne(@Param('id', ParseIntPipe) id: number, @Request() req) {
    const isAuthenticated = !!req.user;
    return this.cultureService.findOne(id, isAuthenticated);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.MODERATOR)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Update a culture video',
    description: 'Update an existing culture video (admin/staff only)',
  })
  @ApiParam({ name: 'id', description: 'Culture video ID', type: 'number' })
  @ApiBody({ type: UpdateCultureDto })
  @ApiResponse({ status: 200, description: 'Culture video successfully updated' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin/Staff only' })
  @ApiResponse({ status: 404, description: 'Culture video not found' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateCultureDto: UpdateCultureDto,
  ) {
    return this.cultureService.update(
      id,
      updateCultureDto.title,
      updateCultureDto.type,
      updateCultureDto.youtubeUrl,
      updateCultureDto.director,
      updateCultureDto.isPublic,
    );
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.MODERATOR)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Delete a culture video',
    description: 'Delete a culture video by ID (admin/staff only)',
  })
  @ApiParam({ name: 'id', description: 'Culture video ID', type: 'number' })
  @ApiResponse({ status: 200, description: 'Culture video successfully deleted' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin/Staff only' })
  @ApiResponse({ status: 404, description: 'Culture video not found' })
  async remove(@Param('id', ParseIntPipe) id: number) {
    return this.cultureService.remove(id);
  }
}
