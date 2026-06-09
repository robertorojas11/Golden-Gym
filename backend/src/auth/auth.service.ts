import { Injectable, UnauthorizedException } from '@nestjs/common';
import { MockDatabase, User } from '../mock-db';

@Injectable()
export class AuthService {
  constructor(private db: MockDatabase) {}

  async validateUser(email: string, pass: string): Promise<User | null> {
    const user = this.db.users.find((u) => u.email === email);
    if (user && pass === 'Password123') { // Simplified check for prototype mockup
      return user;
    }
    return null;
  }

  async login(user: User) {
    const payload = {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      roleName: user.roleName,
      permissions: user.permissions,
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

  decodeToken(token: string): any {
    try {
      const parts = token.split('.');
      if (parts.length < 2) return null;
      const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
      return payload;
    } catch (e) {
      return null;
    }
  }
}
