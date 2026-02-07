import { Injectable, BadRequestException } from '@nestjs/common';
import { existsSync, mkdirSync, unlinkSync, writeFileSync } from 'fs';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';
import sharp from 'sharp';

@Injectable()
export class UploadService {
  private readonly uploadPath: string;
  private readonly maxFileSize: number;
  private readonly allowedMimeTypes: string[];

  constructor() {
    this.uploadPath = process.env.UPLOAD_DEST || 'uploads';
    this.maxFileSize = parseInt(process.env.MAX_FILE_SIZE || '5242880', 10); // 5MB par défaut
    this.allowedMimeTypes = (process.env.ALLOWED_MIME_TYPES || 'image/jpeg,image/png,image/webp').split(',');
    
    // Créer le dossier uploads s'il n'existe pas
    this.ensureUploadDirectory();
  }

  private ensureUploadDirectory() {
    const avatarsPath = join(this.uploadPath, 'avatars');
    if (!existsSync(avatarsPath)) {
      mkdirSync(avatarsPath, { recursive: true });
    }
    const partnersPath = join(this.uploadPath, 'partners');
    if (!existsSync(partnersPath)) {
      mkdirSync(partnersPath, { recursive: true });
    }
    const goodiesPath = join(this.uploadPath, 'goodies');
    if (!existsSync(goodiesPath)) {
      mkdirSync(goodiesPath, { recursive: true });
    }
  }

  validateFile(file: Express.Multer.File): void {
    if (!file) {
      throw new BadRequestException('Aucun fichier fourni');
    }

    // Vérifier le type MIME
    if (!this.allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        `Type de fichier non autorisé. Types autorisés: ${this.allowedMimeTypes.join(', ')}`,
      );
    }

