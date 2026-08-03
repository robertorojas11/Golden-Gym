import { Injectable, UnauthorizedException, NotFoundException } from '@nestjs/common';
import { MockDatabase, User } from '../mock-db';
import { createHash, randomUUID } from 'crypto';

@Injectable()
export class AuthService {
  constructor(private db: MockDatabase) {}

  async validateUser(email: string, pass: string): Promise<User | null> {
    const user = this.db.users.find((u) => u.email === email);
    if (user) {
      const hashedPass = createHash('sha256').update(pass).digest('hex');
      if (user.passwordHash === hashedPass) {
        return user;
      }
    }
    return null;
  }

  async login(user: User) {
    const permissions = this.getEffectivePermissions(user);
    const payload = {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      roleName: user.roleName,
      permissions,
      mustChangePassword: !!user.mustChangePassword,
    };
    
    // Generate simple Base64 JWT token simulation
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
    const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const token = `${header}.${data}.mocksignature`;

    return {
      access_token: token,
      user: payload,
    };
  }

  async changePassword(email: string, newPass: string): Promise<boolean> {
    const user = this.db.users.find((u) => u.email === email);
    if (user) {
      user.passwordHash = createHash('sha256').update(newPass).digest('hex');
      user.mustChangePassword = false;
      await this.db.saveUser(user);
      return true;
    }
    return false;
  }

  decodeToken(token: string): any {
    try {
      const parts = token.split('.');
      if (parts.length < 2) return null;
      const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
      // Keep existing receptionist sessions compatible when role permissions change.
      if (payload.roleName === 'receptionist') {
        payload.permissions = Array.from(new Set([
          ...(payload.permissions || []),
          'manage:memberships',
          'manage:payments',
          'manage:access',
        ]));
      }
      return payload;
    } catch (e) {
      return null;
    }
  }

  private getEffectivePermissions(user: User): string[] {
    if (user.roleName !== 'receptionist') return user.permissions;
    return Array.from(new Set([
      ...user.permissions,
      'manage:memberships',
      'manage:payments',
      'manage:access',
    ]));
  }

  getUsers() {
    return this.db.users;
  }

  async createUser(data: any) {
    const exists = this.db.users.some(u => u.email === data.email);
    if (exists) {
      throw new UnauthorizedException('User already exists');
    }
    const roleInfo = this.mapRole(data.roleName);
    const pass = data.password || 'Golden#2026';
    
    const newUser = {
      id: randomUUID(),
      email: data.email,
      passwordHash: createHash('sha256').update(pass).digest('hex'),
      firstName: data.firstName,
      lastName: data.lastName,
      roleId: roleInfo.id,
      roleName: roleInfo.name,
      permissions: this.getPermissionsForRole(roleInfo.id),
      isActive: true,
      mustChangePassword: true,
    };
    
    this.db.users.push(newUser);
    await this.db.saveUser(newUser);
    return newUser;
  }

  async updateUser(id: string, data: any) {
    const user = this.db.users.find(u => u.id === id);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    
    if (data.email) user.email = data.email;
    if (data.firstName) user.firstName = data.firstName;
    if (data.lastName) user.lastName = data.lastName;
    if (data.roleName) {
      const roleInfo = this.mapRole(data.roleName);
      user.roleId = roleInfo.id;
      user.roleName = roleInfo.name;
      user.permissions = this.getPermissionsForRole(roleInfo.id);
    }
    if (data.password) {
      user.passwordHash = createHash('sha256').update(data.password).digest('hex');
      user.mustChangePassword = true;
    }
    if (data.isActive !== undefined) user.isActive = data.isActive;
    
    await this.db.saveUser(user);
    return user;
  }

  async toggleUserActive(id: string, isActive: boolean) {
    const user = this.db.users.find(u => u.id === id);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    user.isActive = isActive;
    await this.db.saveUser(user);
    return user;
  }

  private mapRole(roleName: string) {
    const lower = roleName.toLowerCase();
    if (lower === 'owner' || lower === 'propietario') {
      return { id: '1a3b5c7d-9e11-4433-88bb-66cc77dd8801', name: 'owner' };
    }
    if (lower === 'administrator' || lower === 'administrador' || lower === 'gerente') {
      return { id: '2a4b6c8d-0e22-5544-99cc-77dd88ee9902', name: 'administrator' };
    }
    if (lower === 'receptionist' || lower === 'recepcionista') {
      return { id: '3a5b7c9d-1e33-6655-aacc-88ee99ff0003', name: 'receptionist' };
    }
    if (lower === 'clock') {
      return { id: '5a7b9c1d-3e55-8877-bbdd-ccddeeff0005', name: 'clock' };
    }
    return { id: '4a6b8c0d-2e44-7766-bbdd-99ff00aa1104', name: 'viewer' };
  }

  private getPermissionsForRole(roleId: string): string[] {
    if (roleId === '1a3b5c7d-9e11-4433-88bb-66cc77dd8801') {
      return ['create:users', 'manage:memberships', 'manage:payments', 'manage:access', 'view:reports', 'system:config'];
    }
    if (roleId === '2a4b6c8d-0e22-5544-99cc-77dd88ee9902') {
      return ['manage:memberships', 'manage:payments', 'manage:access', 'view:reports'];
    }
    if (roleId === '3a5b7c9d-1e33-6655-aacc-88ee99ff0003') {
      return ['manage:access', 'manage:memberships', 'manage:payments'];
    }
    if (roleId === '5a7b9c1d-3e55-8877-bbdd-ccddeeff0005') {
      return ['manage:access'];
    }
    return ['view:reports'];
  }
}

