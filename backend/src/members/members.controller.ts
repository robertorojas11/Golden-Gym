import { Controller, Get, Post, Put, Delete, Param, Query, Body, UseGuards, Req } from '@nestjs/common';
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
}
