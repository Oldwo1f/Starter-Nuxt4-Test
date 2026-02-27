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
  ParseIntPipe,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Res,
  Header,
} from '@nestjs/common';
import type { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { join } from 'path';
import { existsSync, mkdirSync, statSync, createReadStream } from 'fs';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiParam,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AcademyService } from './academy.service';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { CreateModuleDto } from './dto/create-module.dto';
import { UpdateModuleDto } from './dto/update-module.dto';
import { CreateVideoDto } from './dto/create-video.dto';
import { UpdateVideoDto } from './dto/update-video.dto';
import { UpdateProgressDto } from './dto/update-progress.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { UserRole } from '../entities/user.entity';
import { UploadService } from '../upload/upload.service';

const UPLOAD_DEST = process.env.UPLOAD_DEST || 'uploads';
const ACADEMY_VIDEOS_DIR = join(UPLOAD_DEST, 'academy', 'videos');
const MAX_VIDEO_FILE_SIZE = parseInt(process.env.MAX_VIDEO_FILE_SIZE || '0', 10); // bytes, 0 = unlimited
const generateVideoFileName = (originalName: string) => {
  const ext = originalName.split('.').pop();
  const timestamp = Date.now();
  const rand = Math.random().toString(16).slice(2);
  return `${timestamp}-${rand}.${ext || 'mp4'}`;
};

@ApiTags('academy')
@Controller('academy')
export class AcademyController {
  constructor(
    private readonly academyService: AcademyService,
    private readonly uploadService: UploadService,
  ) {}

