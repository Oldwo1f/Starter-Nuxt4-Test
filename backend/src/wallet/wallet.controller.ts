import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Request,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiBearerAuth,
  ApiProperty,
  ApiQuery,
} from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsNumber, Min, IsEmail } from 'class-validator';
import { WalletService } from './wallet.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

export class TransferDto {
  @ApiProperty({
    description: 'Recipient email address',
    example: 'user@example.com',
  })
  @IsEmail()
  @IsNotEmpty()
  toUserEmail: string;

  @ApiProperty({
    description: 'Amount in coquillages',
    example: 10,
  })
  @IsNumber()
  @Min(0.01)
  amount: number;

  @ApiProperty({
    description: 'Transaction description',
    example: 'Payment for services',
  })
  @IsString()
  @IsNotEmpty()
  description: string;
}

export class ExchangeDto {
  @ApiProperty({
    description: 'Listing ID to exchange',
    example: 1,
  })
  @IsNumber()
  listingId: number;
}

@ApiTags('wallet')
@Controller('wallet')
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @Get('balance')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get wallet balance',
    description: 'Get the current wallet balance in coquillages (requires authentication)',
  })
  @ApiResponse({
    status: 200,
    description: 'Balance retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        balance: {
          type: 'number',
          example: 100.5,
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getBalance(@Request() req) {
    const balance = await this.walletService.getBalance(req.user.id);
    return { balance };
  }

  @Get('transactions')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get transaction history',
    description: 'Get paginated transaction history (requires authentication)',
  })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Transactions retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getTransactions(
    @Request() req,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.walletService.getTransactions(
      req.user.id,
      page ? parseInt(page, 10) : 1,
      pageSize ? parseInt(pageSize, 10) : 20,
    );
  }

  @Post('transfer')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Transfer coquillages',
    description: 'Transfer coquillages to another user by email. Creates both DEBIT and CREDIT transactions (requires authentication)',
  })
  @ApiBody({ type: TransferDto })
  @ApiResponse({ 
    status: 201, 
    description: 'Transfer completed successfully. Returns both debit and credit transactions.',
    schema: {
      type: 'object',
      properties: {
        debitTransaction: { type: 'object' },
        creditTransaction: { type: 'object' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Bad request (insufficient balance, invalid amount, missing description, etc.)' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Recipient user not found' })
  async transfer(@Body() transferDto: TransferDto, @Request() req) {
    return this.walletService.transfer(
      req.user.id,
      transferDto.toUserEmail,
      transferDto.amount,
      transferDto.description,
    );
  }

  @Get('search-users')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Search users for transfer',
    description: 'Search users by name or email for transfer (requires authentication)',
  })
  @ApiQuery({ name: 'search', required: false, type: String, description: 'Search term (name or email)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Maximum number of results', default: 20 })
  @ApiResponse({ status: 200, description: 'Users retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async searchUsers(
    @Query('search') search?: string,
    @Query('limit') limit?: string,
  ) {
    return this.walletService.searchUsersForTransfer(search || '', limit ? parseInt(limit, 10) : 20);
  }

  @Post('exchange')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Exchange for listing',
    description: 'Exchange coquillages for a listing (requires authentication)',
  })
  @ApiBody({ type: ExchangeDto })
  @ApiResponse({ status: 201, description: 'Exchange completed successfully' })
  @ApiResponse({ status: 400, description: 'Bad request (insufficient balance, listing not available, etc.)' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Listing not found' })
  async exchange(@Body() exchangeDto: ExchangeDto, @Request() req) {
    return this.walletService.exchange(req.user.id, exchangeDto.listingId);
  }
}
