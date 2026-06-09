import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { MembersModule } from './members/members.module';
import { MembershipsModule } from './memberships/memberships.module';
import { PaymentsModule } from './payments/payments.module';
import { BiometricsModule } from './biometrics/biometrics.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { MockDatabase } from './mock-db';

@Module({
  imports: [
    AuthModule,
    MembersModule,
    MembershipsModule,
    PaymentsModule,
    BiometricsModule,
    AnalyticsModule,
  ],
  providers: [MockDatabase],
})
export class AppModule {}
