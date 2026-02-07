import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Goodie } from '../entities/goodie.entity';
import { UploadService } from '../upload/upload.service';

@Injectable()
export class GoodiesService {
  constructor(
    @InjectRepository(Goodie)
    private goodieRepository: Repository<Goodie>,
    private uploadService: UploadService,
  ) {}

  async create(
    name: string,
    link?: string,
    description?: string,
    imageUrl?: string,
    offeredByName?: string,
    offeredByLink?: string,
    isPublic: boolean = true,
    createdById?: number,
  ): Promise<Goodie> {
    const goodie = this.goodieRepository.create({
      name,
      link: link || null,
      description: description || null,
      imageUrl: imageUrl || null,
      offeredByName: offeredByName || null,
      offeredByLink: offeredByLink || null,
      isPublic,
      createdById: createdById || null,
    });
    return this.goodieRepository.save(goodie);
  }

  async findAll(isAuthenticated: boolean = false): Promise<Goodie[]> {
    try {
      const queryBuilder = this.goodieRepository.createQueryBuilder('goodie');
      
      // Joindre le créateur de manière optionnelle
      queryBuilder.leftJoinAndSelect('goodie.createdBy', 'createdBy');
      
      // Si l'utilisateur n'est pas authentifié, ne montrer que les goodies publics
      if (!isAuthenticated) {
        queryBuilder.where('goodie.isPublic = :isPublic', { isPublic: true });
      }
      
      queryBuilder.orderBy('goodie.createdAt', 'DESC');
      
      const goodies = await queryBuilder.getMany();

      // Filtrer les données du créateur pour ne garder que id et email
      return goodies.map((goodie) => {
        if (goodie.createdBy) {
          goodie.createdBy = {
            id: goodie.createdBy.id,
            email: goodie.createdBy.email,
          } as any;
        }
        return goodie;
      });
    } catch (error) {
      console.error('Error in GoodiesService.findAll():', error);
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name,
      });
      throw error;
    }
  }

  async findOne(id: number, isAuthenticated: boolean = false): Promise<Goodie> {
    try {
      const queryBuilder = this.goodieRepository.createQueryBuilder('goodie');
      
      queryBuilder.leftJoinAndSelect('goodie.createdBy', 'createdBy');
      queryBuilder.where('goodie.id = :id', { id });
      
      // Si l'utilisateur n'est pas authentifié, vérifier que le goodie est public
      if (!isAuthenticated) {
        queryBuilder.andWhere('goodie.isPublic = :isPublic', { isPublic: true });
      }

      const goodie = await queryBuilder.getOne();

      if (!goodie) {
        throw new NotFoundException(`Goodie with ID ${id} not found`);
      }

      // Filtrer les données du créateur pour ne garder que id et email
      if (goodie.createdBy) {
        goodie.createdBy = {
          id: goodie.createdBy.id,
          email: goodie.createdBy.email,
        } as any;
      }

      return goodie;
    } catch (error) {
      console.error('Error in GoodiesService.findOne():', error);
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name,
        id,
        isAuthenticated,
      });
      throw error;
    }
  }

  async update(
    id: number,
    name?: string,
    link?: string,
    description?: string,
    imageUrl?: string | null,
    offeredByName?: string,
    offeredByLink?: string,
    isPublic?: boolean,
  ): Promise<Goodie> {
    const goodie = await this.goodieRepository.findOne({ where: { id } });
    if (!goodie) {
      throw new NotFoundException(`Goodie with ID ${id} not found`);
    }

    if (name !== undefined) {
      goodie.name = name;
    }
    if (link !== undefined) {
      goodie.link = link || null;
    }
    if (description !== undefined) {
      goodie.description = description || null;
    }
    if (imageUrl !== undefined) {
      // Supprimer l'ancienne image si elle existe
      if (goodie.imageUrl && goodie.imageUrl !== imageUrl) {
        await this.uploadService.deleteOldGoodieImage(goodie.imageUrl);
      }
      goodie.imageUrl = imageUrl || null;
    }
    if (offeredByName !== undefined) {
      goodie.offeredByName = offeredByName || null;
    }
    if (offeredByLink !== undefined) {
      goodie.offeredByLink = offeredByLink || null;
    }
    if (isPublic !== undefined) {
      goodie.isPublic = isPublic;
    }

    return this.goodieRepository.save(goodie);
  }

  async remove(id: number): Promise<void> {
    const goodie = await this.findOne(id, true); // Admin peut toujours voir

    // Supprimer l'image
    if (goodie.imageUrl) {
      await this.uploadService.deleteOldGoodieImage(goodie.imageUrl);
    }

    await this.goodieRepository.remove(goodie);
  }
}
