import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Listing, ListingStatus, ListingType } from '../entities/listing.entity';
import { Location } from '../entities/location.entity';
import { Category } from '../entities/category.entity';
import { User } from '../entities/user.entity';

export interface ListingFilters {
  locationId?: number;
  categoryId?: number;
  type?: ListingType;
  minPrice?: number;
  maxPrice?: number;
  search?: string;
  status?: ListingStatus;
  sellerId?: number;
  showAll?: boolean; // If true, show all listings regardless of status
}

@Injectable()
export class MarketplaceService {
  constructor(
    @InjectRepository(Listing)
    private listingRepository: Repository<Listing>,
    @InjectRepository(Location)
    private locationRepository: Repository<Location>,
    @InjectRepository(Category)
    private categoryRepository: Repository<Category>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async create(
    title: string,
    description: string,
    price: number,
    type: ListingType,
    categoryId: number,
    locationId: number,
    sellerId: number,
    images: string[] = [],
    priceUnit?: string,
  ): Promise<Listing> {
    // Verify location exists
    const location = await this.locationRepository.findOne({
      where: { id: locationId },
    });
    if (!location) {
      throw new NotFoundException(`Location with ID ${locationId} not found`);
    }

    // Verify category exists
    const category = await this.categoryRepository.findOne({
      where: { id: categoryId },
    });
    if (!category) {
      throw new NotFoundException(`Category with ID ${categoryId} not found`);
    }

    // Verify seller exists
    const seller = await this.userRepository.findOne({
      where: { id: sellerId },
    });
    if (!seller) {
      throw new NotFoundException(`User with ID ${sellerId} not found`);
    }

    const listing = this.listingRepository.create({
      title,
      description,
      price: Math.round(price), // Ensure integer
      priceUnit: priceUnit || null,
      type,
      categoryId,
      locationId,
      sellerId,
      images,
      status: ListingStatus.ACTIVE,
      viewCount: 0,
    });

    return this.listingRepository.save(listing);
  }

  async findAll(
    page: number = 1,
    pageSize: number = 20,
    filters: ListingFilters = {},
  ) {
    const queryBuilder = this.listingRepository.createQueryBuilder('listing');

    // Join relations
    queryBuilder.leftJoinAndSelect('listing.seller', 'seller');
    queryBuilder.leftJoinAndSelect('listing.location', 'location');
    queryBuilder.leftJoinAndSelect('listing.category', 'category');

    // Select only necessary fields from seller
    queryBuilder.select([
      'listing.id',
      'listing.title',
      'listing.description',
      'listing.price',
      'listing.priceUnit',
      'listing.type',
      'listing.status',
      'listing.images',
      'listing.viewCount',
      'listing.createdAt',
      'listing.updatedAt',
      'seller.id',
      'seller.email',
      'seller.firstName',
      'seller.lastName',
      'seller.avatarImage',
      'location.id',
      'location.archipel',
      'location.commune',
      'location.ile',
      'category.id',
      'category.name',
      'category.type',
      'category.color',
    ]);

    // Apply filters
    if (filters.locationId) {
      queryBuilder.andWhere('listing.locationId = :locationId', {
        locationId: filters.locationId,
      });
    }

    if (filters.categoryId) {
      queryBuilder.andWhere('listing.categoryId = :categoryId', {
        categoryId: filters.categoryId,
      });
    }

    if (filters.type) {
      queryBuilder.andWhere('listing.type = :type', { type: filters.type });
    }

    if (filters.minPrice !== undefined) {
      queryBuilder.andWhere('listing.price >= :minPrice', {
        minPrice: filters.minPrice,
      });
    }

    if (filters.maxPrice !== undefined) {
      queryBuilder.andWhere('listing.price <= :maxPrice', {
        maxPrice: filters.maxPrice,
      });
    }

    if (filters.search) {
      queryBuilder.andWhere(
        '(listing.title ILIKE :search OR listing.description ILIKE :search)',
        { search: `%${filters.search}%` },
      );
    }

    if (filters.status) {
      queryBuilder.andWhere('listing.status = :status', {
        status: filters.status,
      });
    } else if (!filters.sellerId && !filters.showAll) {
      // By default, only show active listings (unless filtering by sellerId or showAll is true, then show all)
      queryBuilder.andWhere('listing.status = :status', {
        status: ListingStatus.ACTIVE,
      });
    }

    if (filters.sellerId) {
      queryBuilder.andWhere('listing.sellerId = :sellerId', {
        sellerId: filters.sellerId,
      });
    }

    // Order by newest first
    queryBuilder.orderBy('listing.createdAt', 'DESC');

    // Get total before pagination
    const total = await queryBuilder.getCount();

    // Apply pagination
    const skip = (page - 1) * pageSize;
    queryBuilder.skip(skip).take(pageSize);

    // Execute query
    const data = await queryBuilder.getMany();

    // Calculate pagination metadata
    const totalPages = Math.ceil(total / pageSize);
    const hasNext = page < totalPages;
    const hasPrev = page > 1;

    return {
      data,
      total,
      page,
      pageSize,
      totalPages,
      hasNext,
      hasPrev,
    };
  }

  async findOne(id: number, incrementView: boolean = false): Promise<Listing> {
    const listing = await this.listingRepository.findOne({
      where: { id },
      relations: ['seller', 'location', 'category'],
      select: {
        seller: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          avatarImage: true,
        },
      },
    });

    if (!listing) {
      throw new NotFoundException(`Listing with ID ${id} not found`);
    }

    if (incrementView) {
      listing.viewCount += 1;
      await this.listingRepository.save(listing);
    }

    return listing;
  }

  async update(
    id: number,
    userId: number,
    updates: {
      title?: string;
      description?: string;
      price?: number;
      priceUnit?: string;
      type?: ListingType;
      categoryId?: number;
      locationId?: number;
      images?: string[];
      status?: ListingStatus;
    },
    userRole?: string,
  ): Promise<Listing> {
    const listing = await this.findOne(id);

    // Check ownership (admins can update any listing)
    const isAdmin = userRole === 'admin' || userRole === 'superadmin' || userRole === 'moderator';
    if (listing.sellerId !== userId && !isAdmin) {
      throw new ForbiddenException('You can only update your own listings');
    }

    // Verify location if provided
    if (updates.locationId) {
      const location = await this.locationRepository.findOne({
        where: { id: updates.locationId },
      });
      if (!location) {
        throw new NotFoundException(
          `Location with ID ${updates.locationId} not found`,
        );
      }
    }

    // Verify category if provided
    if (updates.categoryId) {
      const category = await this.categoryRepository.findOne({
        where: { id: updates.categoryId },
      });
      if (!category) {
        throw new NotFoundException(
          `Category with ID ${updates.categoryId} not found`,
        );
      }
    }

    // Apply updates
    const updateData: any = { ...updates };
    if (updates.price !== undefined) {
      updateData.price = Math.round(updates.price); // Ensure integer
    }
    if (updates.priceUnit !== undefined) {
      updateData.priceUnit = updates.priceUnit || null;
    }
    Object.assign(listing, updateData);

    return this.listingRepository.save(listing);
  }

  async remove(id: number, userId: number, userRole?: string): Promise<void> {
    const listing = await this.findOne(id);

    // Check ownership (admins can delete any listing)
    const isAdmin = userRole === 'admin' || userRole === 'superadmin' || userRole === 'moderator';
    if (listing.sellerId !== userId && !isAdmin) {
      throw new ForbiddenException('You can only delete your own listings');
    }

    await this.listingRepository.remove(listing);
  }
}
