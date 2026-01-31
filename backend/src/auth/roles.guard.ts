import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '../entities/user.entity';
import { ROLES_KEY } from './roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  // Role hierarchy: superadmin > admin > moderator > (user roles: vip > premium > member > user)
  private readonly roleHierarchy: Record<UserRole, number> = {
    [UserRole.SUPERADMIN]: 100,
    [UserRole.ADMIN]: 80,
    [UserRole.MODERATOR]: 60,
    [UserRole.VIP]: 40,
    [UserRole.PREMIUM]: 30,
    [UserRole.MEMBER]: 20,
    [UserRole.USER]: 10,
  };

  private getRoleLevel(role: UserRole): number {
    return this.roleHierarchy[role] || 0;
  }

  private hasRequiredRole(userRole: UserRole, requiredRoles: UserRole[]): boolean {
    // Check if user has exact role match
    if (requiredRoles.includes(userRole)) {
      return true;
    }

    // Check if user has higher role in hierarchy
    const userLevel = this.getRoleLevel(userRole);
    return requiredRoles.some((requiredRole) => {
      const requiredLevel = this.getRoleLevel(requiredRole);
      return userLevel >= requiredLevel;
    });
  }

  private isStaffRole(role: UserRole): boolean {
    return [UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.MODERATOR].includes(role);
  }

  private isUserRole(role: UserRole): boolean {
    return [UserRole.USER, UserRole.MEMBER, UserRole.PREMIUM, UserRole.VIP].includes(role);
  }

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles) {
      return true;
    }
    const { user } = context.switchToHttp().getRequest();
    if (!user || !user.role) {
      return false;
    }
    return this.hasRequiredRole(user.role, requiredRoles);
  }
}

