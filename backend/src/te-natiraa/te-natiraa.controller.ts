import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/optional-jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import { UserRole } from '../entities/user.entity';
import { TeNatiraaService } from './te-natiraa.service';
import { CreateTeNatiraaCheckoutSessionDto } from './dto/create-checkout-session.dto';

@ApiTags('te-natiraa')
@Controller('te-natiraa')
export class TeNatiraaController {
  constructor(private readonly teNatiraaService: TeNatiraaService) {}

  @Post('process-pending/:sessionId')
  @ApiOperation({
    summary: 'Process Te Natira\'a payment after Stripe redirect',
    description: 'Public endpoint. Call when user returns from Stripe with session_id. Idempotent.',
  })
  @ApiResponse({ status: 200, description: 'Payment processed' })
  async processPending(
    @Param('sessionId') sessionId: string,
  ) {
    return this.teNatiraaService.processPendingBySessionId(sessionId);
  }

  @Post('create-checkout-session')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({
    summary: 'Create Stripe checkout session for Te Natira\'a registration',
    description: 'Creates a one-time payment session. Auth optional - member price if logged in as member.',
  })
  @ApiResponse({ status: 201, description: 'Checkout session created' })
  async createCheckoutSession(
    @Body() dto: CreateTeNatiraaCheckoutSessionDto,
    @CurrentUser() user?: { id: number; role: string },
  ) {
    return this.teNatiraaService.createCheckoutSession(dto, user?.id, user?.role);
  }

  @Post('validate/:qrCode')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Validate a QR code (mark as used)',
    description: 'Admin only. Marks the ticket as validated and returns adult/child counts.',
  })
  @ApiResponse({ status: 200, description: 'Validation result' })
  async validateQrCode(@Param('qrCode') qrCode: string) {
    return this.teNatiraaService.validateQrCode(qrCode);
  }

  @Get('registrations')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'List all Te Natira\'a registrations',
    description: 'Admin only. Paginated list.',
  })
  @ApiResponse({ status: 200, description: 'Paginated registrations' })
  async getRegistrations(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNum = Math.max(1, parseInt(page || '1', 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit || '50', 10) || 50));
    return this.teNatiraaService.getRegistrations(pageNum, limitNum);
  }
}
