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
  Query,
  UseInterceptors,
  UploadedFiles,
  ParseIntPipe,
  ForbiddenException,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiParam,
  ApiBearerAuth,
  ApiProperty,
  ApiQuery,
  ApiConsumes,
} from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsNumber, IsEnum, IsArray, Min } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { MarketplaceService, ListingFilters } from './marketplace.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Listing, ListingType, ListingStatus } from '../entities/listing.entity';
import { UploadService } from '../upload/upload.service';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';

export class CreateListingDto {
  @ApiProperty({
    description: 'Listing title',
    example: 'Vélo de montagne',
  })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({
    description: 'Listing description',
    example: 'Vélo de montagne en excellent état, peu utilisé...',
  })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({
    description: 'Price in Pūpū (integer only)',
    example: 50,
  })
  @Transform(({ value }) => parseInt(value, 10))
  @IsNumber()
  @Min(0)
  price: number;

  @ApiProperty({
    description: 'Price unit (par heure, par jour, le paquet, l\'unité, le kilo, etc.)',
    example: 'l\'unité',
    required: false,
  })
  @IsString()
  @IsOptional()
  priceUnit?: string;

  @ApiProperty({
    description: 'Listing type',
    enum: ListingType,
    example: ListingType.BIEN,
  })
  @IsEnum(ListingType)
  type: ListingType;

  @ApiProperty({
    description: 'Category ID',
    example: 1,
  })
  @Transform(({ value }) => parseInt(value, 10))
  @IsNumber()
  categoryId: number;

  @ApiProperty({
    description: 'Location ID',
    example: 1,
  })
  @Transform(({ value }) => parseInt(value, 10))
  @IsNumber()
  locationId: number;
}

export class UpdateListingDto {
  @ApiProperty({
    description: 'Listing title',
    required: false,
  })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiProperty({
    description: 'Listing description',
    required: false,
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: 'Price in Pūpū (integer only)',
    required: false,
  })
  @Transform(({ value }) => value !== undefined ? parseInt(value, 10) : undefined)
  @IsNumber()
  @Min(0)
  @IsOptional()
  price?: number;

  @ApiProperty({
    description: 'Price unit (par heure, par jour, le paquet, l\'unité, le kilo, etc.)',
    required: false,
  })
  @IsString()
  @IsOptional()
  priceUnit?: string;

  @ApiProperty({
    description: 'Listing type',
    enum: ListingType,
    required: false,
  })
  @IsEnum(ListingType)
  @IsOptional()
  type?: ListingType;

  @ApiProperty({
    description: 'Category ID',
    required: false,
  })
  @IsNumber()
  @IsOptional()
  categoryId?: number;

  @ApiProperty({
    description: 'Location ID',
    required: false,
  })
  @IsNumber()
  @IsOptional()
  locationId?: number;

  @ApiProperty({
    description: 'Listing status',
    enum: ListingStatus,
    required: false,
  })
  @IsEnum(ListingStatus)
  @IsOptional()
  status?: ListingStatus;

