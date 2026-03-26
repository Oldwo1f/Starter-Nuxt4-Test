import { User, UserRole } from '../entities/user.entity';

export function hasActiveCotisation(user: Pick<User, 'paidAccessExpiresAt'>): boolean {
  const exp = user.paidAccessExpiresAt;
  if (!exp) return false;
  return new Date(exp) > new Date();
}

export function hasPremiumLifetime(user: Pick<User, 'premiumLifetimeGrantedAt'>): boolean {
  return user.premiumLifetimeGrantedAt != null;
}

/**
 * Role used for authorization after cotisation rules.
 * Premium + lifetime: stays premium when cotisation expires.
 * Member (no lifetime): downgrades to user when cotisation expires.
 */
export function effectiveUserRole(user: User): UserRole {
  const now = new Date();
  const isPaidTier =
    user.role === UserRole.MEMBER ||
    user.role === UserRole.PREMIUM ||
    user.role === UserRole.VIP;

  if (!isPaidTier) {
    return user.role;
  }

  const active = hasActiveCotisation(user);
  if (active) {
    return user.role;
  }

  if (user.role === UserRole.PREMIUM && hasPremiumLifetime(user)) {
    return UserRole.PREMIUM;
  }

  return UserRole.USER;
}
