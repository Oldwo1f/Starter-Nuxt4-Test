import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { User } from '../entities/user.entity';
import * as crypto from 'crypto';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.usersService.findByEmail(email);
    if (user && (await this.usersService.validatePassword(user, password))) {
      // Check if user is active
      if (!user.isActive) {
        return null;
      }
      // Update last login
      await this.usersService.updateLastLogin(user.id);
      const { password: _, ...result } = user;
      return result;
    }
    return null;
  }

  async login(user: User) {
    const payload = { email: user.email, sub: user.id, role: user.role };
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        avatarImage: user.avatarImage,
        role: user.role,
        emailVerified: user.emailVerified,
        isActive: user.isActive,
      },
    };
  }

  async register(
    email: string,
    password: string,
    firstName?: string,
    lastName?: string,
  ) {
    const existingUser = await this.usersService.findByEmail(email);
    if (existingUser) {
      throw new UnauthorizedException('User already exists');
    }
    const user = await this.usersService.create(email, password, undefined, firstName, lastName);

    // Generate email verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationTokenExpiry = new Date();
    verificationTokenExpiry.setHours(verificationTokenExpiry.getHours() + 24); // 24 hours expiry

    await this.usersService.setEmailVerificationToken(
      user.id,
      verificationToken,
      verificationTokenExpiry,
    );

    // TODO: Send verification email
    // For now, we'll just log it (in production, send email)
    console.log(`Email verification token for ${email}: ${verificationToken}`);
    console.log(
      `Verification link: ${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify-email?token=${verificationToken}`,
    );

    return this.login(user);
  }

  async requestPasswordReset(email: string): Promise<void> {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      // Don't reveal if email exists for security
      return;
    }

    // Generate secure reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date();
    resetTokenExpiry.setSeconds(
      resetTokenExpiry.getSeconds() +
        parseInt(process.env.RESET_TOKEN_EXPIRY || '3600', 10),
    );

    await this.usersService.setResetToken(email, resetToken, resetTokenExpiry);

    // TODO: Send email with reset link
    // For now, we'll just log it (in production, send email)
    console.log(`Password reset token for ${email}: ${resetToken}`);
    console.log(
      `Reset link: ${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`,
    );
  }

  async validateResetToken(token: string): Promise<User | null> {
    const user = await this.usersService.findByResetToken(token);
    if (!user) {
      return null;
    }

    if (!user.resetTokenExpiry || user.resetTokenExpiry < new Date()) {
      return null;
    }

    return user;
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const user = await this.validateResetToken(token);
    if (!user) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    await this.usersService.updatePassword(user.id, newPassword);
  }

  async requestEmailVerification(email: string): Promise<void> {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      // Don't reveal if email exists for security
      return;
    }

    if (user.emailVerified) {
      return; // Already verified
    }

    // Generate email verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationTokenExpiry = new Date();
    verificationTokenExpiry.setHours(verificationTokenExpiry.getHours() + 24); // 24 hours expiry

    await this.usersService.setEmailVerificationToken(
      user.id,
      verificationToken,
      verificationTokenExpiry,
    );

    // TODO: Send verification email
    // For now, we'll just log it (in production, send email)
    console.log(`Email verification token for ${email}: ${verificationToken}`);
    console.log(
      `Verification link: ${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify-email?token=${verificationToken}`,
    );
  }

  async verifyEmail(token: string): Promise<void> {
    const user = await this.usersService.verifyEmail(token);
    if (!user) {
      throw new BadRequestException('Invalid or expired verification token');
    }
  }

  // Facebook OAuth - prepared for future implementation
  async facebookLogin(facebookId: string, email: string): Promise<any> {
    // TODO: Implement Facebook OAuth verification
    // This is a placeholder structure
    throw new BadRequestException('Facebook OAuth not yet implemented');
  }
}

