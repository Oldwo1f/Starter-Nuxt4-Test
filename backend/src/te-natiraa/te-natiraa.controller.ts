import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
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
import { CreateTeNatiraaEventDto } from './dto/create-event.dto';
import { UpdateTeNatiraaEventDto } from './dto/update-event.dto';

@ApiTags('te-natiraa')
@Controller('te-natiraa')
export class TeNatiraaController {
  constructor(private readonly teNatiraaService: TeNatiraaService) {}

  @Get('next-event')
  @ApiOperation({
    summary: 'Get next upcoming Te Natira\'a event',
    description: 'Public. Returns null if no upcoming event.',
  })
  @ApiResponse({ status: 200, description: 'Next event or null' })
  async getNextEvent() {
    return this.teNatiraaService.getNextEvent();
  }

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
    summary: 'List Te Natira\'a registrations',
    description: 'Admin only. Paginated. Optional eventId filter.',
  })
  @ApiResponse({ status: 200, description: 'Paginated registrations' })
  async getRegistrations(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('eventId') eventId?: string,
  ) {
    const pageNum = Math.max(1, parseInt(page || '1', 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit || '50', 10) || 50));
    const eventIdNum = eventId ? parseInt(eventId, 10) : undefined;
    return this.teNatiraaService.getRegistrations(pageNum, limitNum, eventIdNum);
  }

  @Get('registrations/grouped')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'List registrations grouped by event',
    description: 'Admin only. Returns events with their registrations.',
  })
  @ApiResponse({ status: 200, description: 'Registrations grouped by event' })
  async getRegistrationsGrouped() {
    return this.teNatiraaService.getRegistrationsGroupedByEvent();
  }

  @Get('events')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'List all Te Natira\'a events',
    description: 'Admin only.',
  })
  @ApiResponse({ status: 200, description: 'List of events' })
  async getEvents() {
    return this.teNatiraaService.getEvents();
  }

  @Post('events')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Create a Te Natira\'a event',
    description: 'Admin only.',
  })
  @ApiResponse({ status: 201, description: 'Event created' })
  async createEvent(@Body() dto: CreateTeNatiraaEventDto) {
    return this.teNatiraaService.createEvent(dto);
  }

  @Put('events/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Update a Te Natira\'a event',
    description: 'Admin only.',
  })
  @ApiResponse({ status: 200, description: 'Event updated' })
  async updateEvent(@Param('id') id: string, @Body() dto: UpdateTeNatiraaEventDto) {
    return this.teNatiraaService.updateEvent(parseInt(id, 10), dto);
  }

  @Delete('events/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Delete a Te Natira\'a event',
    description: 'Admin only. Cascades to registrations.',
  })
  @ApiResponse({ status: 200, description: 'Event deleted' })
  async deleteEvent(@Param('id') id: string) {
    return this.teNatiraaService.deleteEvent(parseInt(id, 10));
  }
}
