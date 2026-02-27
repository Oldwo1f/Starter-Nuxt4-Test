import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Course } from '../entities/course.entity';
import { AcademyModule } from '../entities/module.entity';
import { Video } from '../entities/video.entity';
import { CourseProgress } from '../entities/course-progress.entity';
import { UserRole } from '../entities/user.entity';

@Injectable()
export class AcademyService {
  constructor(
    @InjectRepository(Course)
    private courseRepository: Repository<Course>,
    @InjectRepository(AcademyModule)
    private moduleRepository: Repository<AcademyModule>,
    @InjectRepository(Video)
    private videoRepository: Repository<Video>,
    @InjectRepository(CourseProgress)
    private progressRepository: Repository<CourseProgress>,
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

  // Course methods
  async createCourse(
    title: string,
    description?: string,
    thumbnailImage?: string,
    isPublished: boolean = false,
    accessLevel: 'public' | 'member' | 'premium' | 'vip' = 'public',
    order: number = 0,
    instructorAvatar?: string,
    instructorFirstName?: string,
    instructorLastName?: string,
    instructorTitle?: string,
    instructorLink?: string,
  ): Promise<Course> {
    const course = this.courseRepository.create({
      title,
      description: description || null,
      thumbnailImage: thumbnailImage || null,
      isPublished,
      accessLevel,
      order,
      instructorAvatar: instructorAvatar || null,
      instructorFirstName: instructorFirstName || null,
      instructorLastName: instructorLastName || null,
      instructorTitle: instructorTitle || null,
      instructorLink: instructorLink || null,
    });
    return this.courseRepository.save(course);
  }

  async findAllCourses(userRole: UserRole | null = null, userId?: number): Promise<Course[]> {
    const queryBuilder = this.courseRepository.createQueryBuilder('course');
    
    queryBuilder.leftJoinAndSelect('course.modules', 'module');
    queryBuilder.leftJoinAndSelect('module.videos', 'video');
    
    queryBuilder.orderBy('course.order', 'ASC');
    queryBuilder.addOrderBy('module.order', 'ASC');
    queryBuilder.addOrderBy('video.order', 'ASC');

    // Retourner TOUS les cours (même ceux non accessibles)
    // Le filtrage se fera côté frontend pour afficher tous les cours avec cadenas si nécessaire

    const courses = await queryBuilder.getMany();

    // Add progress information if userId is provided
    if (userId) {
      for (const course of courses) {
        const progress = await this.getCourseProgress(userId, course.id);
        (course as any).progress = progress;
      }
    }

    return courses;
  }

  async findOneCourse(id: number, userRole: UserRole | null = null, userId?: number): Promise<Course> {
    const queryBuilder = this.courseRepository.createQueryBuilder('course');
    
    queryBuilder.leftJoinAndSelect('course.modules', 'module');
    queryBuilder.leftJoinAndSelect('module.videos', 'video');
    
    queryBuilder.where('course.id = :id', { id });
    
    queryBuilder.orderBy('module.order', 'ASC');
    queryBuilder.addOrderBy('video.order', 'ASC');

    const course = await queryBuilder.getOne();

    if (!course) {
      throw new NotFoundException(`Course with ID ${id} not found`);
    }

    // Vérifier l'accès au cours (mais retourner quand même le cours pour l'affichage)
    // Le frontend gérera l'affichage du cadenas si nécessaire

    // Add progress information if userId is provided
    if (userId) {
      const progress = await this.getCourseProgress(userId, course.id);
      (course as any).progress = progress;
    }

    return course;
  }

  async updateCourse(
    id: number,
    title?: string,
    description?: string,
    thumbnailImage?: string,
    isPublished?: boolean,
    accessLevel?: 'public' | 'member' | 'premium' | 'vip',
    order?: number,
    instructorAvatar?: string,
    instructorFirstName?: string,
    instructorLastName?: string,
    instructorTitle?: string,
    instructorLink?: string,
  ): Promise<Course> {
    const course = await this.courseRepository.findOne({ where: { id } });
    if (!course) {
      throw new NotFoundException(`Course with ID ${id} not found`);
    }

    if (title !== undefined) course.title = title;
    if (description !== undefined) course.description = description || null;
    if (thumbnailImage !== undefined) course.thumbnailImage = thumbnailImage || null;
    if (isPublished !== undefined) course.isPublished = isPublished;
    if (accessLevel !== undefined) course.accessLevel = accessLevel;
    if (order !== undefined) course.order = order;
    if (instructorAvatar !== undefined) course.instructorAvatar = instructorAvatar || null;
    if (instructorFirstName !== undefined) course.instructorFirstName = instructorFirstName || null;
    if (instructorLastName !== undefined) course.instructorLastName = instructorLastName || null;
    if (instructorTitle !== undefined) course.instructorTitle = instructorTitle || null;
    if (instructorLink !== undefined) course.instructorLink = instructorLink || null;

    return this.courseRepository.save(course);
  }

  async deleteCourse(id: number): Promise<void> {
    const course = await this.findOneCourse(id);
    await this.courseRepository.remove(course);
  }

  // Module methods
  async createModule(
    courseId: number,
    title: string,
    description?: string,
    order: number = 0,
  ): Promise<AcademyModule> {
    const course = await this.courseRepository.findOne({ where: { id: courseId } });
    if (!course) {
      throw new NotFoundException(`Course with ID ${courseId} not found`);
    }

    const module = this.moduleRepository.create({
      courseId,
      title,
      description: description || null,
      order,
    });
    return this.moduleRepository.save(module);
  }

  async findModule(id: number): Promise<AcademyModule> {
    const module = await this.moduleRepository.findOne({
      where: { id },
      relations: ['videos'],
    });
    if (!module) {
      throw new NotFoundException(`Module with ID ${id} not found`);
    }
    return module;
  }

  async updateModule(
    id: number,
    title?: string,
    description?: string,
    order?: number,
  ): Promise<AcademyModule> {
    const module = await this.moduleRepository.findOne({ where: { id } });
    if (!module) {
      throw new NotFoundException(`Module with ID ${id} not found`);
    }

    if (title !== undefined) module.title = title;
    if (description !== undefined) module.description = description || null;
    if (order !== undefined) module.order = order;

    return this.moduleRepository.save(module);
  }

  async deleteModule(id: number): Promise<void> {
    const module = await this.findModule(id);
    await this.moduleRepository.remove(module);
  }

  // Video methods
  async createVideo(
    moduleId: number,
    title: string,
    videoFile?: string | null,
    description?: string,
    duration?: number,
    order: number = 0,
    videoUrl?: string | null,
  ): Promise<Video> {
    const module = await this.moduleRepository.findOne({ where: { id: moduleId } });
    if (!module) {
      throw new NotFoundException(`Module with ID ${moduleId} not found`);
    }

    // Vérifier qu'au moins un des deux est fourni
    if (!videoFile && !videoUrl) {
      throw new BadRequestException('Either videoFile or videoUrl must be provided');
    }

    const video = this.videoRepository.create({
      moduleId,
      title,
      videoFile: videoFile || null,
      videoUrl: videoUrl || null,
      description: description || null,
      duration: duration || null,
      order,
    });
    return this.videoRepository.save(video);
  }

  async findVideo(id: number): Promise<Video> {
    const video = await this.videoRepository.findOne({
      where: { id },
      relations: ['academyModule', 'academyModule.course'],
    });
    if (!video) {
      throw new NotFoundException(`Video with ID ${id} not found`);
    }
    return video;
  }

  async updateVideo(
    id: number,
    title?: string,
    description?: string,
    videoFile?: string | null,
    duration?: number,
    order?: number,
    videoUrl?: string | null,
  ): Promise<Video> {
    const video = await this.videoRepository.findOne({ where: { id } });
    if (!video) {
      throw new NotFoundException(`Video with ID ${id} not found`);
    }

    if (title !== undefined) video.title = title;
    if (description !== undefined) video.description = description || null;
    if (videoFile !== undefined) video.videoFile = videoFile || null;
    if (videoUrl !== undefined) video.videoUrl = videoUrl || null;
    if (duration !== undefined) video.duration = duration || null;
    if (order !== undefined) video.order = order;

    // Vérifier qu'au moins un des deux est présent après mise à jour
    if (!video.videoFile && !video.videoUrl) {
      throw new BadRequestException('Either videoFile or videoUrl must be provided');
    }

    return this.videoRepository.save(video);
  }

  async deleteVideo(id: number): Promise<void> {
    const video = await this.findVideo(id);
    await this.videoRepository.remove(video);
  }

  // Progress methods
  async getCourseProgress(userId: number, courseId: number): Promise<CourseProgress | null> {
    let progress = await this.progressRepository.findOne({
      where: { userId, courseId },
    });

    if (!progress) {
      // Create initial progress record
      progress = this.progressRepository.create({
        userId,
        courseId,
        completedVideos: [],
        progressPercentage: 0,
      });
      await this.progressRepository.save(progress);
    }

    // Recalculate progress percentage
    const course = await this.courseRepository.findOne({
      where: { id: courseId },
      relations: ['modules', 'modules.videos'],
    });

    if (!course) {
      return progress;
    }

    const totalVideos = course.modules.reduce(
      (sum, module) => sum + module.videos.length,
      0,
    );

    if (totalVideos > 0) {
      progress.progressPercentage = (progress.completedVideos.length / totalVideos) * 100;
    } else {
      progress.progressPercentage = 0;
    }

    await this.progressRepository.save(progress);

    return progress;
  }

  async updateProgress(
    userId: number,
    courseId: number,
    videoId: number,
    lastVideoWatchedId?: number,
    markAsCompleted: boolean = false,
  ): Promise<CourseProgress> {
    let progress = await this.progressRepository.findOne({
      where: { userId, courseId },
    });

    if (!progress) {
      progress = this.progressRepository.create({
        userId,
        courseId,
        completedVideos: [],
        progressPercentage: 0,
      });
    }

    // Add video to completed list only if markAsCompleted is true
    if (markAsCompleted && !progress.completedVideos.includes(videoId)) {
      progress.completedVideos.push(videoId);
    }

    if (lastVideoWatchedId !== undefined) {
      progress.lastVideoWatchedId = lastVideoWatchedId;
    }

    // Recalculate progress percentage
    const course = await this.courseRepository.findOne({
      where: { id: courseId },
      relations: ['modules', 'modules.videos'],
    });

    if (course) {
      const totalVideos = course.modules.reduce(
        (sum, module) => sum + module.videos.length,
        0,
      );

      if (totalVideos > 0) {
        progress.progressPercentage = (progress.completedVideos.length / totalVideos) * 100;
      } else {
        progress.progressPercentage = 0;
      }
    }

    return this.progressRepository.save(progress);
  }

  async getTotalVideosInCourse(courseId: number): Promise<number> {
    const course = await this.courseRepository.findOne({
      where: { id: courseId },
      relations: ['modules', 'modules.videos'],
    });

    if (!course) {
      return 0;
    }

    return course.modules.reduce((sum, module) => sum + module.videos.length, 0);
  }
}
