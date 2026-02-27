import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database/database.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { BlogModule } from './blog/blog.module';
import { UploadModule } from './upload/upload.module';
import { LocationsModule } from './locations/locations.module';
import { CategoriesModule } from './categories/categories.module';
import { MarketplaceModule } from './marketplace/marketplace.module';
import { WalletModule } from './wallet/wallet.module';
import { GoodiesModule } from './goodies/goodies.module';
import { PartnersModule } from './partners/partners.module';
import { CultureModule } from './culture/culture.module';
import { AcademyModule } from './academy/academy.module';
import { ReferralModule } from './referral/referral.module';
import { BillingModule } from './billing/billing.module';

@Module({
  imports: [
    DatabaseModule,
    UsersModule,
    AuthModule,
    BlogModule,
    UploadModule,
    LocationsModule,
    CategoriesModule,
    MarketplaceModule,
    WalletModule,
    GoodiesModule,
    PartnersModule,
    CultureModule,
    AcademyModule,
    ReferralModule,
    BillingModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
