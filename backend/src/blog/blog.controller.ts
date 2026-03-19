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
  Query,
  UseInterceptors,
  UploadedFiles,
  ParseIntPipe,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiParam,
  ApiBearerAuth,
  ApiProperty,
  ApiConsumes,
} from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsArray, IsEnum, IsBoolean, IsDateString } from 'class-validator';
import { Transform } from 'class-transformer';
import { BlogService } from './blog.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/optional-jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { UserRole } from '../entities/user.entity';
import { BlogStatus } from '../entities/blog-post.entity';
import { BlogPaginationQueryDto } from './dto/pagination-query.dto';
import { PaginatedBlogPostsResponseDto } from './dto/paginated-response.dto';
import { UploadService } from '../upload/upload.service';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';

export class CreateBlogDto {
  @ApiProperty({
    description: 'Blog post title',
    example: 'My First Blog Post',
  })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({
    description: 'Blog post content',
    example: 'This is the content of my blog post...',
  })
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiProperty({ description: 'Status: draft, pending, active, archived', required: false, enum: BlogStatus })
  @IsOptional()
  @IsEnum(BlogStatus)
  status?: BlogStatus;

  @ApiProperty({ description: 'When published or scheduled (ISO date)', required: false })
  @IsOptional()
  @IsDateString()
  publishedAt?: string;

  @ApiProperty({ description: 'Featured article at top', required: false, default: false })
  @IsOptional()
  @Transform(({ value }) => (value === undefined || value === '' ? undefined : value === 'true' || value === true || value === '1' || value === 1))
  @IsBoolean()
  isPinned?: boolean;
}

export class UpdateBlogDto {
  @ApiProperty({
    description: 'Blog post title',
    example: 'Updated Blog Post Title',
    required: false,
  })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiProperty({
    description: 'Blog post content',
    example: 'Updated blog post content...',
    required: false,
  })
  @IsString()
  @IsOptional()
  content?: string;

  @ApiProperty({
    description: 'Video URL (YouTube, Vimeo, etc.)',
    example: 'https://www.youtube.com/watch?v=...',
    required: false,
  })
  @IsString()
  @IsOptional()
  videoUrl?: string;

  @ApiProperty({
    description: 'Array of image URLs (will be replaced if new images are uploaded)',
    required: false,
  })
  @IsArray()
  @IsOptional()
  images?: string[];

  @ApiProperty({ description: 'Status: draft, pending, active, archived', required: false, enum: BlogStatus })
  @IsOptional()
  @IsEnum(BlogStatus)
  status?: BlogStatus;

  @ApiProperty({ description: 'When published or scheduled (ISO date)', required: false })
  @IsOptional()
  @IsDateString()
  publishedAt?: string;

  @ApiProperty({ description: 'Featured article at top', required: false })
  @IsOptional()
  @Transform(({ value }) => (value === undefined || value === '' ? undefined : value === 'true' || value === true || value === '1' || value === 1))
  @IsBoolean()
  isPinned?: boolean;
}

@ApiTags('blog')
@Controller('blog')
export class BlogController {
  private readonly blogUploadPath: string;

  constructor(
    private readonly blogService: BlogService,
    private readonly uploadService: UploadService,
  ) {
    this.blogUploadPath = join(process.env.UPLOAD_DEST || 'uploads', 'blog');
    // Ensure blog directory exists
    if (!existsSync(this.blogUploadPath)) {
      mkdirSync(this.blogUploadPath, { recursive: true });
    }
  }

  private parseBlogMeta(dto: any): { status?: BlogStatus; publishedAt?: Date | null; isPinned?: boolean } {
    const meta: { status?: BlogStatus; publishedAt?: Date | null; isPinned?: boolean } = {};
    if (dto.status && ['draft', 'pending', 'active', 'archived'].includes(dto.status)) {
      meta.status = dto.status as BlogStatus;
    }
    if (dto.publishedAt !== undefined && dto.publishedAt !== '' && dto.publishedAt !== null) {
      meta.publishedAt = new Date(dto.publishedAt);
    } else if (dto.publishedAt === '' || dto.publishedAt === null) {
      meta.publishedAt = null;
    }
    if (dto.isPinned !== undefined) {
      meta.isPinned = dto.isPinned === true || dto.isPinned === 'true';
    }
    return meta;
  }

  private isStaff(user: { role: string }): boolean {
    return [UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.MODERATOR].includes(user.role as UserRole);
  }

  private canCreateBlog(user: { role: string }): boolean {
    return [UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.MODERATOR, UserRole.MEMBER, UserRole.PREMIUM, UserRole.VIP].includes(user.role as UserRole);
  }

