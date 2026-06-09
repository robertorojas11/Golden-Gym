import { Module } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { AnalyticsController } from './analytics.controller';
import { MockDatabase } from '../mock-db';
import { AuthService } from '../auth/auth.service';

@Module({
  providers: [AnalyticsService, MockDatabase, AuthService],
  controllers: [AnalyticsController],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
