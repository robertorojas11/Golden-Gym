import { Module } from '@nestjs/common';
import { MembersService } from './members.service';
import { MembersController } from './members.controller';
import { AuthService } from '../auth/auth.service';

@Module({
  providers: [MembersService, AuthService],
  controllers: [MembersController],
  exports: [MembersService],
})
export class MembersModule {}
