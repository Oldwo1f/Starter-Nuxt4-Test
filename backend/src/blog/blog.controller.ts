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

  @ApiProperty({ description: 'Status: draft, active, archived', required: false, enum: BlogStatus })
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

  @ApiProperty({ description: 'Status: draft, active, archived', required: false, enum: BlogStatus })
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
    if (dto.status && ['draft', 'active', 'archived'].includes(dto.status)) {
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
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.MODERATOR)
  @UseInterceptors(FilesInterceptor('images', 10)) // Max 10 images
  @ApiBearerAuth('JWT-auth')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Create a new blog post', description: 'Create a new blog post with images (admin/staff only)' })
  @ApiBody({ type: CreateBlogDto })
  @ApiResponse({ status: 201, description: 'Blog post successfully created' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin/Staff only' })
  async create(
    @Body() createBlogDto: CreateBlogDto & { status?: string; publishedAt?: string; isPinned?: string },
    @Request() req,
    @UploadedFiles() files?: Express.Multer.File[],
  ) {
    const meta = this.parseBlogMeta(createBlogDto);
    const status = meta.status ?? BlogStatus.DRAFT;
    const publishedAt = meta.publishedAt;
    const isPinned = meta.isPinned ?? false;

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
  @ApiOperation({ summary: 'Get a blog post by ID', description: 'Public: active posts only. Admin: any post.' })
  @ApiParam({ name: 'id', description: 'Blog post ID', type: 'number' })
  @ApiResponse({ status: 200, description: 'Blog post retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Blog post not found' })
  findOne(@Param('id') id: string, @Request() req: { user?: { role: string } }) {
    const isAdmin = req.user && [UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.MODERATOR].includes(req.user.role as UserRole);
    const forPublic = !isAdmin;
    return this.blogService.findOne(+id, forPublic);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.MODERATOR)
  @UseInterceptors(FilesInterceptor('images', 10)) // Max 10 images
  @ApiBearerAuth('JWT-auth')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Update a blog post', description: 'Update an existing blog post with images (admin/staff only)' })
  @ApiParam({ name: 'id', description: 'Blog post ID', type: 'number' })
  @ApiBody({ type: UpdateBlogDto })
  @ApiResponse({ status: 200, description: 'Blog post successfully updated' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin/Staff only' })
  @ApiResponse({ status: 404, description: 'Blog post not found' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateBlogDto: any, // Use any to handle FormData properly
    @UploadedFiles() files?: Express.Multer.File[],
  ) {
    let imageUrls: string[] | undefined;

    // Parse existing images if provided as JSON string
    if (updateBlogDto.images && typeof updateBlogDto.images === 'string') {
      try {
        imageUrls = JSON.parse(updateBlogDto.images);
      } catch (e) {
        // If parsing fails, treat as empty array
        imageUrls = [];
      }
    } else if (Array.isArray(updateBlogDto.images)) {
      imageUrls = updateBlogDto.images;
    }

    // If new images are uploaded, add them to existing ones or replace
    if (files && files.length > 0) {
      const newImageUrls = await this.saveBlogImages(id, files);
      // Combine existing and new images
      imageUrls = [...(imageUrls || []), ...newImageUrls];
    }

    const meta = this.parseBlogMeta(updateBlogDto);
    return this.blogService.update(
      id,
      updateBlogDto.title,
      updateBlogDto.content,
      imageUrls,
      updateBlogDto.videoUrl,
      meta.status,
      meta.publishedAt,
      meta.isPinned,
    );
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.MODERATOR)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Delete a blog post', description: 'Delete a blog post by ID (admin/staff only)' })
  @ApiParam({ name: 'id', description: 'Blog post ID', type: 'number' })
  @ApiResponse({ status: 200, description: 'Blog post successfully deleted' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin/Staff only' })
  @ApiResponse({ status: 404, description: 'Blog post not found' })
  remove(@Param('id') id: string) {
    return this.blogService.remove(+id);
  }
}

