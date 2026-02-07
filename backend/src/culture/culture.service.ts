import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Culture, CultureType } from '../entities/culture.entity';

@Injectable()
export class CultureService {
  constructor(
    @InjectRepository(Culture)
    private cultureRepository: Repository<Culture>,
  ) {}

  async create(
    title: string,
    type: CultureType,
    youtubeUrl: string,
    director?: string,
    isPublic: boolean = true,
    createdById?: number,
  ): Promise<Culture> {
    const culture = this.cultureRepository.create({
      title,
      type,
      youtubeUrl,
      director: director || null,
      isPublic,
      createdById: createdById || null,
    });
    return this.cultureRepository.save(culture);
  }

  async findAll(isAuthenticated: boolean = false): Promise<Culture[]> {
    const queryBuilder = this.cultureRepository.createQueryBuilder('culture');

    // Joindre le créateur
    queryBuilder.leftJoinAndSelect('culture.createdBy', 'createdBy');

    // Sélectionner uniquement les champs nécessaires du créateur
    queryBuilder.select([
      'culture.id',
      'culture.title',
      'culture.type',
      'culture.youtubeUrl',
      'culture.director',
      'culture.isPublic',
      'culture.createdAt',
      'culture.updatedAt',
      'createdBy.id',
      'createdBy.email',
    ]);

    // Si l'utilisateur n'est pas authentifié, ne montrer que les vidéos publiques
    if (!isAuthenticated) {
      queryBuilder.andWhere('culture.isPublic = :isPublic', { isPublic: true });
    }

    queryBuilder.orderBy('culture.createdAt', 'DESC');

    return queryBuilder.getMany();
  }

  async findByType(
    type: CultureType,
    isAuthenticated: boolean = false,
  ): Promise<Culture[]> {
    const queryBuilder = this.cultureRepository.createQueryBuilder('culture');

    queryBuilder.leftJoinAndSelect('culture.createdBy', 'createdBy');
    queryBuilder.select([
      'culture.id',
      'culture.title',
      'culture.type',
      'culture.youtubeUrl',
      'culture.director',
      'culture.isPublic',
      'culture.createdAt',
      'culture.updatedAt',
      'createdBy.id',
      'createdBy.email',
    ]);

    queryBuilder.where('culture.type = :type', { type });

    // Si l'utilisateur n'est pas authentifié, ne montrer que les vidéos publiques
    if (!isAuthenticated) {
      queryBuilder.andWhere('culture.isPublic = :isPublic', { isPublic: true });
    }

    queryBuilder.orderBy('culture.createdAt', 'DESC');

    return queryBuilder.getMany();
  }

  async findOne(id: number, isAuthenticated: boolean = false): Promise<Culture> {
    const queryBuilder = this.cultureRepository.createQueryBuilder('culture');

    queryBuilder.leftJoinAndSelect('culture.createdBy', 'createdBy');
    queryBuilder.select([
      'culture.id',
      'culture.title',
      'culture.type',
      'culture.youtubeUrl',
      'culture.director',
      'culture.isPublic',
      'culture.createdAt',
      'culture.updatedAt',
      'createdBy.id',
      'createdBy.email',
    ]);

    queryBuilder.where('culture.id = :id', { id });

    // Si l'utilisateur n'est pas authentifié, vérifier que la vidéo est publique
    if (!isAuthenticated) {
      queryBuilder.andWhere('culture.isPublic = :isPublic', { isPublic: true });
    }

    const culture = await queryBuilder.getOne();

    if (!culture) {
      throw new NotFoundException(`Culture video with ID ${id} not found`);
    }

    return culture;
  }

  async update(
    id: number,
    title?: string,
    type?: CultureType,
    youtubeUrl?: string,
    director?: string,
    isPublic?: boolean,
  ): Promise<Culture> {
    const culture = await this.cultureRepository.findOne({ where: { id } });
    if (!culture) {
      throw new NotFoundException(`Culture video with ID ${id} not found`);
    }

    if (title !== undefined) {
      culture.title = title;
    }
    if (type !== undefined) {
      culture.type = type;
    }
    if (youtubeUrl !== undefined) {
      culture.youtubeUrl = youtubeUrl;
    }
    if (director !== undefined) {
      culture.director = director || null;
    }
    if (isPublic !== undefined) {
      culture.isPublic = isPublic;
    }

    return this.cultureRepository.save(culture);
  }

  async remove(id: number): Promise<void> {
    const culture = await this.findOne(id, true); // Admin peut toujours voir

    await this.cultureRepository.remove(culture);
  }
}
