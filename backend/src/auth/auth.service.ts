import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UsersService } from '../users/users.service';
import { ReferralService } from '../referral/referral.service';
import { User } from '../entities/user.entity';
import { RefreshToken } from '../entities/refresh-token.entity';
import * as crypto from 'crypto';
import axios from 'axios';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private referralService: ReferralService,
    @InjectRepository(RefreshToken)
    private refreshTokenRepository: Repository<RefreshToken>,
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
    const access_token = this.jwtService.sign(payload);
    
    // Générer un refresh token
    const refreshToken = await this.generateRefreshToken(user.id);
    
    return {
      access_token,
      refresh_token: refreshToken.token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        avatarImage: user.avatarImage,
        role: user.role,
        emailVerified: user.emailVerified,
        isActive: user.isActive,
        paidAccessExpiresAt: user.paidAccessExpiresAt,
      },
    };
  }

  async generateRefreshToken(userId: number): Promise<RefreshToken> {
    // Révoquer tous les refresh tokens existants pour cet utilisateur (rotation)
    // Cela garantit qu'un seul refresh token actif existe à la fois par utilisateur
    await this.refreshTokenRepository.update(
      { userId, revoked: false },
      { revoked: true },
    );

    // Générer un nouveau refresh token
    const token = crypto.randomBytes(64).toString('hex');
    const expiresAt = new Date();
    
    // Expiration configurable via variable d'environnement (défaut: 30 jours)
    // 30 jours est un bon compromis entre sécurité et UX
    // Pour une sécurité maximale, garder 7 jours
    // Pour une UX optimale, on peut aller jusqu'à 90 jours
    const refreshTokenExpiryDays = parseInt(process.env.REFRESH_TOKEN_EXPIRY_DAYS || '30', 10);
    expiresAt.setDate(expiresAt.getDate() + refreshTokenExpiryDays);

    const refreshToken = this.refreshTokenRepository.create({
      token,
      userId,
      expiresAt,
      revoked: false,
    });

    return this.refreshTokenRepository.save(refreshToken);
  }

  async refreshAccessToken(refreshTokenString: string) {
    // Trouver le refresh token
    const refreshToken = await this.refreshTokenRepository.findOne({
      where: { token: refreshTokenString },
      relations: ['user'],
    });

    if (!refreshToken) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Vérifier si le token est révoqué
    if (refreshToken.revoked) {
      throw new UnauthorizedException('Refresh token has been revoked');
    }

    // Vérifier si le token est expiré
    if (refreshToken.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token has expired');
    }

    // Vérifier si l'utilisateur existe et est actif
    const user = await this.usersService.findById(refreshToken.userId);
    if (!user || !user.isActive) {
      throw new UnauthorizedException('User not found or inactive');
    }

    // Générer un nouveau access token
    const payload = { email: user.email, sub: user.id, role: user.role };
    const access_token = this.jwtService.sign(payload);

    // Optionnel : générer un nouveau refresh token (rotation)
    const newRefreshToken = await this.generateRefreshToken(user.id);

    return {
      access_token,
      refresh_token: newRefreshToken.token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        avatarImage: user.avatarImage,
        role: user.role,
        emailVerified: user.emailVerified,
        isActive: user.isActive,
        paidAccessExpiresAt: user.paidAccessExpiresAt,
      },
    };
  }

  async revokeRefreshToken(refreshTokenString: string): Promise<void> {
    await this.refreshTokenRepository.update(
      { token: refreshTokenString },
      { revoked: true },
    );
  }

  async revokeAllUserRefreshTokens(userId: number): Promise<void> {
    await this.refreshTokenRepository.update(
      { userId, revoked: false },
      { revoked: true },
    );
  }

  async register(
    email: string,
    password: string,
    firstName?: string,
    lastName?: string,
    referralCode?: string,
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

    // Créer la relation de parrainage si un code est fourni
    if (referralCode) {
      try {
        await this.referralService.createReferral(referralCode, user.id);
      } catch (error) {
        // Ne pas bloquer l'inscription si le code est invalide, juste logger
        console.warn(`Invalid referral code during registration: ${referralCode}`, error);
      }
    }

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

  async changePassword(userId: number, currentPassword: string, newPassword: string): Promise<void> {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Check if user has a password (Facebook users might not have one)
    if (!user.password) {
      throw new BadRequestException('Password change not available for this account type');
    }

    // Validate current password
    const isCurrentPasswordValid = await this.usersService.validatePassword(user, currentPassword);
    if (!isCurrentPasswordValid) {
      throw new BadRequestException('Current password is incorrect');
    }

    // Update to new password
    await this.usersService.updatePassword(userId, newPassword);
    
    // Révoquer tous les refresh tokens pour sécurité (forcer reconnexion)
    await this.revokeAllUserRefreshTokens(userId);
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