  private async saveBlogImages(blogId: number, files: Express.Multer.File[]): Promise<string[]> {
    const blogDir = join(this.blogUploadPath, blogId.toString());
    if (!existsSync(blogDir)) {
      mkdirSync(blogDir, { recursive: true });
    }

    const imageUrls: string[] = [];
    for (const file of files) {
      this.uploadService.validateFile(file);
      const filename = this.uploadService.generateFileName(file.originalname);
      const filePath = join(blogDir, filename);
      writeFileSync(filePath, file.buffer);
      imageUrls.push(`/uploads/blog/${blogId}/${filename}`);
    }

    return imageUrls;
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FilesInterceptor('images', 10)) // Max 10 images
  @ApiBearerAuth('JWT-auth')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Create a new blog post', description: 'Staff: any status. Members: draft or pending only.' })
  @ApiBody({ type: CreateBlogDto })
  @ApiResponse({ status: 201, description: 'Blog post successfully created' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Members only (member, premium, vip)' })
  async create(
    @Body() createBlogDto: CreateBlogDto & { status?: string; publishedAt?: string; isPinned?: string },
    @Request() req,
    @UploadedFiles() files?: Express.Multer.File[],
  ) {
    if (!this.canCreateBlog(req.user)) {
      throw new ForbiddenException('La création d\'articles est réservée aux membres. Devenez membre pour poster des articles.');
    }

    const meta = this.parseBlogMeta(createBlogDto);
    let status = meta.status ?? BlogStatus.DRAFT;
    let publishedAt = meta.publishedAt;
    let isPinned = meta.isPinned ?? false;

    // Members cannot set active, archived, or isPinned
    if (!this.isStaff(req.user)) {
      if (status === BlogStatus.ACTIVE || status === BlogStatus.ARCHIVED) {
        status = BlogStatus.PENDING;
      }
      isPinned = false;
      publishedAt = null; // Members cannot schedule publication
    }

    if (files && files.length > 0) {
      const blogPost = await this.blogService.create(
        createBlogDto.title,
        createBlogDto.content,
        req.user.id,
        undefined,
        undefined,
        status,
        publishedAt,
        isPinned,
      );

      const imageUrls = await this.saveBlogImages(blogPost.id, files);

      return this.blogService.update(
        blogPost.id,
        undefined,
        undefined,
        imageUrls,
        undefined,
        undefined,
        undefined,
        undefined,
      );
    }

    return this.blogService.create(
      createBlogDto.title,
      createBlogDto.content,
      req.user.id,
      undefined,
      undefined,
      status,
      publishedAt,
      isPinned,
    );
  }

  @Get('my')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get current user\'s blog posts', description: 'Returns all posts by the authenticated user (all statuses).' })
  @ApiResponse({ status: 200, description: 'Paginated list of user\'s blog posts' })
  findMy(@Query() query: BlogPaginationQueryDto, @Request() req: { user: { id: number } }) {
    return this.blogService.findAllPaginated(
      query.page ?? 1,
      query.pageSize ?? 10,
      query.search,
      req.user.id,
      query.sortBy ?? 'createdAt',
      query.sortOrder ?? 'DESC',
      query.status,
      false, // forPublic = false to see all statuses
    );
  }

  @Get()
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({
    summary: 'Get all blog posts with pagination',
    description: 'Public: active posts only. Admin: all posts with optional status filter.',
  })
  @ApiResponse({
    status: 200,
    description: 'Paginated list of blog posts retrieved successfully',
    type: PaginatedBlogPostsResponseDto,
  })
  findAll(@Query() query: BlogPaginationQueryDto, @Request() req: { user?: { role: string } }) {
    const isAdmin = req.user && [UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.MODERATOR].includes(req.user.role as UserRole);
    const forPublic = !isAdmin;
    return this.blogService.findAllPaginated(
      query.page,
      query.pageSize,
      query.search,
      query.authorId,
      query.sortBy,
      query.sortOrder,
      isAdmin ? query.status : undefined,
      forPublic,
    );
  }

