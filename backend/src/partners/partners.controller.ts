import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  UseInterceptors,
  UploadedFiles,
  ParseIntPipe,
  BadRequestException,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
  ApiConsumes,
} from '@nestjs/swagger';
import { PartnersService } from './partners.service';
import { CreatePartnerDto } from './dto/create-partner.dto';
import { UpdatePartnerDto } from './dto/update-partner.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { UserRole } from '../entities/user.entity';
import { UploadService } from '../upload/upload.service';

@ApiTags('partners')
@Controller('partners')
export class PartnersController {
  constructor(
    private readonly partnersService: PartnersService,
    private readonly uploadService: UploadService,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.MODERATOR)
  @UseInterceptors(FilesInterceptor('banners', 2))
  @ApiBearerAuth('JWT-auth')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Create a new partner',
    description: 'Create a new partner with banners (admin/staff only)',
  })
  @ApiResponse({ status: 201, description: 'Partner successfully created' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin/Staff only' })
  async create(
    @Body() createPartnerDto: CreatePartnerDto,
    @UploadedFiles() files?: Express.Multer.File[],
  ) {
    let bannerHorizontalUrl: string | undefined;
    let bannerVerticalUrl: string | undefined;

    // Créer le partenaire d'abord pour obtenir l'ID
    const partner = await this.partnersService.create(
      createPartnerDto.name,
      createPartnerDto.link,
    );

    // Traiter les fichiers uploadés
    if (files && files.length > 0) {
      for (const file of files) {
        // Détecter le type de bannière selon les dimensions
        const { width, height } = await this.uploadService.getImageDimensions(file);
        
        if (width === 1080 && height === 400) {
          bannerHorizontalUrl = await this.uploadService.savePartnerBanner(
            partner.id,
            file,
            'horizontal',
          );
        } else if (width === 600 && height === 1080) {
          bannerVerticalUrl = await this.uploadService.savePartnerBanner(
            partner.id,
            file,
            'vertical',
          );
        } else {
          throw new BadRequestException(
            `Dimensions incorrectes. Attendu: 1080x400 (horizontal) ou 600x1080 (vertical), Reçu: ${width}x${height}`,
          );
        }
      }

      // Mettre à jour le partenaire avec les URLs des bannières
      if (bannerHorizontalUrl || bannerVerticalUrl) {
        return this.partnersService.update(
          partner.id,
          undefined,
          undefined,
          bannerHorizontalUrl,
          bannerVerticalUrl,
        );
      }
    }

    return partner;
  }

  @Get()
  @ApiOperation({
    summary: 'Get all partners',
    description: 'Retrieve all partners',
  })
  @ApiResponse({ status: 200, description: 'List of partners retrieved successfully' })
  async findAll() {
    return this.partnersService.findAll();
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get a partner by ID',
    description: 'Retrieve a specific partner by its ID',
  })
  @ApiParam({ name: 'id', description: 'Partner ID', type: 'number' })
  @ApiResponse({ status: 200, description: 'Partner retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Partner not found' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.partnersService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.MODERATOR)
  @UseInterceptors(FilesInterceptor('banners', 2))
  @ApiBearerAuth('JWT-auth')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Update a partner',
    description: 'Update an existing partner (admin/staff only)',
  })
  @ApiParam({ name: 'id', description: 'Partner ID', type: 'number' })
  @ApiResponse({ status: 200, description: 'Partner successfully updated' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin/Staff only' })
  @ApiResponse({ status: 404, description: 'Partner not found' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updatePartnerDto: any, // Use any to handle FormData properly
    @UploadedFiles() files?: Express.Multer.File[],
  ) {
    let bannerHorizontalUrl: string | undefined;
    let bannerVerticalUrl: string | undefined;

    // Convertir les flags de suppression depuis FormData (strings) en booléens
    const deleteBannerHorizontal = updatePartnerDto.deleteBannerHorizontal === 'true' || updatePartnerDto.deleteBannerHorizontal === true;
    const deleteBannerVertical = updatePartnerDto.deleteBannerVertical === 'true' || updatePartnerDto.deleteBannerVertical === true;

    // Traiter les fichiers uploadés
    if (files && files.length > 0) {
      for (const file of files) {
        // Détecter le type de bannière selon les dimensions
        const { width, height } = await this.uploadService.getImageDimensions(file);
        
        if (width === 1080 && height === 400) {
          bannerHorizontalUrl = await this.uploadService.savePartnerBanner(
            id,
            file,
            'horizontal',
          );
        } else if (width === 600 && height === 1080) {
          bannerVerticalUrl = await this.uploadService.savePartnerBanner(
            id,
            file,
            'vertical',
          );
        } else {
          throw new BadRequestException(
            `Dimensions incorrectes. Attendu: 1080x400 (horizontal) ou 600x1080 (vertical), Reçu: ${width}x${height}`,
          );
        }
      }
    }

    // Gérer la suppression des bannières si demandée
    let finalBannerHorizontalUrl: string | null | undefined;
    let finalBannerVerticalUrl: string | null | undefined;

    // Pour la bannière horizontale
    if (bannerHorizontalUrl !== undefined) {
      // Nouveau fichier uploadé, l'utiliser
      finalBannerHorizontalUrl = bannerHorizontalUrl;
    } else if (deleteBannerHorizontal) {
      // Demande de suppression explicite
      finalBannerHorizontalUrl = null;
    } else {
      // Pas de changement, garder l'existant (undefined = pas de modification)
      finalBannerHorizontalUrl = undefined;
    }

    // Pour la bannière verticale
    if (bannerVerticalUrl !== undefined) {
      // Nouveau fichier uploadé, l'utiliser
      finalBannerVerticalUrl = bannerVerticalUrl;
    } else if (deleteBannerVertical) {
      // Demande de suppression explicite
      finalBannerVerticalUrl = null;
    } else {
      // Pas de changement, garder l'existant (undefined = pas de modification)
      finalBannerVerticalUrl = undefined;
    }

    return this.partnersService.update(
      id,
      updatePartnerDto.name,
      updatePartnerDto.link,
      finalBannerHorizontalUrl === null ? undefined : finalBannerHorizontalUrl,
      finalBannerVerticalUrl === null ? undefined : finalBannerVerticalUrl,
    );
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.MODERATOR)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Delete a partner',
    description: 'Delete a partner by ID (admin/staff only)',
  })
  @ApiParam({ name: 'id', description: 'Partner ID', type: 'number' })
  @ApiResponse({ status: 200, description: 'Partner successfully deleted' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin/Staff only' })
  @ApiResponse({ status: 404, description: 'Partner not found' })
  async remove(@Param('id', ParseIntPipe) id: number) {
    return this.partnersService.remove(id);
  }
}
