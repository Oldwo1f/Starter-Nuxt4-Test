import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Patch,
  Post,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  ParseIntPipe,
  DefaultValuePipe,
  Param,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  TestimonialsService,
  testimonialExtFromMime,
  normalizeTestimonialMulterFile,
} from './testimonials.service';
import { RejectTestimonialDto } from './dto/reject-testimonial.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../entities/user.entity';
import { CurrentUser } from '../auth/current-user.decorator';

const UPLOAD_DEST = process.env.UPLOAD_DEST || 'uploads';
const MAX_TESTIMONIAL_VIDEO_BYTES = parseInt(
  process.env.MAX_TESTIMONIAL_VIDEO_BYTES || '104857600',
  10,
);

@ApiTags('testimonials')
@Controller('testimonials')
export class TestimonialsController {
  constructor(private readonly testimonialsService: TestimonialsService) {}

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Statut témoignage (pending / dernier traité)' })
  async getMine(@CurrentUser() user: { id: number }) {
    return this.testimonialsService.getMine(user.id);
  }

  @Get('admin/pending')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MODERATOR, UserRole.ADMIN, UserRole.SUPERADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Liste des témoignages en attente' })
  async adminPending(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.testimonialsService.listPendingForAdmin(page, limit);
  }

  @Patch('admin/:id/approve')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MODERATOR, UserRole.ADMIN, UserRole.SUPERADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Approuver un témoignage (+ Pūpū si éligible ce mois-ci)' })
  async approve(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: { id: number }) {
    const row = await this.testimonialsService.approve(id, user.id);
    return {
      ok: true,
      id: row.id,
      pupuGranted: row.pupuGranted,
      pupuAmount: Number(row.pupuAmount),
    };
  }

  @Patch('admin/:id/reject')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MODERATOR, UserRole.ADMIN, UserRole.SUPERADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Refuser un témoignage' })
  async reject(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: { id: number },
    @Body() dto: RejectTestimonialDto,
  ) {
    const row = await this.testimonialsService.reject(id, user.id, dto.reason);
    return { ok: true, id: row.id };
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('video', {
      storage: diskStorage({
        destination: (req, _file, cb) => {
          const userId = (req as any).user?.id;
          if (!userId) {
            return cb(new BadRequestException('Utilisateur requis') as any, '');
          }
          const dir = join(process.cwd(), UPLOAD_DEST, 'testimonials', String(userId));
          if (!existsSync(dir)) {
            mkdirSync(dir, { recursive: true });
          }
          cb(null, dir);
        },
        filename: (_req, file, cb) => {
          const ext = testimonialExtFromMime(file.mimetype);
          const name = `${Date.now()}-${Math.random().toString(16).slice(2)}.${ext}`;
          cb(null, name);
        },
      }),
      limits: { fileSize: MAX_TESTIMONIAL_VIDEO_BYTES },
      fileFilter: (_req, file, cb) => {
        try {
          normalizeTestimonialMulterFile(file);
          cb(null, true);
        } catch (e) {
          cb(e as Error, false);
        }
      },
    }),
  )
  @ApiOperation({ summary: 'Soumettre une vidéo témoignage' })
  async create(
    @CurrentUser() user: { id: number },
    @UploadedFile() file: Express.Multer.File,
    @Body() body: Record<string, string>,
  ) {
    const payload = this.testimonialsService.parseCreatePayload(body as unknown as Record<string, unknown>);
    const row = await this.testimonialsService.createSubmission(user.id, payload, file);
    return { ok: true, id: row.id, videoUrl: row.videoUrl };
  }
}
