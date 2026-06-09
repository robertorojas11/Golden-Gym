import { Module } from '@nestjs/common';
import { MembersService } from './members.service';
import { MembersController } from './members.controller';
import { MockDatabase } from '../mock-db';
import { AuthService } from '../auth/auth.service';

@Module({
  providers: [MembersService, MockDatabase, AuthService],
  controllers: [MembersController],
  exports: [MembersService],
})
export class MembersModule {}
