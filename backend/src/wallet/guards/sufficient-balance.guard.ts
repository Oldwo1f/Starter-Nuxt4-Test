import {
  Injectable,
  CanActivate,
  ExecutionContext,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../entities/user.entity';
import { Listing } from '../../entities/listing.entity';

@Injectable()
export class SufficientBalanceGuard implements CanActivate {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Listing)
    private listingRepository: Repository<Listing>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const body = request.body;

    if (!user) {
      throw new BadRequestException('User not authenticated');
    }

    // Get user with locked balance
    const userEntity = await this.userRepository.findOne({
      where: { id: user.id },
      lock: { mode: 'pessimistic_write' },
    });

    if (!userEntity) {
      throw new NotFoundException(`User with ID ${user.id} not found`);
    }

    let requiredAmount = 0;

    // For exchange, get listing price
    if (body.listingId) {
      const listing = await this.listingRepository.findOne({
        where: { id: body.listingId },
      });

      if (!listing) {
        throw new NotFoundException(`Listing with ID ${body.listingId} not found`);
      }

      requiredAmount = parseFloat(listing.price.toString());
    } else if (body.amount) {
      // For transfer, use amount from body
      requiredAmount = parseFloat(body.amount.toString());
    } else {
      throw new BadRequestException('Amount or listingId required');
    }

    const balance = parseFloat(userEntity.walletBalance.toString());

    if (balance < requiredAmount) {
      throw new BadRequestException(
        `Insufficient balance. Required: ${requiredAmount}, Available: ${balance}`,
      );
    }

    return true;
  }
}
