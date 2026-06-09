import { Module } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { MockDatabase } from '../mock-db';
import { AuthService } from '../auth/auth.service';

@Module({
  providers: [PaymentsService, MockDatabase, AuthService],
  controllers: [PaymentsController],
  exports: [PaymentsService],
})
export class PaymentsModule {}
