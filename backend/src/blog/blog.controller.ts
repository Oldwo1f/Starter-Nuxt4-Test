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
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiParam,
  ApiBearerAuth,
  ApiProperty,
} from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { BlogService } from './blog.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { BlogPaginationQueryDto } from './dto/pagination-query.dto';
import { PaginatedBlogPostsResponseDto } from './dto/paginated-response.dto';

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
}

@ApiTags('blog')
@Controller('blog')
export class BlogController {
  constructor(private readonly blogService: BlogService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Create a new blog post', description: 'Create a new blog post (requires authentication)' })
  @ApiBody({ type: CreateBlogDto })
  @ApiResponse({ status: 201, description: 'Blog post successfully created' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  create(@Body() createBlogDto: CreateBlogDto, @Request() req) {
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
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Update a blog post', description: 'Update an existing blog post (requires authentication)' })
  @ApiParam({ name: 'id', description: 'Blog post ID', type: 'number' })
  @ApiBody({ type: UpdateBlogDto })
  @ApiResponse({ status: 200, description: 'Blog post successfully updated' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Blog post not found' })
  update(
    @Param('id') id: string,
    @Body() updateBlogDto: UpdateBlogDto,
  ) {
    return this.blogService.update(+id, updateBlogDto.title, updateBlogDto.content);
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

