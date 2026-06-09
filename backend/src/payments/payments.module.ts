import { Module } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { AuthService } from '../auth/auth.service';

@Module({
  providers: [PaymentsService, AuthService],
  controllers: [PaymentsController],
  exports: [PaymentsService],
})
export class PaymentsModule {}
