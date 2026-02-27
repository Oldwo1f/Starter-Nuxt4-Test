import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UsersService } from '../users/users.service';
import { UserRole } from '../entities/user.entity';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private usersService: UsersService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
    });
  }

  async validate(payload: any) {
    const user = await this.usersService.findById(payload.sub);
    if (!user) {
      throw new UnauthorizedException();
    }
    const now = new Date();
    let effectiveRole: UserRole = user.role;

    // Downgrade paid roles when expired (staff roles are never affected)
    const isPaidUserRole =
      user.role === UserRole.MEMBER ||
      user.role === UserRole.PREMIUM ||
      user.role === UserRole.VIP;

    if (isPaidUserRole && user.paidAccessExpiresAt && user.paidAccessExpiresAt < now) {
      effectiveRole = UserRole.USER;
    }

    return { id: user.id, email: user.email, role: effectiveRole };
  }
}

