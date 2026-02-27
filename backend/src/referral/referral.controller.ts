import {
  Controller,
  Get,
  UseGuards,
  Request,
  Param,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { ReferralService } from './referral.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../entities/user.entity';

@ApiTags('referral')
@Controller('referral')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class ReferralController {
  constructor(private readonly referralService: ReferralService) {}

  @Get('code')
  @ApiOperation({
    summary: 'Get referral code',
    description: 'Get or generate the referral code for the authenticated user',
  })
  @ApiResponse({ status: 200, description: 'Referral code retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getReferralCode(@Request() req) {
    const code = await this.referralService.getReferralCode(req.user.id);
    return { code };
  }

  @Get('referrals')
  @ApiOperation({
    summary: 'Get referrals',
    description: 'Get all referrals (filleuls) of the authenticated user',
  })
  @ApiResponse({ status: 200, description: 'Referrals retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getReferrals(@Request() req) {
    const referrals = await this.referralService.getReferrals(req.user.id);
    return { referrals };
  }

  @Get('stats')
  @ApiOperation({
    summary: 'Get referral statistics',
    description: 'Get referral statistics for the authenticated user',
  })
  @ApiResponse({ status: 200, description: 'Statistics retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getStats(@Request() req) {
    const stats = await this.referralService.getReferralStats(req.user.id);
    return stats;
  }

  @Get('user/:userId/stats')
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOperation({
    summary: 'Get referral statistics for a specific user (Admin only)',
    description: 'Get referral statistics for a specific user by ID. Admin only.',
  })
  @ApiParam({ name: 'userId', type: 'number', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'Statistics retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin role required' })
  async getUserStats(@Param('userId', ParseIntPipe) userId: number) {
    const stats = await this.referralService.getReferralStats(userId);
    const referrals = await this.referralService.getReferrals(userId);
    const user = await this.referralService.getReferralCode(userId);
    return {
      referralCode: user,
      stats,
      referrals,
    };
  }

  @Get('user/:userId/code')
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOperation({
    summary: 'Get referral code for a specific user (Admin only)',
    description: 'Get referral code for a specific user by ID. Admin only.',
  })
  @ApiParam({ name: 'userId', type: 'number', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'Referral code retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin role required' })
  async getUserReferralCode(@Param('userId', ParseIntPipe) userId: number) {
    const code = await this.referralService.getReferralCode(userId);
    return { code };
  }
}