  // Public routes (authenticated users only)
  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get all courses',
    description: 'Retrieve all courses. Courses are filtered based on user access level (public, member, premium, vip).',
  })
  @ApiResponse({ status: 200, description: 'List of courses retrieved successfully' })
  async findAll(@Request() req) {
    const userRole = req.user?.role || null;
    const userId = req.user?.id;
    return this.academyService.findAllCourses(userRole, userId);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get course by ID',
    description: 'Retrieve a specific course with all modules and videos. Access is controlled by user role.',
  })
  @ApiParam({ name: 'id', description: 'Course ID', type: 'number' })
  @ApiResponse({ status: 200, description: 'Course retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Course not found' })
  async findOne(@Param('id', ParseIntPipe) id: number, @Request() req) {
    const userRole = req.user?.role || null;
    const userId = req.user?.id;
    return this.academyService.findOneCourse(id, userRole, userId);
  }

  @Get(':id/progress')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get course progress',
    description: 'Get the progress of the authenticated user for a specific course',
  })
  @ApiParam({ name: 'id', description: 'Course ID', type: 'number' })
  @ApiResponse({ status: 200, description: 'Progress retrieved successfully' })
  async getProgress(@Param('id', ParseIntPipe) id: number, @Request() req) {
    const userId = req.user?.id;
    if (!userId) {
      throw new Error('User not authenticated');
    }
    return this.academyService.getCourseProgress(userId, id);
  }

  @Post(':id/progress')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Update course progress',
    description: 'Mark a video as completed and update progress',
  })
  @ApiParam({ name: 'id', description: 'Course ID', type: 'number' })
  @ApiBody({ type: UpdateProgressDto })
  @ApiResponse({ status: 200, description: 'Progress updated successfully' })
  async updateProgress(
    @Param('id', ParseIntPipe) courseId: number,
    @Body() updateProgressDto: UpdateProgressDto,
    @Request() req,
  ) {
    const userId = req.user?.id;
    if (!userId) {
      throw new Error('User not authenticated');
    }
    return this.academyService.updateProgress(
      userId,
      courseId,
      updateProgressDto.videoId,
      updateProgressDto.lastVideoWatchedId,
      updateProgressDto.markAsCompleted ?? false,
    );
  }

  // Admin routes - Courses
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Create a new course',
    description: 'Create a new course (admin only)',
  })
  @ApiBody({ type: CreateCourseDto })
  @ApiResponse({ status: 201, description: 'Course successfully created' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
  async createCourse(@Body() createCourseDto: CreateCourseDto) {
    return this.academyService.createCourse(
      createCourseDto.title,
      createCourseDto.description,
      createCourseDto.thumbnailImage,
      createCourseDto.isPublished ?? false,
      createCourseDto.accessLevel || 'public',
      createCourseDto.order ?? 0,
      createCourseDto.instructorAvatar,
      createCourseDto.instructorFirstName,
      createCourseDto.instructorLastName,
      createCourseDto.instructorTitle,
      createCourseDto.instructorLink,
    );
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Update a course',
    description: 'Update an existing course (admin only)',
  })
  @ApiParam({ name: 'id', description: 'Course ID', type: 'number' })
  @ApiBody({ type: UpdateCourseDto })
  @ApiResponse({ status: 200, description: 'Course successfully updated' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
  @ApiResponse({ status: 404, description: 'Course not found' })
  async updateCourse(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateCourseDto: UpdateCourseDto,
  ) {
    return this.academyService.updateCourse(
      id,
      updateCourseDto.title,
      updateCourseDto.description,
      updateCourseDto.thumbnailImage,
      updateCourseDto.isPublished,
      updateCourseDto.accessLevel,
      updateCourseDto.order,
      updateCourseDto.instructorAvatar,
      updateCourseDto.instructorFirstName,
      updateCourseDto.instructorLastName,
      updateCourseDto.instructorTitle,
      updateCourseDto.instructorLink,
    );
  }

  @Post(':id/instructor-avatar')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  @ApiBearerAuth('JWT-auth')
  @UseInterceptors(FileInterceptor('avatar'))
  @ApiOperation({
    summary: 'Upload instructor avatar',
    description: 'Upload instructor avatar (300x300px) for a course (admin only)',
  })
  @ApiParam({ name: 'id', description: 'Course ID', type: 'number' })
  @ApiResponse({ status: 201, description: 'Instructor avatar uploaded successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
  async uploadInstructorAvatar(
    @Param('id', ParseIntPipe) courseId: number,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('Aucun fichier fourni');
    }
    const avatarUrl = await this.uploadService.saveInstructorAvatar(courseId, file);
    return { instructorAvatar: avatarUrl };
  }

  @Post(':id/thumbnail')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  @ApiBearerAuth('JWT-auth')
  @UseInterceptors(FileInterceptor('image'))
  @ApiOperation({
    summary: 'Upload course thumbnail',
    description: 'Upload course thumbnail image (4/3 ratio) for a course (admin only)',
  })
  @ApiParam({ name: 'id', description: 'Course ID', type: 'number' })
  @ApiResponse({ status: 201, description: 'Course thumbnail uploaded successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
  async uploadCourseThumbnail(
    @Param('id', ParseIntPipe) courseId: number,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('Aucun fichier fourni');
    }
    const thumbnailUrl = await this.uploadService.saveCourseThumbnail(courseId, file);
    return { thumbnailImage: thumbnailUrl };
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Delete a course',
    description: 'Delete a course by ID (admin only)',
  })
  @ApiParam({ name: 'id', description: 'Course ID', type: 'number' })
  @ApiResponse({ status: 200, description: 'Course successfully deleted' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
  @ApiResponse({ status: 404, description: 'Course not found' })
  async deleteCourse(@Param('id', ParseIntPipe) id: number) {
    await this.academyService.deleteCourse(id);
    return { message: 'Course deleted successfully' };
  }

  // Admin routes - Modules
  @Post('modules')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Create a new module',
    description: 'Create a new module for a course (admin only)',
  })
  @ApiBody({ type: CreateModuleDto })
  @ApiResponse({ status: 201, description: 'Module successfully created' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
  async createModule(@Body() createModuleDto: CreateModuleDto) {
    return this.academyService.createModule(
      createModuleDto.courseId,
      createModuleDto.title,
      createModuleDto.description,
      createModuleDto.order ?? 0,
    );
  }

  @Patch('modules/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Update a module',
    description: 'Update an existing module (admin only)',
  })
  @ApiParam({ name: 'id', description: 'Module ID', type: 'number' })
  @ApiBody({ type: UpdateModuleDto })
  @ApiResponse({ status: 200, description: 'Module successfully updated' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
  @ApiResponse({ status: 404, description: 'Module not found' })
  async updateModule(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateModuleDto: UpdateModuleDto,
  ) {
    return this.academyService.updateModule(
      id,
      updateModuleDto.title,
      updateModuleDto.description,
      updateModuleDto.order,
    );
  }

  @Delete('modules/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Delete a module',
    description: 'Delete a module by ID (admin only)',
  })
  @ApiParam({ name: 'id', description: 'Module ID', type: 'number' })
  @ApiResponse({ status: 200, description: 'Module successfully deleted' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
  @ApiResponse({ status: 404, description: 'Module not found' })
  async deleteModule(@Param('id', ParseIntPipe) id: number) {
    await this.academyService.deleteModule(id);
    return { message: 'Module deleted successfully' };
  }

  // Admin routes - Videos
  @Post('videos')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Create a new video',
    description: 'Create a new video for a module (admin only)',
  })
  @ApiBody({ type: CreateVideoDto })
  @ApiResponse({ status: 201, description: 'Video successfully created' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
  async createVideo(@Body() createVideoDto: CreateVideoDto) {
    return this.academyService.createVideo(
      createVideoDto.moduleId,
      createVideoDto.title,
      createVideoDto.videoFile,
      createVideoDto.description,
      createVideoDto.duration,
      createVideoDto.order ?? 0,
      createVideoDto.videoUrl,
    );
  }

  @Post('videos/upload')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  @ApiBearerAuth('JWT-auth')
  @UseInterceptors(
    FileInterceptor('video', {
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          // Ensure destination directory exists (UploadService also does this on startup)
          if (!existsSync(ACADEMY_VIDEOS_DIR)) {
            mkdirSync(ACADEMY_VIDEOS_DIR, { recursive: true });
          }
          cb(null, ACADEMY_VIDEOS_DIR);
        },
        filename: (_req, file, cb) => {
          const filename = generateVideoFileName(file.originalname);
          cb(null, filename);
        },
      }),
      fileFilter: (_req, file, cb) => {
        const allowedVideoTypes = [
          'video/mp4',
          'video/webm',
          'video/ogg',
          'video/quicktime',
        ];
        if (!allowedVideoTypes.includes(file.mimetype)) {
          return cb(
            new BadRequestException(
              `Type de fichier vidéo non autorisé. Types autorisés: ${allowedVideoTypes.join(', ')}`,
            ) as any,
            false,
          );
        }
        cb(null, true);
      },
      limits: MAX_VIDEO_FILE_SIZE > 0 ? { fileSize: MAX_VIDEO_FILE_SIZE } : undefined,
    }),
  )
  @ApiOperation({
    summary: 'Upload a video file',
    description: 'Upload a video file and return the file URL (admin only)',
  })
  @ApiResponse({ status: 201, description: 'Video file uploaded successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
  async uploadVideo(@UploadedFile() file: Express.Multer.File, @Request() req) {
    if (!file) {
      throw new BadRequestException('Aucun fichier fourni');
    }
    // File is already saved to disk by Multer (diskStorage)
    // Return the public URL served by Nest static assets (/uploads prefix)
    if (!file.filename) {
      throw new BadRequestException('Upload invalide: nom de fichier manquant');
    }
    return { videoFile: this.uploadService.getVideoUrl(file.filename) };
  }

  @Patch('videos/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Update a video',
    description: 'Update an existing video (admin only)',
  })
  @ApiParam({ name: 'id', description: 'Video ID', type: 'number' })
  @ApiBody({ type: UpdateVideoDto })
  @ApiResponse({ status: 200, description: 'Video successfully updated' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
  @ApiResponse({ status: 404, description: 'Video not found' })
  async updateVideo(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateVideoDto: UpdateVideoDto,
  ) {
    return this.academyService.updateVideo(
      id,
      updateVideoDto.title,
      updateVideoDto.description,
      updateVideoDto.videoFile,
      updateVideoDto.duration,
      updateVideoDto.order,
      updateVideoDto.videoUrl,
    );
  }

  @Delete('videos/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Delete a video',
    description: 'Delete a video by ID (admin only)',
  })
  @ApiParam({ name: 'id', description: 'Video ID', type: 'number' })
  @ApiResponse({ status: 200, description: 'Video successfully deleted' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
  @ApiResponse({ status: 404, description: 'Video not found' })
  async deleteVideo(@Param('id', ParseIntPipe) id: number) {
    await this.academyService.deleteVideo(id);
    return { message: 'Video deleted successfully' };
  }

  // Serve video file with proper Range support for streaming
  @Get('videos/stream/:filename')
  @ApiOperation({
    summary: 'Stream video file',
    description: 'Stream a video file with Range request support',
  })
  @ApiParam({ name: 'filename', description: 'Video filename', type: 'string' })
  @ApiResponse({ status: 200, description: 'Video stream' })
  @ApiResponse({ status: 404, description: 'Video not found' })
  async streamVideo(
    @Param('filename') filename: string,
    @Request() req: Request,
    @Res() res: Response,
  ) {
    const filePath = join(ACADEMY_VIDEOS_DIR, filename);
    
    if (!existsSync(filePath)) {
      throw new BadRequestException('Video file not found');
    }

    const stat = statSync(filePath);
    const fileSize = stat.size;
    const range = req.headers['range'] as string | undefined;

    // Get MIME type
    const ext = filename.toLowerCase().split('.').pop();
    const mimeTypes: Record<string, string> = {
      mp4: 'video/mp4',
      webm: 'video/webm',
      ogg: 'video/ogg',
      ogv: 'video/ogg',
      mov: 'video/quicktime',
      avi: 'video/x-msvideo',
      mkv: 'video/x-matroska',
    };
    const contentType = mimeTypes[ext || ''] || 'video/mp4';

    if (range) {
      // Parse Range header
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunksize = end - start + 1;
      const file = createReadStream(filePath, { start, end });

      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000',
      });

      file.pipe(res);
    } else {
      // Send entire file
      res.writeHead(200, {
        'Content-Length': fileSize,
        'Content-Type': contentType,
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'public, max-age=31536000',
      });

      createReadStream(filePath).pipe(res);
    }
  }

}
