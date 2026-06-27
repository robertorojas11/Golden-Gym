import { Controller, Post, Body, UnauthorizedException, Get, Headers, Param, Put, ForbiddenException } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  async login(@Body() body: any) {
    const user = await this.authService.validateUser(body.email, body.password);
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }
    return this.authService.login(user);
  }

  @Post('change-password')
  async changePassword(@Headers('authorization') authHeader: string, @Body() body: { newPassword?: string }) {
    if (!authHeader) {
      throw new UnauthorizedException('Missing auth token');
    }
    const token = authHeader.replace('Bearer ', '');
    const decoded = this.authService.decodeToken(token);
    if (!decoded) {
      throw new UnauthorizedException('Invalid or expired token');
    }
    if (!body.newPassword || body.newPassword.length < 8) {
      throw new UnauthorizedException('New password must be at least 8 characters long');
    }
    const success = await this.authService.changePassword(decoded.email, body.newPassword);
    if (!success) {
      throw new UnauthorizedException('User not found');
    }
    return { success: true };
  }

  @Get('profile')
  async getProfile(@Headers('authorization') authHeader: string) {
    if (!authHeader) {
      throw new UnauthorizedException('Missing auth token');
    }
    const token = authHeader.replace('Bearer ', '');
    const user = this.authService.decodeToken(token);
    if (!user) {
      throw new UnauthorizedException('Invalid or expired token');
    }
    return user;
  }

  @Get('users')
  async getUsers(@Headers('authorization') authHeader: string) {
    this.verifyOwner(authHeader);
    return this.authService.getUsers();
  }

  @Post('users')
  async createUser(@Headers('authorization') authHeader: string, @Body() body: any) {
    this.verifyOwner(authHeader);
    return this.authService.createUser(body);
  }

  @Put('users/:id')
  async updateUser(@Headers('authorization') authHeader: string, @Param('id') id: string, @Body() body: any) {
    this.verifyOwner(authHeader);
    return this.authService.updateUser(id, body);
  }

  @Put('users/:id/toggle')
  async toggleUserActive(
    @Headers('authorization') authHeader: string,
    @Param('id') id: string,
    @Body('isActive') isActive: boolean
  ) {
    this.verifyOwner(authHeader);
    return this.authService.toggleUserActive(id, isActive);
  }

  private verifyOwner(authHeader: string) {
    if (!authHeader) {
      throw new UnauthorizedException('Missing auth token');
    }
    const token = authHeader.replace('Bearer ', '');
    const user = this.authService.decodeToken(token);
    if (!user) {
      throw new UnauthorizedException('Invalid or expired token');
    }
    if (user.roleName !== 'owner') {
      throw new ForbiddenException('Only owners can manage users');
    }
    return user;
  }
}

