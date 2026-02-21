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
    const academyPath = join(this.uploadPath, 'academy');
    if (!existsSync(academyPath)) {
      mkdirSync(academyPath, { recursive: true });
    }
    const academyVideosPath = join(this.uploadPath, 'academy', 'videos');
    if (!existsSync(academyVideosPath)) {
      mkdirSync(academyVideosPath, { recursive: true });
    }
    const academyInstructorsPath = join(this.uploadPath, 'academy', 'instructors');
    if (!existsSync(academyInstructorsPath)) {
      mkdirSync(academyInstructorsPath, { recursive: true });
    }
    const academyThumbnailsPath = join(this.uploadPath, 'academy', 'thumbnails');
    if (!existsSync(academyThumbnailsPath)) {
      mkdirSync(academyThumbnailsPath, { recursive: true });
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

  // Goodie file methods (for zip, pdf, etc.)
  getGoodieFilePath(goodieId: number, filename: string): string {
    return join(this.uploadPath, 'goodies', goodieId.toString(), filename);
  }

  getGoodieFileUrl(goodieId: number, filename: string): string {
    return `/uploads/goodies/${goodieId}/${filename}`;
  }

  validateGoodieFile(file: Express.Multer.File): void {
    if (!file) {
      throw new BadRequestException('Aucun fichier fourni');
    }

    // Types MIME autorisés pour les fichiers de goodies (zip, pdf, etc.)
    const allowedMimeTypes = [
      'application/zip',
      'application/x-zip-compressed',
      'application/pdf',
      'application/x-pdf',
    ];

    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        `Type de fichier non autorisé. Types autorisés: ${allowedMimeTypes.join(', ')}`,
      );
    }

    // Taille maximale : 50MB par défaut pour les fichiers de goodies
    const maxFileSize = parseInt(process.env.MAX_GOODIE_FILE_SIZE || '52428800', 10); // 50MB
    if (file.size > maxFileSize) {
      throw new BadRequestException(
        `Fichier trop volumineux. Taille maximale: ${maxFileSize / 1024 / 1024}MB`,
      );
    }
  }

  async saveGoodieFile(
    goodieId: number,
    file: Express.Multer.File,
  ): Promise<string> {
    // Valider le fichier
    this.validateGoodieFile(file);

    // Créer le dossier pour le goodie s'il n'existe pas
    const goodieDir = join(this.uploadPath, 'goodies', goodieId.toString());
    if (!existsSync(goodieDir)) {
      mkdirSync(goodieDir, { recursive: true });
    }

    // Générer un nom de fichier unique
    const filename = this.generateFileName(file.originalname);
    const filePath = this.getGoodieFilePath(goodieId, filename);

    // Sauvegarder le fichier
    writeFileSync(filePath, file.buffer);

    return this.getGoodieFileUrl(goodieId, filename);
  }

  async deleteGoodieFile(goodieId: number, filename: string): Promise<void> {
    const filePath = this.getGoodieFilePath(goodieId, filename);
    if (existsSync(filePath)) {
      unlinkSync(filePath);
    }
  }

  async deleteOldGoodieFile(fileUrl: string | null): Promise<void> {
    if (!fileUrl) return;

    // Extraire goodieId et filename de l'URL
    // Format attendu: /uploads/goodies/{goodieId}/{filename}
    const match = fileUrl.match(/\/uploads\/goodies\/(\d+)\/(.+)$/);
    if (match) {
      const goodieId = parseInt(match[1], 10);
      const filename = match[2];
      await this.deleteGoodieFile(goodieId, filename);
    }
  }

  // Academy video methods
  validateVideoFile(file: Express.Multer.File): void {
    if (!file) {
      throw new BadRequestException('Aucun fichier fourni');
    }

    // Allowed video MIME types
    const allowedVideoTypes = [
      'video/mp4',
      'video/webm',
      'video/ogg',
      'video/quicktime',
    ];

    if (!allowedVideoTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        `Type de fichier vidéo non autorisé. Types autorisés: ${allowedVideoTypes.join(', ')}`,
      );
    }

    // Max video size (bytes). 0 or unset = unlimited at app-level (still limited by infra/disk).
    const maxVideoSize = parseInt(process.env.MAX_VIDEO_FILE_SIZE || '0', 10);
    if (maxVideoSize > 0 && file.size > maxVideoSize) {
      throw new BadRequestException(
        `Fichier vidéo trop volumineux. Taille maximale: ${maxVideoSize / 1024 / 1024}MB`,
      );
    }
  }

  getVideoPath(filename: string): string {
    return join(this.uploadPath, 'academy', 'videos', filename);
  }

  getVideoUrl(filename: string): string {
    return `/uploads/academy/videos/${filename}`;
  }

  async saveVideo(file: Express.Multer.File): Promise<string> {
    // Validate video file
    this.validateVideoFile(file);

    // Generate unique filename
    const filename = this.generateFileName(file.originalname);
    const filePath = this.getVideoPath(filename);

    // Save the file
    writeFileSync(filePath, file.buffer);

    return this.getVideoUrl(filename);
  }

  async deleteVideo(videoUrl: string | null): Promise<void> {
    if (!videoUrl) return;

    // Extract filename from URL
    // Expected format: /uploads/academy/videos/{filename}
    const match = videoUrl.match(/\/uploads\/academy\/videos\/(.+)$/);
    if (match) {
      const filename = match[1];
      const filePath = this.getVideoPath(filename);
      if (existsSync(filePath)) {
        unlinkSync(filePath);
      }
    }
  }

  // Academy instructor avatar methods
  getInstructorAvatarPath(courseId: number, filename: string): string {
    return join(this.uploadPath, 'academy', 'instructors', courseId.toString(), filename);
  }

  getInstructorAvatarUrl(courseId: number, filename: string): string {
    return `/uploads/academy/instructors/${courseId}/${filename}`;
  }

  async saveInstructorAvatar(
    courseId: number,
    file: Express.Multer.File,
  ): Promise<string> {
    // Validate file
    this.validateFile(file);

    // Validate dimensions: 300x300px
    await this.validateImageDimensions(file, 300, 300);

    // Create directory for course if it doesn't exist
    const courseDir = join(this.uploadPath, 'academy', 'instructors', courseId.toString());
    if (!existsSync(courseDir)) {
      mkdirSync(courseDir, { recursive: true });
    }

    // Generate unique filename
    const filename = this.generateFileName(file.originalname);
    const filePath = this.getInstructorAvatarPath(courseId, filename);

    // Save the file
    writeFileSync(filePath, file.buffer);

    return this.getInstructorAvatarUrl(courseId, filename);
  }

  async deleteInstructorAvatar(courseId: number, filename: string): Promise<void> {
    const filePath = this.getInstructorAvatarPath(courseId, filename);
    if (existsSync(filePath)) {
      unlinkSync(filePath);
    }
  }

  async deleteOldInstructorAvatar(avatarUrl: string | null): Promise<void> {
    if (!avatarUrl) return;

    // Extract courseId and filename from URL
    // Expected format: /uploads/academy/instructors/{courseId}/{filename}
    const match = avatarUrl.match(/\/uploads\/academy\/instructors\/(\d+)\/(.+)$/);
    if (match) {
      const courseId = parseInt(match[1], 10);
      const filename = match[2];
      await this.deleteInstructorAvatar(courseId, filename);
    }
  }

  // Academy course thumbnail methods
  getCourseThumbnailPath(courseId: number, filename: string): string {
    return join(this.uploadPath, 'academy', 'thumbnails', courseId.toString(), filename);
  }

  getCourseThumbnailUrl(courseId: number, filename: string): string {
    return `/uploads/academy/thumbnails/${courseId}/${filename}`;
  }

  async saveCourseThumbnail(
    courseId: number,
    file: Express.Multer.File,
  ): Promise<string> {
    // Validate file
    this.validateFile(file);

    // Validate dimensions: 4/3 ratio
    const { width, height } = await this.getImageDimensions(file);
    const ratio = width / height;
    const targetRatio = 4 / 3;
    const tolerance = 0.1; // 10% tolerance
    
    if (Math.abs(ratio - targetRatio) > tolerance) {
      throw new BadRequestException(
        `L'image doit avoir un ratio 4/3. Ratio actuel: ${width}x${height} (${ratio.toFixed(2)})`,
      );
    }

    // Create directory for course if it doesn't exist
    const courseDir = join(this.uploadPath, 'academy', 'thumbnails', courseId.toString());
    if (!existsSync(courseDir)) {
      mkdirSync(courseDir, { recursive: true });
    }

    // Generate unique filename
    const filename = this.generateFileName(file.originalname);
    const filePath = this.getCourseThumbnailPath(courseId, filename);

    // Save the file
    writeFileSync(filePath, file.buffer);

    return this.getCourseThumbnailUrl(courseId, filename);
  }

  async deleteCourseThumbnail(courseId: number, filename: string): Promise<void> {
    const filePath = this.getCourseThumbnailPath(courseId, filename);
    if (existsSync(filePath)) {
      unlinkSync(filePath);
    }
  }

  async deleteOldCourseThumbnail(thumbnailUrl: string | null): Promise<void> {
    if (!thumbnailUrl) return;

    // Extract courseId and filename from URL
    // Expected format: /uploads/academy/thumbnails/{courseId}/{filename}
    const match = thumbnailUrl.match(/\/uploads\/academy\/thumbnails\/(\d+)\/(.+)$/);
    if (match) {
      const courseId = parseInt(match[1], 10);
      const filename = match[2];
      await this.deleteCourseThumbnail(courseId, filename);
    }
  }
}
