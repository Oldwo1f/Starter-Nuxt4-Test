import { Module } from '@nestjs/common';
import { AdminAgentController } from './admin-agent.controller';
import { AdminAgentService } from './admin-agent.service';
import { UsersModule } from '../users/users.module';
import { BlogModule } from '../blog/blog.module';
import { GoodiesModule } from '../goodies/goodies.module';
import { PollsModule } from '../polls/polls.module';
import { TodosModule } from '../todos/todos.module';
import { CultureModule } from '../culture/culture.module';
import { PartnersModule } from '../partners/partners.module';
import { AcademyModule } from '../academy/academy.module';
import { BillingModule } from '../billing/billing.module';
import { WalletModule } from '../wallet/wallet.module';
import { ReferralModule } from '../referral/referral.module';
import { MarketplaceModule } from '../marketplace/marketplace.module';

@Module({
  imports: [
    UsersModule,
    BlogModule,
    GoodiesModule,
    PollsModule,
    TodosModule,
    CultureModule,
    PartnersModule,
    AcademyModule,
    BillingModule,
    WalletModule,
    ReferralModule,
    MarketplaceModule,
  ],
  controllers: [AdminAgentController],
  providers: [AdminAgentService],
})
export class AdminAgentModule {}
