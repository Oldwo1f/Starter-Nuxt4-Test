import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MarketplaceController } from './marketplace.controller';
import { MarketplaceService } from './marketplace.service';
import { Listing } from '../entities/listing.entity';
import { Location } from '../entities/location.entity';
import { Category } from '../entities/category.entity';
import { User } from '../entities/user.entity';
import { UploadModule } from '../upload/upload.module';
import { ListingOwnerGuard } from './guards/listing-owner.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([Listing, Location, Category, User]),
    UploadModule,
  ],
  controllers: [MarketplaceController],
  providers: [MarketplaceService, ListingOwnerGuard],
  exports: [MarketplaceService],
})
export class MarketplaceModule {}