  @Get(':id')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'Get a blog post by ID', description: 'Public: active only. Admin: any. Author: own draft/pending.' })
  @ApiParam({ name: 'id', description: 'Blog post ID', type: 'number' })
  @ApiResponse({ status: 200, description: 'Blog post retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Blog post not found' })
  async findOne(@Param('id') id: string, @Request() req: { user?: { id: number; role: string } }) {
    const isAdmin = req.user && [UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.MODERATOR].includes(req.user.role as UserRole);
    const forPublic = !isAdmin;
    try {
      return await this.blogService.findOne(+id, forPublic);
    } catch (e) {
      if (req.user && e instanceof NotFoundException) {
        const post = await this.blogService.findOne(+id, false);
        if (post.authorId === req.user.id) return post;
      }
      throw e;
    }
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FilesInterceptor('images', 10)) // Max 10 images
  @ApiBearerAuth('JWT-auth')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Update a blog post', description: 'Staff: any post. Members: own draft/pending only.' })
  @ApiParam({ name: 'id', description: 'Blog post ID', type: 'number' })
  @ApiBody({ type: UpdateBlogDto })
  @ApiResponse({ status: 200, description: 'Blog post successfully updated' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Blog post not found' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateBlogDto: any, // Use any to handle FormData properly
    @Request() req,
    @UploadedFiles() files?: Express.Multer.File[],
  ) {
    const existing = await this.blogService.findOne(id, false);
    const isStaff = this.isStaff(req.user);

    if (!isStaff) {
      if (existing.authorId !== req.user.id) {
        throw new ForbiddenException('Vous ne pouvez modifier que vos propres articles.');
      }
      if (existing.status !== BlogStatus.DRAFT && existing.status !== BlogStatus.PENDING) {
        throw new ForbiddenException('Seuls les articles en brouillon ou en attente peuvent être modifiés.');
      }
    }

    let imageUrls: string[] | undefined;

    // Parse existing images if provided as JSON string
    if (updateBlogDto.images && typeof updateBlogDto.images === 'string') {
      try {
        imageUrls = JSON.parse(updateBlogDto.images);
      } catch (e) {
        imageUrls = [];
      }
    } else if (Array.isArray(updateBlogDto.images)) {
      imageUrls = updateBlogDto.images;
    }

    if (files && files.length > 0) {
      const newImageUrls = await this.saveBlogImages(id, files);
      imageUrls = [...(imageUrls || []), ...newImageUrls];
    }

    const meta = this.parseBlogMeta(updateBlogDto);
    let status = meta.status;
    let publishedAt = meta.publishedAt;
    let isPinned = meta.isPinned;

    // Members cannot set active, archived, or isPinned
    if (!isStaff) {
      if (status === BlogStatus.ACTIVE || status === BlogStatus.ARCHIVED) {
        status = undefined; // Keep current status
      }
      isPinned = existing.isPinned; // Preserve, don't allow change
      publishedAt = existing.publishedAt; // Preserve
    }

    return this.blogService.update(
      id,
      updateBlogDto.title,
      updateBlogDto.content,
      imageUrls,
      updateBlogDto.videoUrl,
      status,
      publishedAt,
      isPinned,
    );
  }

  @Patch(':id/approve')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.MODERATOR)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Approve a pending blog post', description: 'Staff only. Sets status to active and sends approval email to author.' })
  @ApiParam({ name: 'id', description: 'Blog post ID', type: 'number' })
  @ApiResponse({ status: 200, description: 'Blog post approved and email sent' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Blog post not found' })
  async approve(@Param('id', ParseIntPipe) id: number) {
    return this.blogService.approve(id);
  }

  @Patch(':id/reject')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.MODERATOR)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Reject a pending blog post', description: 'Staff only. Sets status to draft and sends rejection email with reason to author.' })
  @ApiParam({ name: 'id', description: 'Blog post ID', type: 'number' })
  @ApiBody({ schema: { type: 'object', required: ['reason'], properties: { reason: { type: 'string' } } } })
  @ApiResponse({ status: 200, description: 'Blog post rejected and email sent' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Blog post not found' })
  async reject(@Param('id', ParseIntPipe) id: number, @Body('reason') reason: string) {
    if (!reason || typeof reason !== 'string' || !reason.trim()) {
      throw new BadRequestException('La raison du rejet est obligatoire.');
    }
    return this.blogService.reject(id, reason.trim());
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Delete a blog post', description: 'Staff: any post. Members: own draft/pending only.' })
  @ApiParam({ name: 'id', description: 'Blog post ID', type: 'number' })
  @ApiResponse({ status: 200, description: 'Blog post successfully deleted' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Blog post not found' })
  async remove(@Param('id', ParseIntPipe) id: number, @Request() req) {
    const existing = await this.blogService.findOne(id, false);
    const isStaff = this.isStaff(req.user);

    if (!isStaff) {
      if (existing.authorId !== req.user.id) {
        throw new ForbiddenException('Vous ne pouvez supprimer que vos propres articles.');
      }
      if (existing.status !== BlogStatus.DRAFT && existing.status !== BlogStatus.PENDING) {
        throw new ForbiddenException('Seuls les articles en brouillon ou en attente peuvent être supprimés.');
      }
    }

    return this.blogService.remove(id);
  }
}

