import { Controller, Get, Post, Body, Patch, Delete, Param, UseGuards, ParseIntPipe, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiBody, ApiProperty, ApiQuery } from '@nestjs/swagger';
import { IsEnum, IsString, IsOptional, IsBoolean } from 'class-validator';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../entities/user.entity';
import { PaginationQueryDto } from './dto/pagination-query.dto';
import { PaginatedUsersResponseDto } from './dto/paginated-response.dto';
import { AddPointsDeltaDto } from './dto/add-points-delta.dto';

export class UpdateUserRoleDto {
  @ApiProperty({
    description: 'New role for the user',
    enum: UserRole,
    example: UserRole.ADMIN,
  })
  @IsEnum(UserRole)
  role: UserRole;
}

export class UpdateUserDto {
  @ApiProperty({
    description: 'User first name',
    example: 'John',
    required: false,
  })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiProperty({
    description: 'User last name',
    example: 'Doe',
    required: false,
  })
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiProperty({
    description: 'User avatar image URL',
    example: 'https://example.com/avatar.jpg',
    required: false,
  })
  @IsOptional()
  @IsString()
  avatarImage?: string;

  @ApiProperty({
    description: 'Certified badge status',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  isCertified?: boolean;

  @ApiProperty({
    description: 'User phone number',
    example: '+689 87 12 34 56',
    required: false,
  })
  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @ApiProperty({
    description: 'Badge spécial « Respect des anciens » (75+ ans, attribution admin)',
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  respectAnciensBadgeGranted?: boolean;
}

@ApiTags('users')
@ApiBearerAuth('JWT-auth')
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.MODERATOR)
  @ApiOperation({ 
    summary: 'Get all users with pagination', 
    description: 'Retrieve a paginated list of users with filtering and sorting (Admin only)' 
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Paginated list of users retrieved successfully',
    type: PaginatedUsersResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin role required' })
  findAll(@Query() query: PaginationQueryDto) {
    return this.usersService.findAllPaginated(
      query.page,
      query.pageSize,
      query.search,
      query.role,
      query.id,
      query.createdAt,
      query.sortBy,
      query.sortOrder,
    );
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.MODERATOR)
  @ApiOperation({ summary: 'Get user by ID', description: 'Retrieve a specific user by ID (Admin only)' })
  @ApiParam({ name: 'id', type: 'number', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'User retrieved successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.findById(id);
  }

  @Patch(':id/points/formateur')
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  @ApiOperation({
    summary: 'Ajouter au compteur de formations publiées',
    description:
      'Incrémente le compteur utilisé pour les badges « Academy — création de formations » (paliers 1, 3, 5, 10). Réservé aux administrateurs.',
  })
  @ApiParam({ name: 'id', type: 'number', description: 'User ID' })
  @ApiBody({ type: AddPointsDeltaDto })
  @ApiResponse({ status: 200, description: 'User mis à jour' })
  addFormateurPoints(@Param('id', ParseIntPipe) id: number, @Body() dto: AddPointsDeltaDto) {
    return this.usersService.addFormateurPointsDelta(id, dto.delta);
  }

  @Patch(':id/points/soutien')
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.MODERATOR)
  @ApiOperation({
    summary: 'Ajouter des points soutien',
    description: 'Ajoute des points « soutien » (badges Connecter). Administrateurs et modérateurs.',
  })
  @ApiParam({ name: 'id', type: 'number', description: 'User ID' })
  @ApiBody({ type: AddPointsDeltaDto })
  @ApiResponse({ status: 200, description: 'User mis à jour' })
  addSoutienPoints(@Param('id', ParseIntPipe) id: number, @Body() dto: AddPointsDeltaDto) {
    return this.usersService.addSoutienPointsDelta(id, dto.delta);
  }

  @Patch(':id/role')
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  @ApiOperation({ summary: 'Update user role', description: 'Update the role of a user (Admin only)' })
  @ApiParam({ name: 'id', type: 'number', description: 'User ID' })
  @ApiBody({ type: UpdateUserRoleDto })
  @ApiResponse({ status: 200, description: 'User role updated successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async updateRole(@Param('id', ParseIntPipe) id: number, @Body() updateUserRoleDto: UpdateUserRoleDto) {
    return this.usersService.updateRole(id, updateUserRoleDto.role);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  @ApiOperation({ summary: 'Update user profile', description: 'Update user profile information (firstName, lastName, avatarImage, isCertified) (Admin only)' })
  @ApiParam({ name: 'id', type: 'number', description: 'User ID' })
  @ApiBody({ type: UpdateUserDto })
  @ApiResponse({ status: 200, description: 'User profile updated successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  updateUser(@Param('id', ParseIntPipe) id: number, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.updateUser(id, {
      firstName: updateUserDto.firstName,
      lastName: updateUserDto.lastName,
      avatarImage: updateUserDto.avatarImage,
      isCertified: updateUserDto.isCertified,
      phoneNumber: updateUserDto.phoneNumber,
      respectAnciensBadgeGranted: updateUserDto.respectAnciensBadgeGranted,
    });
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  @ApiOperation({ summary: 'Delete user', description: 'Delete a user (Admin only)' })
  @ApiParam({ name: 'id', type: 'number', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'User deleted successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.remove(id);
  }
}

