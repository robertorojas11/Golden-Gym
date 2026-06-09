import { Controller, Post, Body, Get, UseGuards } from '@nestjs/common';
import { BiometricsService } from './biometrics.service';
import { JwtAuthGuard } from '../auth/auth.module';
import { RolesGuard } from '../auth/roles.guard';
import { RequirePermissions } from '../auth/permissions.decorator';

@Controller('biometric')
export class BiometricsController {
  constructor(private service: BiometricsService) {}

  @Post('scan')
  scan(@Body() body: { memberId?: string; forceResult?: string }) {
    return this.service.scanFingerprint(body);
  }

  @Get('logs')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @RequirePermissions('view:reports')
  getLogs() {
    return this.service.getAccessLogs();
  }
}
