import { Controller, Get, Post, Put, Param, Body, UseGuards, Req, ForbiddenException } from '@nestjs/common';
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
    const userRole = req.user?.roleName || 'receptionist';

    const discount = body.discount || 0;
    if (discount > 0 && userRole !== 'owner' && userRole !== 'administrator') {
      throw new ForbiddenException('Solo los administradores o propietarios pueden aplicar descuentos.');
    }

    return this.service.registerPayment({
      ...body,
      processedBy,
    });
  }

}