    // Vérifier la taille
    if (file.size > this.maxFileSize) {
      throw new BadRequestException(
        `Fichier trop volumineux. Taille maximale: ${this.maxFileSize / 1024 / 1024}MB`,
      );
    }
  }

  generateFileName(originalName: string): string {
    const ext = originalName.split('.').pop();
    const timestamp = Date.now();
    const uuid = uuidv4();
    return `${timestamp}-${uuid}.${ext}`;
  }

  getAvatarPath(userId: number, filename: string): string {
    return join(this.uploadPath, 'avatars', userId.toString(), filename);
  }

  getAvatarUrl(userId: number, filename: string): string {
    return `/uploads/avatars/${userId}/${filename}`;
  }

  async saveAvatar(userId: number, file: Express.Multer.File): Promise<string> {
    // Créer le dossier pour l'utilisateur s'il n'existe pas
    const userDir = join(this.uploadPath, 'avatars', userId.toString());
    if (!existsSync(userDir)) {
      mkdirSync(userDir, { recursive: true });
    }

    // Générer un nom de fichier unique
    const filename = this.generateFileName(file.originalname);
    const filePath = this.getAvatarPath(userId, filename);

    // Sauvegarder le fichier
    writeFileSync(filePath, file.buffer);

    return this.getAvatarUrl(userId, filename);
  }

  async deleteAvatar(userId: number, filename: string): Promise<void> {
    const filePath = this.getAvatarPath(userId, filename);
    if (existsSync(filePath)) {
      unlinkSync(filePath);
    }
  }

  async deleteOldAvatar(avatarUrl: string | null): Promise<void> {
    if (!avatarUrl) return;

    // Extraire userId et filename de l'URL
    // Format attendu: /uploads/avatars/{userId}/{filename}
    const match = avatarUrl.match(/\/uploads\/avatars\/(\d+)\/(.+)$/);
    if (match) {
      const userId = parseInt(match[1], 10);
      const filename = match[2];
      await this.deleteAvatar(userId, filename);
    }
  }

  async getImageDimensions(file: Express.Multer.File): Promise<{ width: number; height: number }> {
    try {
      const metadata = await sharp(file.buffer).metadata();
      if (!metadata.width || !metadata.height) {
        throw new BadRequestException('Impossible de lire les dimensions de l\'image');
      }
      return { width: metadata.width, height: metadata.height };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Erreur lors de la lecture des dimensions de l\'image');
    }
  }

  async validateImageDimensions(
    file: Express.Multer.File,
    expectedWidth: number,
    expectedHeight: number,
  ): Promise<void> {
    const { width, height } = await this.getImageDimensions(file);
    if (width !== expectedWidth || height !== expectedHeight) {
      throw new BadRequestException(
        `Dimensions incorrectes. Attendu: ${expectedWidth}x${expectedHeight}, Reçu: ${width}x${height}`,
      );
    }
  }

  getPartnerBannerPath(partnerId: number, filename: string): string {
    return join(this.uploadPath, 'partners', partnerId.toString(), filename);
  }

  getPartnerBannerUrl(partnerId: number, filename: string): string {
    return `/uploads/partners/${partnerId}/${filename}`;
  }

  async savePartnerBanner(
    partnerId: number,
    file: Express.Multer.File,
    type: 'horizontal' | 'vertical',
  ): Promise<string> {
    // Valider le fichier
    this.validateFile(file);

    // Valider les dimensions selon le type
    if (type === 'horizontal') {
      await this.validateImageDimensions(file, 1080, 400);
    } else {
      await this.validateImageDimensions(file, 600, 1080);
    }

    // Créer le dossier pour le partenaire s'il n'existe pas
    const partnerDir = join(this.uploadPath, 'partners', partnerId.toString());
    if (!existsSync(partnerDir)) {
      mkdirSync(partnerDir, { recursive: true });
    }

    // Générer un nom de fichier unique
    const filename = this.generateFileName(file.originalname);
    const filePath = this.getPartnerBannerPath(partnerId, filename);

    // Sauvegarder le fichier
    writeFileSync(filePath, file.buffer);

    return this.getPartnerBannerUrl(partnerId, filename);
  }

  async deletePartnerBanner(partnerId: number, filename: string): Promise<void> {
    const filePath = this.getPartnerBannerPath(partnerId, filename);
    if (existsSync(filePath)) {
      unlinkSync(filePath);
    }
  }

  async deleteOldPartnerBanner(bannerUrl: string | null): Promise<void> {
    if (!bannerUrl) return;

    // Extraire partnerId et filename de l'URL
    // Format attendu: /uploads/partners/{partnerId}/{filename}
    const match = bannerUrl.match(/\/uploads\/partners\/(\d+)\/(.+)$/);
    if (match) {
      const partnerId = parseInt(match[1], 10);
      const filename = match[2];
      await this.deletePartnerBanner(partnerId, filename);
    }
  }

  getGoodieBannerPath(goodieId: number, filename: string): string {
    return join(this.uploadPath, 'goodies', goodieId.toString(), filename);
  }

  getGoodieBannerUrl(goodieId: number, filename: string): string {
    return `/uploads/goodies/${goodieId}/${filename}`;
  }

  async saveGoodieBanner(
    goodieId: number,
    file: Express.Multer.File,
    type: 'horizontal' | 'vertical',
  ): Promise<string> {
    // Valider le fichier
    this.validateFile(file);

    // Valider les dimensions selon le type
    if (type === 'horizontal') {
      await this.validateImageDimensions(file, 1080, 400);
    } else {
      await this.validateImageDimensions(file, 600, 1080);
    }

    // Créer le dossier pour le goodie s'il n'existe pas
    const goodieDir = join(this.uploadPath, 'goodies', goodieId.toString());
    if (!existsSync(goodieDir)) {
      mkdirSync(goodieDir, { recursive: true });
    }

    // Générer un nom de fichier unique
    const filename = this.generateFileName(file.originalname);
    const filePath = this.getGoodieBannerPath(goodieId, filename);

    // Sauvegarder le fichier
    writeFileSync(filePath, file.buffer);

    return this.getGoodieBannerUrl(goodieId, filename);
  }

  async deleteGoodieBanner(goodieId: number, filename: string): Promise<void> {
    const filePath = this.getGoodieBannerPath(goodieId, filename);
    if (existsSync(filePath)) {
      unlinkSync(filePath);
    }
  }

  async deleteOldGoodieBanner(bannerUrl: string | null): Promise<void> {
    if (!bannerUrl) return;

    // Extraire goodieId et filename de l'URL
    // Format attendu: /uploads/goodies/{goodieId}/{filename}
    const match = bannerUrl.match(/\/uploads\/goodies\/(\d+)\/(.+)$/);
    if (match) {
      const goodieId = parseInt(match[1], 10);
      const filename = match[2];
      await this.deleteGoodieBanner(goodieId, filename);
    }
  }

  getGoodieImagePath(goodieId: number, filename: string): string {
    return join(this.uploadPath, 'goodies', goodieId.toString(), filename);
  }

  getGoodieImageUrl(goodieId: number, filename: string): string {
    return `/uploads/goodies/${goodieId}/${filename}`;
  }

  async saveGoodieImage(
    goodieId: number,
    file: Express.Multer.File,
  ): Promise<string> {
    // Valider le fichier
    this.validateFile(file);

    // Valider que l'image est carrée (approximativement)
    const { width, height } = await this.getImageDimensions(file);
    const ratio = width / height;
    if (ratio < 0.9 || ratio > 1.1) {
      throw new BadRequestException(
        `L'image doit être carrée (ratio 1:1). Ratio actuel: ${width}x${height}`,
      );
    }

    // Créer le dossier pour le goodie s'il n'existe pas
    const goodieDir = join(this.uploadPath, 'goodies', goodieId.toString());
    if (!existsSync(goodieDir)) {
      mkdirSync(goodieDir, { recursive: true });
    }

    // Générer un nom de fichier unique
    const filename = this.generateFileName(file.originalname);
    const filePath = this.getGoodieImagePath(goodieId, filename);

    // Sauvegarder le fichier
    writeFileSync(filePath, file.buffer);

    return this.getGoodieImageUrl(goodieId, filename);
  }

  async deleteGoodieImage(goodieId: number, filename: string): Promise<void> {
    const filePath = this.getGoodieImagePath(goodieId, filename);
    if (existsSync(filePath)) {
      unlinkSync(filePath);
    }
  }

  async deleteOldGoodieImage(imageUrl: string | null): Promise<void> {
    if (!imageUrl) return;

    // Extraire goodieId et filename de l'URL
    // Format attendu: /uploads/goodies/{goodieId}/{filename}
    const match = imageUrl.match(/\/uploads\/goodies\/(\d+)\/(.+)$/);
    if (match) {
      const goodieId = parseInt(match[1], 10);
      const filename = match[2];
      await this.deleteGoodieImage(goodieId, filename);
    }
  }
}
