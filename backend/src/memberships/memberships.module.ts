import { Module } from '@nestjs/common';
import { MembershipsService } from './memberships.service';
import { MembershipsController } from './memberships.controller';
import { MockDatabase } from '../mock-db';
import { AuthService } from '../auth/auth.service';

@Module({
  providers: [MembershipsService, MockDatabase, AuthService],
  controllers: [MembershipsController],
  exports: [MembershipsService],
})
export class MembershipsModule {}
