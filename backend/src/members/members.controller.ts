import { Controller, Get, Post, Put, Delete, Param, Query, Body, UseGuards, Req, Res } from '@nestjs/common';
import type { Response } from 'express';
import { MembersService } from './members.service';
import { JwtAuthGuard } from '../auth/auth.module';
import { RolesGuard } from '../auth/roles.guard';
import { RequirePermissions } from '../auth/permissions.decorator';
import { Member } from '../mock-db';

@Controller('members')
@UseGuards(JwtAuthGuard, RolesGuard)
export class MembersController {
  constructor(private service: MembersService) {}

  @Get()
  @RequirePermissions('manage:access')
  findAll() {
    return this.service.findAll();
  }

  @Get('search')
  @RequirePermissions('manage:access')
  search(@Query('q') q: string) {
    return this.service.search(q || '');
  }

  @Get(':id')
  @RequirePermissions('manage:access')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Get(':id/photo')
  @RequirePermissions('manage:access')
  getPhoto(@Param('id') id: string, @Res() response: Response) {
    const photo = this.service.findOne(id).photoUrl;
    if (!photo) return response.status(404).end();
    const match = photo.match(/^data:([^;,]+);base64,(.+)$/);
    if (!match) return response.redirect(photo);
    response.setHeader('Content-Type', match[1]);
    response.setHeader('Cache-Control', 'private, max-age=3600');
    return response.send(Buffer.from(match[2], 'base64'));
  }

  @Post()
  @RequirePermissions('manage:access')
  create(@Body() body: Partial<Member>, @Req() req: any) {
    const userId = req.user?.id;
    return this.service.create(body, userId);
  }

  @Put(':id')
  @RequirePermissions('manage:access')
  update(@Param('id') id: string, @Body() body: Partial<Member>, @Req() req: any) {
    const userId = req.user?.id;
    return this.service.update(id, body, userId);
  }

  @Delete(':id')
  @RequirePermissions('manage:access')
  deactivate(@Param('id') id: string) {
    return this.service.deactivate(id);
  }

  @Post(':id/notes')
  @RequirePermissions('manage:access')
  addNote(@Param('id') id: string, @Body('note') note: string) {
    return this.service.addNote(id, note);
  }

  @Get(':id/documents')
  @RequirePermissions('manage:access')
  findDocuments(@Param('id') id: string) {
    return this.service.findDocuments(id);
  }

  @Get(':id/documents/:docId/download')
  @RequirePermissions('manage:access')
  downloadDocument(@Param('id') id: string, @Param('docId') docId: string, @Res() response: Response) {
    const document = this.service.findDocument(id, docId);
    const match = document.fileData.match(/^data:([^;,]+);base64,(.+)$/);
    response.setHeader('Content-Type', match?.[1] || document.mimeType || 'application/octet-stream');
    response.setHeader('Content-Disposition', `attachment; filename="${document.summary.replace(/["\\]/g, '_')}.pdf"`);
    return response.send(match ? Buffer.from(match[2], 'base64') : Buffer.from(document.fileData, 'base64'));
  }

  @Post(':id/documents')
  @RequirePermissions('manage:access')
  addDocument(@Param('id') id: string, @Body() body: { summary: string; fileData: string; mimeType?: string }) {
    return this.service.addDocument(id, body);
  }

  @Delete(':id/documents/:docId')
  @RequirePermissions('manage:access')
  deleteDocument(@Param('id') id: string, @Param('docId') docId: string) {
    return this.service.deleteDocument(id, docId);
  }
}
