import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BlogPost } from '../entities/blog-post.entity';

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
  ): Promise<BlogPost> {
    const blogPost = this.blogPostRepository.create({
      title,
      content,
      authorId,
      images: images || [],
      videoUrl: videoUrl || null,
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
  ) {
    const queryBuilder = this.blogPostRepository.createQueryBuilder('blogPost');

    // Joindre l'auteur
    queryBuilder.leftJoinAndSelect('blogPost.author', 'author');

    // Sélectionner uniquement les champs nécessaires de l'auteur
    queryBuilder.select([
      'blogPost.id',
      'blogPost.title',
      'blogPost.content',
      'blogPost.images',
      'blogPost.videoUrl',
      'blogPost.createdAt',
      'blogPost.updatedAt',
      'author.id',
      'author.email',
    ]);

    // Appliquer les filtres
    if (authorId) {
      queryBuilder.andWhere('blogPost.authorId = :authorId', { authorId });
    }

    if (search) {
      queryBuilder.andWhere(
        '(blogPost.title ILIKE :search OR blogPost.content ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    // Appliquer le tri
    const validSortColumns = ['id', 'title', 'createdAt', 'updatedAt'];
    const sortColumn = validSortColumns.includes(sortBy) ? sortBy : 'createdAt';
    queryBuilder.orderBy(`blogPost.${sortColumn}`, sortOrder);

    // Obtenir le total avant la pagination
    const total = await queryBuilder.getCount();

    // Appliquer la pagination
    const skip = (page - 1) * pageSize;
    queryBuilder.skip(skip).take(pageSize);

    // Exécuter la requête
    const data = await queryBuilder.getMany();

    // Calculer les métadonnées de pagination
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

  async findOne(id: number): Promise<BlogPost> {
    const blogPost = await this.blogPostRepository.findOne({
      where: { id },
      relations: ['author'],
      select: {
        id: true,
        title: true,
        content: true,
        images: true,
        videoUrl: true,
        createdAt: true,
        updatedAt: true,
        authorId: true,
        author: {
          id: true,
          email: true,
        },
      },
    });
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
  ): Promise<BlogPost> {
    const blogPost = await this.findOne(id);
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
    return this.blogPostRepository.save(blogPost);
  }

  async remove(id: number): Promise<void> {
    const blogPost = await this.findOne(id);
    await this.blogPostRepository.remove(blogPost);
  }
}

