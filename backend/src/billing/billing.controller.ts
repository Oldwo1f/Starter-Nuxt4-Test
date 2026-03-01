import { Body, Controller, Get, Headers, Post, Param, ParseIntPipe, UnauthorizedException, UseGuards, InternalServerErrorException } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags, ApiParam } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { BillingService } from './billing.service';
import { CreateBankTransferIntentDto } from './dto/create-bank-transfer-intent.dto';
import { BankTransferWebhookDto } from './dto/bank-transfer-webhook.dto';
import { RequestLegacyVerificationDto } from './dto/request-legacy-verification.dto';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../entities/user.entity';

@ApiTags('billing')
@Controller('billing')
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Post('bank-transfer/intent')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Create or reuse a bank transfer intent (referenceId)',
    description:
      'Generates a unique referenceId to be included in the bank transfer label. Reuses the latest pending intent for the same pack.',
  })
  @ApiResponse({ status: 201, description: 'Intent created/reused successfully' })
  async createIntent(@CurrentUser() user: any, @Body() dto: CreateBankTransferIntentDto) {
    return this.billingService.createOrReuseBankTransferIntent(user.id, dto.pack);
  }

  @Get('bank-transfer/me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get latest bank transfer payment status for current user',
  })
  @ApiResponse({ status: 200, description: 'Latest payment status retrieved' })
  async getMyPayment(@CurrentUser() user: any) {
    return this.billingService.getMyLatestBankTransferPayment(user.id);
  }

  @Post('bank-transfer/webhook')
  @ApiOperation({
    summary: 'Webhook endpoint (N8N) to confirm a bank transfer',
    description:
      'Protected by X-Webhook-Secret header. Confirms payment and grants 1-year access.',
  })
  @ApiResponse({ status: 201, description: 'Webhook processed' })
  async webhook(
    @Headers('x-webhook-secret') secret: string | undefined,
    @Body() dto: BankTransferWebhookDto,
  ) {
    const expected = process.env.BANK_TRANSFER_WEBHOOK_SECRET;
    if (!expected || expected.length < 12) {
      // Misconfiguration protection
      throw new InternalServerErrorException('Webhook secret not configured');
    }
    if (!secret || secret !== expected) {
      throw new UnauthorizedException();
    }

    return this.billingService.processBankTransferWebhook(dto);
  }

  @Post('bank-transfer/request-verification')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Request manual verification for a bank transfer payment',
    description:
      'Marks the payment as needing verification and grants temporary 1-year access. Admin must confirm later.',
  })
  @ApiResponse({ status: 201, description: 'Verification requested successfully' })
  async requestVerification(
    @CurrentUser() user: any,
    @Body() body: { paymentId: number },
  ) {
    return this.billingService.requestVerification(user.id, body.paymentId);
  }

  @Get('bank-transfer/pending-verifications')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get all pending verifications (Admin only)',
    description: 'Returns list of payments that need manual admin verification',
  })
  @ApiResponse({ status: 200, description: 'Pending verifications retrieved' })
  async getPendingVerifications(@CurrentUser() user: any) {
    return this.billingService.getPendingVerifications();
  }

  @Post('bank-transfer/confirm-verification/:paymentId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Confirm a verification and grant Pūpū d\'inscription (Admin only)',
    description:
      'Confirms the payment, marks it as paid, and grants the user their inscription Pūpū (50 for Te Ohi, 100 for Umete)',
  })
  @ApiParam({ name: 'paymentId', type: Number, description: 'Payment ID to confirm' })
  @ApiResponse({ status: 201, description: 'Verification confirmed and Pūpū granted' })
  async confirmVerification(
    @CurrentUser() user: any,
    @Param('paymentId', ParseIntPipe) paymentId: number,
  ) {
    return this.billingService.confirmVerification(paymentId, user.id);
  }

  // Legacy payment verification endpoints
  @Post('legacy/request-verification')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Request manual verification for a legacy payment (old system)',
    description:
      'Creates a verification request for payments made with Naho or Tamiga on the old system. Grants optimistic Te Ohi access (member role, 1 year). Admin must confirm later to grant Pūpū.',
  })
  @ApiResponse({ status: 201, description: 'Verification requested successfully' })
  async requestLegacyVerification(
    @CurrentUser() user: any,
    @Body() dto: RequestLegacyVerificationDto,
  ) {
    return this.billingService.requestLegacyVerification(user.id, dto.paidWith);
  }

  @Get('legacy/me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get current user legacy verification status',
    description: 'Returns the pending legacy verification for the current user, if any',
  })
  @ApiResponse({ status: 200, description: 'Legacy verification status retrieved' })
  async getMyLegacyVerification(@CurrentUser() user: any) {
    return this.billingService.getMyLegacyVerification(user.id);
  }

  @Get('legacy/pending-verifications')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get all pending legacy verifications (Admin only)',
    description: 'Returns list of legacy payment verifications that need manual admin confirmation',
  })
  @ApiResponse({ status: 200, description: 'Pending legacy verifications retrieved' })
  async getPendingLegacyVerifications(@CurrentUser() user: any) {
    return this.billingService.getPendingLegacyVerifications();
  }

  @Post('legacy/confirm-verification/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Confirm a legacy verification and grant Pūpū d\'inscription (Admin only)',
    description:
      'Confirms the legacy payment verification, grants Pūpū d\'inscription (50 for Te Ohi), and optionally upgrades user to premium. Can set custom expiration date with day/month.',
  })
  @ApiParam({ name: 'id', type: Number, description: 'Verification ID to confirm' })
  @ApiResponse({ status: 201, description: 'Verification confirmed and Pūpū granted' })
  async confirmLegacyVerification(
    @CurrentUser() user: any,
    @Param('id', ParseIntPipe) verificationId: number,
    @Body() body: { upgradeToPremium?: boolean; expirationDay?: number; expirationMonth?: number },
  ) {
    return this.billingService.confirmLegacyVerification(
      verificationId,
      user.id,
      body.upgradeToPremium || false,
      body.expirationDay,
      body.expirationMonth,
    );
  }

  @Post('legacy/reject-verification/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Reject a legacy verification and remove user rights (Admin only)',
    description:
      'Rejects the legacy payment verification and removes user rights (role → user, paidAccessExpiresAt → null).',
  })
  @ApiParam({ name: 'id', type: Number, description: 'Verification ID to reject' })
  @ApiResponse({ status: 201, description: 'Verification rejected and rights removed' })
  async rejectLegacyVerification(
    @CurrentUser() user: any,
    @Param('id', ParseIntPipe) verificationId: number,
  ) {
    return this.billingService.rejectLegacyVerification(verificationId, user.id);
  }
}

