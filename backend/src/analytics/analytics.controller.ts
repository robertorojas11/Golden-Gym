import { Controller, Get, UseGuards } from '@nestjs/common';
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
  getSummary() {
    return this.service.getSummary();
  }

  @Get('charts')
  @RequirePermissions('view:reports')
  getCharts() {
    return this.service.getCharts();
  }

  @Get('recent')
  @RequirePermissions('view:reports')
  getRecent() {
    return this.service.getRecentData();
  }
}
