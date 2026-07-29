import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { TerminusModule } from "@nestjs/terminus";
import { HealthController } from "./health/health.controller";
import { PrismaModule } from "./common/prisma/prisma.module";
import { RedisModule } from "./common/redis/redis.module";
import { AuthModule } from "./auth/auth.module";
import { PropertiesModule } from "./properties/properties.module";
import { VerificationModule } from "./verification/verification.module";
import { PublicModule } from "./public/public.module";
import { OrganisationsModule } from "./organisations/organisations.module";
import { SearchModule } from "./search/search.module";
import { BookingsModule } from "./bookings/bookings.module";
import { PaymentsModule } from "./payments/payments.module";
import { AgreementsModule } from "./agreements/agreements.module";
import { NotificationsModule } from "./notifications/notifications.module";
import { SupportModule } from "./support/support.module";
import { DashboardsModule } from "./dashboards/dashboards.module";
import { ReviewsModule } from "./reviews/reviews.module";
import { BlogModule } from "./blog/blog.module";
import { FavouritesModule } from "./favourites/favourites.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TerminusModule,
    PrismaModule,
    RedisModule,
    AuthModule,
    OrganisationsModule,
    PropertiesModule,
    VerificationModule,
    SearchModule,
    PublicModule,
    BookingsModule,
    PaymentsModule,
    AgreementsModule,
    NotificationsModule,
    SupportModule,
    DashboardsModule,
    ReviewsModule,
    BlogModule,
    FavouritesModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
