import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../auth/auth.module';
import { RolesGuard } from '../auth/roles.guard';
import { RequirePermissions } from '../auth/permissions.decorator';

@Controller('analytics')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AnalyticsController {
  constructor(private service: AnalyticsService) {}

  @Get('summary')
  @RequirePermissions('view:reports')
  getSummary(@Req() req: any) {
    return this.service.getSummary(req.user?.roleName);
  }

  @Get('charts')
  @RequirePermissions('view:reports')
  getCharts(@Req() req: any) {
    return this.service.getCharts(req.user?.roleName);
  }

  @Get('recent')
  @RequirePermissions('view:reports')
  getRecent(@Req() req: any) {
    return this.service.getRecentData(req.user?.roleName, req.user?.id);
  }
}
