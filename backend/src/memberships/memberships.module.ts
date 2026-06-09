import { Module } from '@nestjs/common';
import { MembershipsService } from './memberships.service';
import { MembershipsController } from './memberships.controller';
import { AuthService } from '../auth/auth.service';

@Module({
  providers: [MembershipsService, AuthService],
  controllers: [MembershipsController],
  exports: [MembershipsService],
})
export class MembershipsModule {}
