import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BlogPost, BlogStatus } from '../entities/blog-post.entity';

@Injectable()
export class BlogService {
  constructor(
    @InjectRepository(BlogPost)
    private blogPostRepository: Repository<BlogPost>,
  ) {}

  async create(
    title: string,
    content: string,
    authorId: number,
    images?: string[],
    videoUrl?: string,
    status: BlogStatus = BlogStatus.DRAFT,
    publishedAt?: Date | null,
    isPinned = false,
  ): Promise<BlogPost> {
    const blogPost = this.blogPostRepository.create({
      title,
      content,
      authorId,
      images: images || [],
      videoUrl: videoUrl || null,
      status,
      publishedAt: publishedAt ?? null,
      isPinned,
    });
    return this.blogPostRepository.save(blogPost);
  }

  async findAll(): Promise<BlogPost[]> {
    return this.blogPostRepository.find({
      relations: ['author'],
      select: {
        author: {
          id: true,
          email: true,
        },
      },
      order: {
        createdAt: 'DESC',
      },
    });
  }

  async findAllPaginated(
    page: number = 1,
    pageSize: number = 10,
    search?: string,
    authorId?: number,
    sortBy: string = 'createdAt',
    sortOrder: 'ASC' | 'DESC' = 'DESC',
    status?: string,
    forPublic = false,
  ) {
    const queryBuilder = this.blogPostRepository.createQueryBuilder('blogPost');

    queryBuilder.leftJoinAndSelect('blogPost.author', 'author');

    queryBuilder.select([
      'blogPost.id',
      'blogPost.title',
      'blogPost.content',
      'blogPost.images',
      'blogPost.videoUrl',
      'blogPost.status',
      'blogPost.publishedAt',
      'blogPost.isPinned',
      'blogPost.createdAt',
      'blogPost.updatedAt',
      'author.id',
      'author.email',
    ]);

    if (authorId) {
      queryBuilder.andWhere('blogPost.authorId = :authorId', { authorId });
    }

    if (search) {
      queryBuilder.andWhere(
        '(blogPost.title ILIKE :search OR blogPost.content ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    if (forPublic) {
      queryBuilder.andWhere('blogPost.status = :status', { status: BlogStatus.ACTIVE });
      queryBuilder.andWhere(
        '(blogPost.publishedAt IS NULL OR blogPost.publishedAt <= :now)',
        { now: new Date() },
      );
    } else if (status) {
      queryBuilder.andWhere('blogPost.status = :status', { status });
    }

    queryBuilder
      .orderBy('blogPost.isPinned', 'DESC')
      .addOrderBy('blogPost.publishedAt', 'DESC', 'NULLS LAST')
      .addOrderBy('blogPost.createdAt', 'DESC');

    const total = await queryBuilder.getCount();

    const skip = (page - 1) * pageSize;
    queryBuilder.skip(skip).take(pageSize);

    const data = await queryBuilder.getMany();

    const totalPages = Math.ceil(total / pageSize);
    const hasNext = page < totalPages;
    const hasPrev = page > 1;

    return {
      data,
      total,
      page,
      pageSize,
      totalPages,
      hasNext,
      hasPrev,
    };
  }

  async findOne(id: number, forPublic = false): Promise<BlogPost> {
    const queryBuilder = this.blogPostRepository
      .createQueryBuilder('blogPost')
      .leftJoinAndSelect('blogPost.author', 'author')
      .where('blogPost.id = :id', { id });

    if (forPublic) {
      queryBuilder
        .andWhere('blogPost.status = :status', { status: BlogStatus.ACTIVE })
        .andWhere(
          '(blogPost.publishedAt IS NULL OR blogPost.publishedAt <= :now)',
          { now: new Date() },
        );
    }

    const blogPost = await queryBuilder.getOne();
    if (!blogPost) {
      throw new NotFoundException(`Blog post with ID ${id} not found`);
    }
    return blogPost;
  }

  async update(
    id: number,
    title?: string,
    content?: string,
    images?: string[],
    videoUrl?: string,
    status?: BlogStatus,
    publishedAt?: Date | null,
    isPinned?: boolean,
  ): Promise<BlogPost> {
    const blogPost = await this.findOne(id, false);
    if (title !== undefined) {
      blogPost.title = title;
    }
    if (content !== undefined) {
      blogPost.content = content;
    }
    if (images !== undefined) {
      blogPost.images = images;
    }
    if (videoUrl !== undefined) {
      blogPost.videoUrl = videoUrl;
    }
    if (status !== undefined) {
      const wasDraft = blogPost.status === BlogStatus.DRAFT;
      blogPost.status = status;
      if (wasDraft && status === BlogStatus.ACTIVE && !blogPost.publishedAt) {
        blogPost.publishedAt = new Date();
      }
    }
    if (publishedAt !== undefined) {
      blogPost.publishedAt = publishedAt;
    }
    if (isPinned !== undefined) {
      blogPost.isPinned = isPinned;
    }
    return this.blogPostRepository.save(blogPost);
  }

  async publishScheduledPosts(): Promise<number> {
    const result = await this.blogPostRepository
      .createQueryBuilder()
      .update(BlogPost)
      .set({ status: BlogStatus.ACTIVE })
      .where('status = :draft', { draft: BlogStatus.DRAFT })
      .andWhere('publishedAt IS NOT NULL')
      .andWhere('publishedAt <= :now', { now: new Date() })
      .execute();
    return result.affected ?? 0;
  }

  async remove(id: number): Promise<void> {
    const blogPost = await this.findOne(id);
    await this.blogPostRepository.remove(blogPost);
  }
}

