import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UsersService } from '../users/users.service';
import { UserRole } from '../entities/user.entity';
import { effectiveUserRole, hasActiveCotisation, hasPremiumLifetime } from '../common/access-policy';

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
    if (!user.isActive) {
      throw new UnauthorizedException();
    }
    const effectiveRole = effectiveUserRole(user);

    return {
      id: user.id,
      email: user.email,
      role: effectiveRole,
      hasActiveCotisation: hasActiveCotisation(user),
      hasPremiumLifetime: hasPremiumLifetime(user),
    };
  }
}

