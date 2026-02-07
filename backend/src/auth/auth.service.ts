import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { User } from '../entities/user.entity';
import * as crypto from 'crypto';
import axios from 'axios';

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

  // Facebook OAuth implementation
  async facebookLogin(facebookId: string, email: string, accessToken: string): Promise<any> {
    // Verify the Facebook access token
    try {
      const appId = process.env.FACEBOOK_APP_ID;
      const appSecret = process.env.FACEBOOK_APP_SECRET;
      
      if (!appId || !appSecret) {
        throw new BadRequestException('Facebook OAuth not configured');
      }

      // Get user info from Facebook (this also validates the token)
      const userInfoUrl = `https://graph.facebook.com/me?fields=id,email,first_name,last_name,picture&access_token=${accessToken}`;
      const userInfoResponse = await axios.get(userInfoUrl);

      const fbUser = userInfoResponse.data;
      
      // Validate Facebook ID matches
      if (fbUser.id !== facebookId) {
        throw new BadRequestException('Facebook ID mismatch');
      }

      // Validate email matches (if provided by Facebook)
      if (fbUser.email && fbUser.email !== email) {
        throw new BadRequestException('Email mismatch');
      }

      // Use email from Facebook if provided, otherwise use the one from request
      // If email is not available from Facebook, generate one based on Facebook ID
      let userEmail = fbUser.email || email;
      if (!userEmail) {
        // Generate a temporary email if not provided (user will need to add it later)
        userEmail = `fb_${facebookId}@facebook.temp`;
      }

      // Extract avatar URL from picture object
      let avatarImage: string | undefined;
      if (fbUser.picture?.data?.url) {
        avatarImage = fbUser.picture.data.url;
      }

      // Find or create user
      const user = await this.usersService.findOrCreateByFacebook(
        facebookId,
        userEmail,
        fbUser.first_name,
        fbUser.last_name,
        avatarImage,
      );

      // Check if user is active
      if (!user.isActive) {
        throw new UnauthorizedException('Account is inactive');
      }

      return this.login(user);
    } catch (error: any) {
      if (error instanceof BadRequestException || error instanceof UnauthorizedException) {
        throw error;
      }
      // Handle axios errors
      if (error.response?.data?.error) {
        const fbError = error.response.data.error;
        if (fbError.code === 190 || fbError.type === 'OAuthException') {
          throw new BadRequestException('Invalid or expired Facebook token');
        }
        throw new BadRequestException(`Facebook API error: ${fbError.message}`);
      }
      throw new BadRequestException('Failed to verify Facebook token');
    }
  }
}

