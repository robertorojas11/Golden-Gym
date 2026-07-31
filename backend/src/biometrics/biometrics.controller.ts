import { Controller, Post, Body, Get, Delete, Param, UseGuards, Query } from '@nestjs/common';
import { BiometricsService } from './biometrics.service';
import { JwtAuthGuard } from '../auth/auth.module';
import { RolesGuard } from '../auth/roles.guard';
import { RequirePermissions } from '../auth/permissions.decorator';

@Controller('biometric')
export class BiometricsController {
  constructor(private service: BiometricsService) {}

  @Post('scan')
  scan(@Body() body: { memberId?: string; forceResult?: string; scanId?: string }) {
    return this.service.scanFingerprint(body);
  }

  @Get('logs')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @RequirePermissions('view:reports')
  getLogs(@Query('memberId') memberId?: string) {
    return this.service.getAccessLogs(memberId);
  }

  @Post('enroll')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @RequirePermissions('manage:memberships')
  enrollFingerprint(@Body() body: { memberId: string; fingerIndex: number; templateData: string }) {
    return this.service.registerFingerprint(body.memberId, body.fingerIndex, body.templateData);
  }

  @Delete('enroll/:memberId/:fingerIndex')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @RequirePermissions('manage:memberships')
  deleteFingerprint(@Param('memberId') memberId: string, @Param('fingerIndex') fingerIndex: string) {
    return this.service.deleteFingerprint(memberId, parseInt(fingerIndex, 10));
  }

  @Get('templates')
  getAllTemplates() {
    return this.service.getAllFingerprints();
  }

  @Get('member/:memberId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @RequirePermissions('manage:access')
  getMemberFingerprints(@Param('memberId') memberId: string) {
    return this.service.getMemberFingerprints(memberId);
  }
}
