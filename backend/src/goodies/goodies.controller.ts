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
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
  ParseIntPipe,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor, FileFieldsInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiParam,
  ApiBearerAuth,
  ApiConsumes,
} from '@nestjs/swagger';
import { GoodiesService } from './goodies.service';
import { CreateGoodieDto } from './dto/create-goodie.dto';
import { UpdateGoodieDto } from './dto/update-goodie.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/optional-jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { UserRole } from '../entities/user.entity';
import { UploadService } from '../upload/upload.service';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';

@ApiTags('goodies')
@Controller('goodies')
export class GoodiesController {
  constructor(
    private readonly goodiesService: GoodiesService,
    private readonly uploadService: UploadService,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.MODERATOR)
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'image', maxCount: 1 },
      { name: 'file', maxCount: 1 },
    ]),
  )
  @ApiBearerAuth('JWT-auth')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Create a new goodie',
    description: 'Create a new goodie with a square image and optional file (zip, pdf) (admin/staff only)',
  })
  @ApiBody({ type: CreateGoodieDto })
  @ApiResponse({ status: 201, description: 'Goodie successfully created' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin/Staff only' })
  async create(
    @Body() createGoodieDto: any, // Use any to handle FormData properly
    @Request() req,
    @UploadedFiles() files?: { image?: Express.Multer.File[]; file?: Express.Multer.File[] },
  ) {
    // Convertir isPublic depuis FormData (string) en booléen
    const isPublic = createGoodieDto.isPublic === 'true' || createGoodieDto.isPublic === true || createGoodieDto.isPublic === undefined;

    // Créer le goodie d'abord pour obtenir l'ID
    const goodie = await this.goodiesService.create(
      createGoodieDto.name,
      createGoodieDto.link,
      createGoodieDto.description,
      undefined, // imageUrl sera défini après upload
      undefined, // fileUrl sera défini après upload
      createGoodieDto.offeredByName,
      createGoodieDto.offeredByLink,
      isPublic,
      req.user?.id,
    );

    // Traiter les fichiers uploadés
    let imageUrl: string | undefined;
    let fileUrl: string | undefined;

    if (files?.image?.[0]) {
      imageUrl = await this.uploadService.saveGoodieImage(goodie.id, files.image[0]);
    }

    if (files?.file?.[0]) {
      fileUrl = await this.uploadService.saveGoodieFile(goodie.id, files.file[0]);
    }

    // Mettre à jour le goodie avec les URLs si des fichiers ont été uploadés
    if (imageUrl !== undefined || fileUrl !== undefined) {
      return this.goodiesService.update(
        goodie.id,
        undefined,
        undefined,
        undefined,
        imageUrl,
        fileUrl,
        undefined,
        undefined,
        undefined,
      );
    }

    return goodie;
  }

  @Get()
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({
    summary: 'Get all goodies',
    description: 'Retrieve all goodies. Public goodies are visible to all, private ones only to authenticated users.',
  })
  @ApiResponse({ status: 200, description: 'List of goodies retrieved successfully' })
  async findAll(@Request() req) {
    const isAuthenticated = !!req.user;
    return this.goodiesService.findAll(isAuthenticated);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get a goodie by ID',
    description: 'Retrieve a specific goodie by its ID',
  })
  @ApiParam({ name: 'id', description: 'Goodie ID', type: 'number' })
  @ApiResponse({ status: 200, description: 'Goodie retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Goodie not found' })
  async findOne(@Param('id', ParseIntPipe) id: number, @Request() req) {
    const isAuthenticated = !!req.user;
    return this.goodiesService.findOne(id, isAuthenticated);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.MODERATOR)
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'image', maxCount: 1 },
      { name: 'file', maxCount: 1 },
    ]),
  )
  @ApiBearerAuth('JWT-auth')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Update a goodie',
    description: 'Update an existing goodie with a square image and optional file (zip, pdf) (admin/staff only)',
  })
  @ApiParam({ name: 'id', description: 'Goodie ID', type: 'number' })
  @ApiBody({ type: UpdateGoodieDto })
  @ApiResponse({ status: 200, description: 'Goodie successfully updated' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin/Staff only' })
  @ApiResponse({ status: 404, description: 'Goodie not found' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateGoodieDto: any, // Use any to handle FormData properly
    @UploadedFiles() files?: { image?: Express.Multer.File[]; file?: Express.Multer.File[] },
  ) {
    let imageUrl: string | undefined;
    let fileUrl: string | undefined;

    // Traiter les fichiers uploadés
    if (files?.image?.[0]) {
      imageUrl = await this.uploadService.saveGoodieImage(id, files.image[0]);
    }

    if (files?.file?.[0]) {
      fileUrl = await this.uploadService.saveGoodieFile(id, files.file[0]);
    }

    // Convertir les flags de suppression depuis FormData (string) en booléen
    const deleteImage = updateGoodieDto.deleteImage === 'true' || updateGoodieDto.deleteImage === true;
    const deleteFile = updateGoodieDto.deleteFile === 'true' || updateGoodieDto.deleteFile === true;
    
    // Convertir isPublic depuis FormData (string) en booléen
    const isPublic = updateGoodieDto.isPublic !== undefined 
      ? (updateGoodieDto.isPublic === 'true' || updateGoodieDto.isPublic === true)
      : undefined;

    // Gérer la suppression de l'image si demandée
    let finalImageUrl: string | null | undefined;

    if (imageUrl !== undefined) {
      // Nouveau fichier uploadé, l'utiliser
      finalImageUrl = imageUrl;
    } else if (deleteImage) {
      // Demande de suppression explicite
      finalImageUrl = null;
    } else {
      // Pas de changement, garder l'existant (undefined = pas de modification)
      finalImageUrl = undefined;
    }

    // Gérer la suppression du fichier si demandée
    let finalFileUrl: string | null | undefined;

    if (fileUrl !== undefined) {
      // Nouveau fichier uploadé, l'utiliser
      finalFileUrl = fileUrl;
    } else if (deleteFile) {
      // Demande de suppression explicite
      finalFileUrl = null;
    } else {
      // Pas de changement, garder l'existant (undefined = pas de modification)
      finalFileUrl = undefined;
    }

    return this.goodiesService.update(
      id,
      updateGoodieDto.name,
      updateGoodieDto.link,
      updateGoodieDto.description,
      finalImageUrl,
      finalFileUrl,
      updateGoodieDto.offeredByName,
      updateGoodieDto.offeredByLink,
      isPublic,
    );
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.MODERATOR)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Delete a goodie',
    description: 'Delete a goodie by ID (admin/staff only)',
  })
  @ApiParam({ name: 'id', description: 'Goodie ID', type: 'number' })
  @ApiResponse({ status: 200, description: 'Goodie successfully deleted' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin/Staff only' })
  @ApiResponse({ status: 404, description: 'Goodie not found' })
  async remove(@Param('id', ParseIntPipe) id: number) {
    return this.goodiesService.remove(id);
  }
}
