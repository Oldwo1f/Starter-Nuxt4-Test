import { Controller, Post, Body, Patch, Get, UnauthorizedException, HttpCode, HttpStatus, NotImplementedException, UseGuards, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { CurrentUser } from './current-user.decorator';
import { UsersService } from '../users/users.service';
import { UploadService } from '../upload/upload.service';

export class LoginDto {
  @ApiProperty({
    description: 'User email address',
    example: 'user@example.com',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'User password',
    example: 'password123',
    minLength: 6,
  })
  @IsString()
  @MinLength(6)
  password: string;
}

export class RegisterDto {
  @ApiProperty({
    description: 'User email address',
    example: 'user@example.com',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'User password',
    example: 'password123',
    minLength: 6,
  })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiProperty({
    description: 'User first name',
    example: 'John',
    required: false,
  })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiProperty({
    description: 'User last name',
    example: 'Doe',
    required: false,
  })
  @IsOptional()
  @IsString()
  lastName?: string;
}

export class ForgotPasswordDto {
  @ApiProperty({
    description: 'User email address',
    example: 'user@example.com',
  })
  @IsEmail()
  email: string;
}

export class ResetPasswordDto {
  @ApiProperty({
    description: 'Password reset token received via email',
    example: 'abc123def456...',
  })
  @IsString()
  token: string;

  @ApiProperty({
    description: 'New password',
    example: 'newpassword123',
    minLength: 6,
  })
  @IsString()
  @MinLength(6)
  newPassword: string;
}

export class FacebookLoginDto {
  @ApiProperty({
    description: 'Facebook user ID',
    example: '123456789',
  })
  @IsString()
  facebookId: string;

  @ApiProperty({
    description: 'Facebook user email',
    example: 'user@facebook.com',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'Facebook access token (for verification)',
    example: 'EAABwzLix...',
  })
  @IsString()
  accessToken: string;
}

export class UpdateProfileDto {
  @ApiProperty({
    description: 'User first name',
    example: 'John',
    required: false,
  })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiProperty({
    description: 'User last name',
    example: 'Doe',
    required: false,
  })
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiProperty({
    description: 'User avatar image URL',
    example: 'https://example.com/avatar.jpg',
    required: false,
  })
  @IsOptional()
  @IsString()
  avatarImage?: string;
}

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private usersService: UsersService,
    private uploadService: UploadService,
  ) {}

  @Post('login')
  @ApiOperation({ summary: 'Login user', description: 'Authenticate user and return JWT token' })
  @ApiBody({ type: LoginDto })
  @ApiResponse({ status: 200, description: 'Login successful, returns JWT token' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(@Body() loginDto: LoginDto) {
    const user = await this.authService.validateUser(
      loginDto.email,
      loginDto.password,
    );
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    return this.authService.login(user);
  }

  @Post('register')
  @ApiOperation({ summary: 'Register new user', description: 'Create a new user account' })
  @ApiBody({ type: RegisterDto })
  @ApiResponse({ status: 201, description: 'User successfully registered' })
  @ApiResponse({ status: 400, description: 'Invalid input or user already exists' })
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(
      registerDto.email,
      registerDto.password,
      registerDto.firstName,
      registerDto.lastName,
    );
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Request password reset',
    description: 'Request a password reset link to be sent to the provided email address',
  })
  @ApiBody({ type: ForgotPasswordDto })
  @ApiResponse({
    status: 200,
    description: 'If the email exists, a reset link has been sent (response is generic for security)',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example: 'If an account with that email exists, a password reset link has been sent.',
        },
      },
    },
  })
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    await this.authService.requestPasswordReset(forgotPasswordDto.email);
    return {
      message: 'If an account with that email exists, a password reset link has been sent.',
    };
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Reset password',
    description: 'Reset password using the token received via email',
  })
  @ApiBody({ type: ResetPasswordDto })
  @ApiResponse({
    status: 200,
    description: 'Password successfully reset',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example: 'Password has been successfully reset.',
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid or expired reset token' })
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    await this.authService.resetPassword(
      resetPasswordDto.token,
      resetPasswordDto.newPassword,
    );
    return {
      message: 'Password has been successfully reset.',
    };
  }

  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Verify email address',
    description: 'Verify user email address using the token received via email',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        token: {
          type: 'string',
          description: 'Email verification token received via email',
          example: 'abc123def456...',
        },
      },
      required: ['token'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Email successfully verified',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example: 'Email has been successfully verified.',
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid or expired verification token' })
  async verifyEmail(@Body() body: { token: string }) {
    await this.authService.verifyEmail(body.token);
    return {
      message: 'Email has been successfully verified.',
    };
  }

  @Post('resend-verification')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Resend email verification',
    description: 'Request a new email verification link to be sent to the provided email address',
  })
  @ApiBody({ type: ForgotPasswordDto })
  @ApiResponse({
    status: 200,
    description: 'If the email exists and is not verified, a verification link has been sent',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example: 'If an account with that email exists and is not verified, a verification link has been sent.',
        },
      },
    },
  })
  async resendVerification(@Body() forgotPasswordDto: ForgotPasswordDto) {
    await this.authService.requestEmailVerification(forgotPasswordDto.email);
    return {
      message: 'If an account with that email exists and is not verified, a verification link has been sent.',
    };
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get current user profile',
    description: 'Retrieve the profile of the authenticated user',
  })
  @ApiResponse({ status: 200, description: 'User profile retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getProfile(@CurrentUser() user: any) {
    const fullUser = await this.usersService.findById(user.id);
    if (!fullUser) {
      throw new UnauthorizedException('User not found');
    }
    const { password, resetToken, resetTokenExpiry, emailVerificationToken, emailVerificationTokenExpiry, ...profile } = fullUser;
    return profile;
  }

  @Patch('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Update current user profile',
    description: 'Update the profile of the authenticated user (firstName, lastName, avatarImage)',
  })
  @ApiBody({ type: UpdateProfileDto })
  @ApiResponse({ status: 200, description: 'Profile updated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async updateProfile(@CurrentUser() user: any, @Body() updateProfileDto: UpdateProfileDto) {
    const updatedUser = await this.usersService.updateUser(user.id, {
      firstName: updateProfileDto.firstName,
      lastName: updateProfileDto.lastName,
      avatarImage: updateProfileDto.avatarImage,
    });
    const { password, resetToken, resetTokenExpiry, emailVerificationToken, emailVerificationTokenExpiry, ...profile } = updatedUser;
    return profile;
  }

  @Post('upload-avatar')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('avatar'))
  @ApiBearerAuth('JWT-auth')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Upload avatar image',
    description: 'Upload and crop an avatar image for the authenticated user',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        avatar: {
          type: 'string',
          format: 'binary',
          description: 'Avatar image file (JPEG, PNG, or WebP, max 5MB)',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Avatar uploaded successfully',
    schema: {
      type: 'object',
      properties: {
        avatarUrl: {
          type: 'string',
          example: '/uploads/avatars/1/1234567890-uuid.jpg',
        },
        message: {
          type: 'string',
          example: 'Avatar uploaded successfully',
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid file or file too large' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async uploadAvatar(@CurrentUser() user: any, @UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Aucun fichier fourni');
    }

    // Valider le fichier
    this.uploadService.validateFile(file);

    // Récupérer l'utilisateur actuel pour supprimer l'ancien avatar
    const currentUser = await this.usersService.findById(user.id);
    if (!currentUser) {
      throw new UnauthorizedException('User not found');
    }

    // Supprimer l'ancien avatar s'il existe
    if (currentUser.avatarImage) {
      await this.uploadService.deleteOldAvatar(currentUser.avatarImage);
    }

    // Sauvegarder le nouvel avatar
    const avatarUrl = await this.uploadService.saveAvatar(user.id, file);

    // Mettre à jour l'utilisateur dans la base de données
    const updatedUser = await this.usersService.updateUser(user.id, {
      avatarImage: avatarUrl,
    });

    return {
      avatarUrl,
      message: 'Avatar uploaded successfully',
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        avatarImage: updatedUser.avatarImage,
        role: updatedUser.role,
        emailVerified: updatedUser.emailVerified,
        isActive: updatedUser.isActive,
      },
    };
  }

  @Post('facebook')
  @ApiOperation({
    summary: 'Facebook OAuth login',
    description: 'Authenticate user using Facebook OAuth (Coming soon)',
  })
  @ApiBody({ type: FacebookLoginDto })
  @ApiResponse({ status: 501, description: 'Facebook OAuth not yet implemented' })
  async facebookLogin(@Body() facebookLoginDto: FacebookLoginDto) {
    // TODO: Implement Facebook OAuth verification
    throw new NotImplementedException('Facebook OAuth is not yet implemented');
  }
}

