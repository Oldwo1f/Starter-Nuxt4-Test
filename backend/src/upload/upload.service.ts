import { Injectable, BadRequestException } from '@nestjs/common';
import { existsSync, mkdirSync, unlinkSync, writeFileSync } from 'fs';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';

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
}
