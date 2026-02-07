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
import { IsString, IsNotEmpty, IsOptional, IsArray } from 'class-validator';
import { BlogService } from './blog.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
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
  @ApiOperation({ summary: 'Create a new blog post', description: 'Create a new blog post with images (requires authentication)' })
  @ApiBody({ type: CreateBlogDto })
  @ApiResponse({ status: 201, description: 'Blog post successfully created' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async create(
    @Body() createBlogDto: CreateBlogDto,
    @Request() req,
    @UploadedFiles() files?: Express.Multer.File[],
  ) {
    // Save images if provided
    let imageUrls: string[] = [];
    if (files && files.length > 0) {
      // Create blog post first to get ID
      const blogPost = await this.blogService.create(
        createBlogDto.title,
        createBlogDto.content,
        req.user.id,
      );
      
      // Save images
      imageUrls = await this.saveBlogImages(blogPost.id, files);
      
      // Update blog post with image URLs
      return this.blogService.update(
        blogPost.id,
        undefined,
        undefined,
        imageUrls,
        undefined,
      );
    }

    return this.blogService.create(createBlogDto.title, createBlogDto.content, req.user.id);
  }

  @Get()
  @ApiOperation({ 
    summary: 'Get all blog posts with pagination', 
    description: 'Retrieve a paginated list of blog posts with filtering and sorting' 
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Paginated list of blog posts retrieved successfully',
    type: PaginatedBlogPostsResponseDto,
  })
  findAll(@Query() query: BlogPaginationQueryDto) {
    return this.blogService.findAllPaginated(
      query.page,
      query.pageSize,
      query.search,
      query.authorId,
      query.sortBy,
      query.sortOrder,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a blog post by ID', description: 'Retrieve a specific blog post by its ID' })
  @ApiParam({ name: 'id', description: 'Blog post ID', type: 'number' })
  @ApiResponse({ status: 200, description: 'Blog post retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Blog post not found' })
  findOne(@Param('id') id: string) {
    return this.blogService.findOne(+id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FilesInterceptor('images', 10)) // Max 10 images
  @ApiBearerAuth('JWT-auth')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Update a blog post', description: 'Update an existing blog post with images (requires authentication)' })
  @ApiParam({ name: 'id', description: 'Blog post ID', type: 'number' })
  @ApiBody({ type: UpdateBlogDto })
  @ApiResponse({ status: 200, description: 'Blog post successfully updated' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
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

    return this.blogService.update(
      id,
      updateBlogDto.title,
      updateBlogDto.content,
      imageUrls,
      updateBlogDto.videoUrl,
    );
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Delete a blog post', description: 'Delete a blog post by ID (requires authentication)' })
  @ApiParam({ name: 'id', description: 'Blog post ID', type: 'number' })
  @ApiResponse({ status: 200, description: 'Blog post successfully deleted' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Blog post not found' })
  remove(@Param('id') id: string) {
    return this.blogService.remove(+id);
  }
}

