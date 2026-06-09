import { Module } from '@nestjs/common';
import { BiometricsService } from './biometrics.service';
import { BiometricsController } from './biometrics.controller';
import { MockDatabase } from '../mock-db';
import { AuthService } from '../auth/auth.service';

@Module({
  providers: [BiometricsService, MockDatabase, AuthService],
  controllers: [BiometricsController],
  exports: [BiometricsService],
})
export class BiometricsModule {}
