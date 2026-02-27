import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Goodie } from '../entities/goodie.entity';
import { UploadService } from '../upload/upload.service';
import { UserRole } from '../entities/user.entity';

@Injectable()
export class GoodiesService {
  constructor(
    @InjectRepository(Goodie)
    private goodieRepository: Repository<Goodie>,
    private uploadService: UploadService,
  ) {}

  /**
   * Vérifie si un rôle utilisateur a accès à un niveau donné
   * Hiérarchie: public < member < premium < vip
   */
  private hasAccessToLevel(userRole: UserRole | null, requiredLevel: 'public' | 'member' | 'premium' | 'vip'): boolean {
    // Public est accessible à tous
    if (requiredLevel === 'public') {
      return true;
    }

    // Si l'utilisateur n'est pas connecté, seul public est accessible
    if (!userRole) {
      return false;
    }

    // Les staff (admin, superadmin, moderator) ont accès à tout
    if ([UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.MODERATOR].includes(userRole)) {
      return true;
    }

    // Hiérarchie des niveaux d'accès
    const levelHierarchy: Record<'public' | 'member' | 'premium' | 'vip', number> = {
      public: 0,
      member: 1,
      premium: 2,
      vip: 3,
    };

    // Mapping des rôles utilisateur vers leurs niveaux
    const roleToLevel: Record<UserRole, number> = {
      [UserRole.USER]: 0, // user = public
      [UserRole.MEMBER]: 1,
      [UserRole.PREMIUM]: 2,
      [UserRole.VIP]: 3,
      [UserRole.ADMIN]: 999, // admin a accès à tout
      [UserRole.SUPERADMIN]: 999,
      [UserRole.MODERATOR]: 999,
    };

    const userLevel = roleToLevel[userRole] || 0;
    const requiredLevelValue = levelHierarchy[requiredLevel];

    return userLevel >= requiredLevelValue;
  }

  async create(
    name: string,
    link?: string,
    description?: string,
    imageUrl?: string,
    fileUrl?: string,
    offeredByName?: string,
    offeredByLink?: string,
    accessLevel: 'public' | 'member' | 'premium' | 'vip' = 'public',
    createdById?: number,
  ): Promise<Goodie> {
    const goodie = this.goodieRepository.create({
      name,
      link: link || null,
      description: description || null,
      imageUrl: imageUrl || null,
      fileUrl: fileUrl || null,
      offeredByName: offeredByName || null,
      offeredByLink: offeredByLink || null,
      accessLevel,
      createdById: createdById || null,
    });
    return this.goodieRepository.save(goodie);
  }

  async findAll(userRole: UserRole | null = null): Promise<Goodie[]> {
    try {
      const queryBuilder = this.goodieRepository.createQueryBuilder('goodie');
      
      // Joindre le créateur de manière optionnelle
      queryBuilder.leftJoinAndSelect('goodie.createdBy', 'createdBy');
      
      // Retourner TOUS les goodies (même ceux non accessibles)
      // Le filtrage se fera côté frontend pour afficher tous les goodies avec cadenas si nécessaire
      
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

  async findOne(id: number, userRole: UserRole | null = null): Promise<Goodie> {
    try {
      const queryBuilder = this.goodieRepository.createQueryBuilder('goodie');
      
      queryBuilder.leftJoinAndSelect('goodie.createdBy', 'createdBy');
      queryBuilder.where('goodie.id = :id', { id });

      const goodie = await queryBuilder.getOne();

      if (!goodie) {
        throw new NotFoundException(`Goodie with ID ${id} not found`);
      }

      // Vérifier l'accès au goodie
      if (!this.hasAccessToLevel(userRole, goodie.accessLevel)) {
        throw new ForbiddenException(`You don't have access to this goodie. Required level: ${goodie.accessLevel}`);
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
        userRole,
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
    fileUrl?: string | null,
    offeredByName?: string,
    offeredByLink?: string,
    accessLevel?: 'public' | 'member' | 'premium' | 'vip',
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
    if (fileUrl !== undefined) {
      // Supprimer l'ancien fichier si il existe
      if (goodie.fileUrl && goodie.fileUrl !== fileUrl) {
        await this.uploadService.deleteOldGoodieFile(goodie.fileUrl);
      }
      goodie.fileUrl = fileUrl || null;
    }
    if (offeredByName !== undefined) {
      goodie.offeredByName = offeredByName || null;
    }
    if (offeredByLink !== undefined) {
      goodie.offeredByLink = offeredByLink || null;
    }
    if (accessLevel !== undefined) {
      goodie.accessLevel = accessLevel;
    }

    return this.goodieRepository.save(goodie);
  }

  async remove(id: number): Promise<void> {
    const goodie = await this.findOne(id, UserRole.ADMIN); // Admin peut toujours voir

    // Supprimer l'image
    if (goodie.imageUrl) {
      await this.uploadService.deleteOldGoodieImage(goodie.imageUrl);
    }

    // Supprimer le fichier
    if (goodie.fileUrl) {
      await this.uploadService.deleteOldGoodieFile(goodie.fileUrl);
    }

    await this.goodieRepository.remove(goodie);
  }
}
