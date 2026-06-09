import { Controller, Get, Post, Put, Param, Body, UseGuards, Req } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { JwtAuthGuard } from '../auth/auth.module';
import { RolesGuard } from '../auth/roles.guard';
import { RequirePermissions } from '../auth/permissions.decorator';

@Controller('payments')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PaymentsController {
  constructor(private service: PaymentsService) {}

  @Get()
  @RequirePermissions('view:reports')
  findAll() {
    return this.service.findAll();
  }

  @Get('member/:memberId')
  @RequirePermissions('manage:access')
  findMemberPayments(@Param('memberId') memberId: string) {
    return this.service.findMemberPayments(memberId);
  }

  @Post()
  @RequirePermissions('manage:payments')
  registerPayment(@Body() body: any, @Req() req: any) {
    // Inject the current user as the processedBy operator
    const processedBy = req.user?.id || '33333333-3333-3333-3333-333333333333';
    return this.service.registerPayment({
      ...body,
      processedBy,
    });
  }

  @Put(':id/refund')
  @RequirePermissions('manage:payments')
  refundPayment(@Param('id') id: string) {
    return this.service.refundPayment(id);
  }
}