  @ApiProperty({
    description: 'Image URLs array',
    type: [String],
    required: false,
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  images?: string[];
}

@ApiTags('marketplace')
@Controller('marketplace')
export class MarketplaceController {
  private readonly listingsUploadPath: string;

  constructor(
    private readonly marketplaceService: MarketplaceService,
    private readonly uploadService: UploadService,
  ) {
    this.listingsUploadPath = join(process.env.UPLOAD_DEST || 'uploads', 'listings');
    // Ensure listings directory exists
    if (!existsSync(this.listingsUploadPath)) {
      mkdirSync(this.listingsUploadPath, { recursive: true });
    }
  }

  private async saveListingImages(listingId: number, files: Express.Multer.File[]): Promise<string[]> {
    const listingDir = join(this.listingsUploadPath, listingId.toString());
    if (!existsSync(listingDir)) {
      mkdirSync(listingDir, { recursive: true });
    }

    const imageUrls: string[] = [];
    for (const file of files) {
      this.uploadService.validateFile(file);
      const filename = this.uploadService.generateFileName(file.originalname);
      const filePath = join(listingDir, filename);
      writeFileSync(filePath, file.buffer);
      imageUrls.push(`/uploads/listings/${listingId}/${filename}`);
    }

    return imageUrls;
  }

  @Post('listings')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @UseInterceptors(FilesInterceptor('images', 10)) // Max 10 images
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Create a new listing',
    description: 'Create a new listing with images (requires authentication)',
  })
  @ApiBody({ type: CreateListingDto })
  @ApiResponse({ status: 201, description: 'Listing successfully created' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async create(
    @Body() createListingDto: CreateListingDto,
    @Request() req,
    @UploadedFiles() files?: Express.Multer.File[],
  ) {
    // Save images if provided
    let imageUrls: string[] = [];
    if (files && files.length > 0) {
      // Create listing first to get ID
      const listing = await this.marketplaceService.create(
        createListingDto.title,
        createListingDto.description,
        createListingDto.price,
        createListingDto.type,
        createListingDto.categoryId,
        createListingDto.locationId,
        req.user.id,
        [],
        createListingDto.priceUnit,
      );
      
      // Save images
      imageUrls = await this.saveListingImages(listing.id, files);
      
      // Update listing with image URLs
      return this.marketplaceService.update(listing.id, req.user.id, {
        images: imageUrls,
      });
    }

    return this.marketplaceService.create(
      createListingDto.title,
      createListingDto.description,
      createListingDto.price,
      createListingDto.type,
      createListingDto.categoryId,
      createListingDto.locationId,
      req.user.id,
      imageUrls,
      createListingDto.priceUnit,
    );
  }

  @Get('listings')
  @ApiOperation({
    summary: 'Get all listings with filters',
    description: 'Retrieve a paginated list of listings with optional filters',
  })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  @ApiQuery({ name: 'locationId', required: false, type: Number })
  @ApiQuery({ name: 'categoryId', required: false, type: Number })
  @ApiQuery({ name: 'type', required: false, enum: ListingType })
  @ApiQuery({ name: 'minPrice', required: false, type: Number })
  @ApiQuery({ name: 'maxPrice', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, enum: ListingStatus })
  @ApiQuery({ name: 'sellerId', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Listings retrieved successfully' })
  findAll(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('locationId') locationId?: string,
    @Query('categoryId') categoryId?: string,
    @Query('type') type?: ListingType,
    @Query('minPrice') minPrice?: string,
    @Query('maxPrice') maxPrice?: string,
    @Query('search') search?: string,
    @Query('status') status?: ListingStatus,
    @Query('sellerId') sellerId?: string,
  ) {
    const filters: ListingFilters = {};
    if (locationId) filters.locationId = parseInt(locationId, 10);
    if (categoryId) filters.categoryId = parseInt(categoryId, 10);
    if (type) filters.type = type;
    if (minPrice) filters.minPrice = parseFloat(minPrice);
    if (maxPrice) filters.maxPrice = parseFloat(maxPrice);
    if (search) filters.search = search;
    if (status) filters.status = status;
    if (sellerId) filters.sellerId = parseInt(sellerId, 10);

    return this.marketplaceService.findAll(
      page ? parseInt(page, 10) : 1,
      pageSize ? parseInt(pageSize, 10) : 20,
      filters,
    );
  }

  @Get('listings/:id')
  @ApiOperation({
    summary: 'Get listing by ID',
    description: 'Retrieve a specific listing by its ID (increments view count)',
  })
  @ApiParam({ name: 'id', description: 'Listing ID', type: 'number' })
  @ApiResponse({ status: 200, description: 'Listing retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Listing not found' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.marketplaceService.findOne(id, true); // Increment view count
  }

  @Patch('listings/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Update a listing',
    description: 'Update an existing listing (requires ownership)',
  })
  @ApiParam({ name: 'id', description: 'Listing ID', type: 'number' })
  @ApiBody({ type: UpdateListingDto })
  @ApiResponse({ status: 200, description: 'Listing successfully updated' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - not owner' })
  @ApiResponse({ status: 404, description: 'Listing not found' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateListingDto: UpdateListingDto,
    @Request() req,
  ) {
    return this.marketplaceService.update(id, req.user.id, updateListingDto);
  }

  @Patch('listings/:id/images')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @UseInterceptors(FilesInterceptor('images', 10)) // Max 10 images
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Add images to a listing',
    description: 'Add new images to an existing listing (requires ownership)',
  })
  @ApiParam({ name: 'id', description: 'Listing ID', type: 'number' })
  @ApiResponse({ status: 200, description: 'Images successfully added' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - not owner' })
  @ApiResponse({ status: 404, description: 'Listing not found' })
  async addImages(
    @Param('id', ParseIntPipe) id: number,
    @Request() req,
    @UploadedFiles() files?: Express.Multer.File[],
  ) {
    if (!files || files.length === 0) {
      throw new Error('No files provided');
    }

    // Get current listing
    const listing = await this.marketplaceService.findOne(id);
    
    // Check ownership
    if (listing.sellerId !== req.user.id) {
      throw new ForbiddenException('You can only update your own listings');
    }

    // Save new images
    const newImageUrls = await this.saveListingImages(id, files);
    
    // Combine with existing images
    const currentImages = listing.images || [];
    const updatedImages = [...currentImages, ...newImageUrls];
    
    // Update listing with all images
    return this.marketplaceService.update(id, req.user.id, {
      images: updatedImages,
    });
  }

  @Delete('listings/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Delete a listing',
    description: 'Delete a listing by ID (requires ownership)',
  })
  @ApiParam({ name: 'id', description: 'Listing ID', type: 'number' })
  @ApiResponse({ status: 200, description: 'Listing successfully deleted' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - not owner' })
  @ApiResponse({ status: 404, description: 'Listing not found' })
  remove(@Param('id', ParseIntPipe) id: number, @Request() req) {
    return this.marketplaceService.remove(id, req.user.id);
  }
}
