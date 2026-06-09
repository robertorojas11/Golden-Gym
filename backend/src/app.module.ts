import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { MembersModule } from './members/members.module';
import { MembershipsModule } from './memberships/memberships.module';
import { PaymentsModule } from './payments/payments.module';
import { BiometricsModule } from './biometrics/biometrics.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { MockDbModule } from './mock-db.module';

@Module({
  imports: [
    MockDbModule, // Shared global singleton database module
    AuthModule,
    MembersModule,
    MembershipsModule,
    PaymentsModule,
    BiometricsModule,
    AnalyticsModule,
  ],
})
export class AppModule {}
