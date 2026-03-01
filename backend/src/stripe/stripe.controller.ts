import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { StripeService } from './stripe.service';
import { CreateCheckoutSessionDto } from './dto/create-checkout-session.dto';
import { StripeWebhookGuard } from './guards/stripe-webhook.guard';

@ApiTags('stripe')
@Controller('stripe')
export class StripeController {
  constructor(private readonly stripeService: StripeService) {}

  @Post('create-checkout-session')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Create a Stripe checkout session',
    description: 'Creates a Stripe checkout session for subscription payment',
  })
  @ApiResponse({ status: 201, description: 'Checkout session created successfully' })
  async createCheckoutSession(
    @CurrentUser() user: any,
    @Body() dto: CreateCheckoutSessionDto,
  ) {
    return this.stripeService.createCheckoutSession(user.id, dto.pack);
  }

  @Post('webhook')
  @UseGuards(StripeWebhookGuard)
  @ApiOperation({
    summary: 'Stripe webhook endpoint',
    description: 'Handles Stripe webhook events (checkout.session.completed, etc.)',
  })
  @ApiResponse({ status: 200, description: 'Webhook processed' })
  async webhook(@Req() request: Request) {
    const event = (request as any).stripeEvent;
    return this.stripeService.handleWebhook(event);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get latest Stripe payment status for current user',
  })
  @ApiResponse({ status: 200, description: 'Latest payment status retrieved' })
  async getMyPayment(@CurrentUser() user: any) {
    return this.stripeService.getMyLatestStripePayment(user.id);
  }

  @Post('process-pending/:sessionId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Manually process a pending Stripe payment by session ID',
    description: 'Useful if webhook was not received. Retrieves session from Stripe and processes it.',
  })
  @ApiResponse({ status: 200, description: 'Payment processed successfully' })
  async processPendingPayment(
    @CurrentUser() user: any,
    @Param('sessionId') sessionId: string,
  ) {
    return this.stripeService.processPendingPaymentBySessionId(sessionId);
  }
}
