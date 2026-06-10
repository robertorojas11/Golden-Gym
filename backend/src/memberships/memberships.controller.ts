import { Controller, Get, Post, Put, Param, Body, UseGuards, Query, Req, ForbiddenException } from '@nestjs/common';
import { MembershipsService } from './memberships.service';
import { JwtAuthGuard } from '../auth/auth.module';
import { RolesGuard } from '../auth/roles.guard';
import { RequirePermissions } from '../auth/permissions.decorator';

@Controller('memberships')
@UseGuards(JwtAuthGuard, RolesGuard)
export class MembershipsController {
  constructor(private service: MembershipsService) {}

  @Get('plans')
  @RequirePermissions('manage:access')
  findAllPlans() {
    return this.service.findAllPlans();
  }

  @Get('member/:memberId')
  @RequirePermissions('manage:access')
  findMemberMemberships(@Param('memberId') memberId: string) {
    return this.service.findMemberMemberships(memberId);
  }

  @Post('assign')
  @RequirePermissions('manage:memberships')
  assignPlan(@Body() body: { memberId: string; planId: string }) {
    return this.service.assignPlan(body.memberId, body.planId);
  }

  @Put('plans/:id')
  updatePlan(@Param('id') id: string, @Body() body: any, @Req() req: any) {
    if (req.user?.roleName !== 'owner') {
      throw new ForbiddenException('Only owners can edit plans');
    }
    return this.service.updatePlan(id, body);
  }

  @Put(':id/cancel')
  @RequirePermissions('manage:memberships')
  cancelMembership(@Param('id') id: string) {
    return this.service.cancelMembership(id);
  }

  @Put(':id')
  updateMembership(@Param('id') id: string, @Body() body: any, @Req() req: any) {
    if (req.user?.roleName !== 'owner') {
      throw new ForbiddenException('Only owners can edit memberships');
    }
    return this.service.updateMembership(id, body);
  }
}
