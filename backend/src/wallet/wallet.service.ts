import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Transaction, TransactionType, TransactionStatus } from '../entities/transaction.entity';
import { User } from '../entities/user.entity';
import { Listing, ListingStatus } from '../entities/listing.entity';

@Injectable()
export class WalletService {
  constructor(
    @InjectRepository(Transaction)
    private transactionRepository: Repository<Transaction>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Listing)
    private listingRepository: Repository<Listing>,
    private dataSource: DataSource,
  ) {}

  async getBalance(userId: number): Promise<number> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }
    return parseFloat(user.walletBalance.toString());
  }

  async getTransactions(
    userId: number,
    page: number = 1,
    pageSize: number = 20,
  ) {
    const queryBuilder = this.transactionRepository.createQueryBuilder('transaction');

    // Get transactions where user is sender or receiver
    // For DEBIT transactions: user must be the sender (fromUserId)
    // For CREDIT transactions: user must be the receiver (toUserId)
    // For EXCHANGE transactions: user can be either sender or receiver
    queryBuilder.where(
      '(transaction.type = :exchangeType AND (transaction.fromUserId = :userId OR transaction.toUserId = :userId)) OR (transaction.type = :debitType AND transaction.fromUserId = :userId) OR (transaction.type = :creditType AND transaction.toUserId = :userId)',
      { 
        userId,
        exchangeType: TransactionType.EXCHANGE,
        debitType: TransactionType.DEBIT,
        creditType: TransactionType.CREDIT,
      },
    );

    // Join relations
    queryBuilder.leftJoinAndSelect('transaction.fromUser', 'fromUser');
    queryBuilder.leftJoinAndSelect('transaction.toUser', 'toUser');
    queryBuilder.leftJoinAndSelect('transaction.listing', 'listing');

    // Select only necessary fields
    queryBuilder.select([
      'transaction.id',
      'transaction.type',
      'transaction.amount',
      'transaction.balanceBefore',
      'transaction.balanceAfter',
      'transaction.status',
      'transaction.description',
      'transaction.createdAt',
      'fromUser.id',
      'fromUser.email',
      'fromUser.firstName',
      'fromUser.lastName',
      'toUser.id',
      'toUser.email',
      'toUser.firstName',
      'toUser.lastName',
      'listing.id',
      'listing.title',
    ]);

    // Order by newest first
    queryBuilder.orderBy('transaction.createdAt', 'DESC');

    // Get total before pagination
    const total = await queryBuilder.getCount();

    // Apply pagination
    const skip = (page - 1) * pageSize;
    queryBuilder.skip(skip).take(pageSize);

    // Execute query
    const data = await queryBuilder.getMany();

    // Calculate pagination metadata
    const totalPages = Math.ceil(total / pageSize);
    const hasNext = page < totalPages;
    const hasPrev = page > 1;

    return {
      data,
      total,
      page,
      pageSize,
      totalPages,
      hasNext,
      hasPrev,
    };
  }

  async transfer(
    fromUserId: number,
    toUserEmail: string,
    amount: number,
    description: string,
  ): Promise<{ debitTransaction: Transaction; creditTransaction: Transaction }> {
    if (amount <= 0) {
      throw new BadRequestException('Amount must be greater than 0');
    }

    if (!description || description.trim().length === 0) {
      throw new BadRequestException('Description is required');
    }

    // Find recipient user
    const toUser = await this.userRepository.findOne({
      where: { email: toUserEmail },
    });
    if (!toUser) {
      throw new NotFoundException(`User with email ${toUserEmail} not found`);
    }

    if (fromUserId === toUser.id) {
      throw new BadRequestException('Cannot transfer to yourself');
    }

    // Use transaction to ensure atomicity
    return await this.dataSource.transaction(async (manager) => {
      // Lock and get sender user
      const fromUser = await manager.findOne(User, {
        where: { id: fromUserId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!fromUser) {
        throw new NotFoundException(`User with ID ${fromUserId} not found`);
      }

      // Check balance
      const balance = parseFloat(fromUser.walletBalance.toString());
      if (balance < amount) {
        throw new BadRequestException('Insufficient balance');
      }

      // Lock and get recipient user
      const toUserLocked = await manager.findOne(User, {
        where: { id: toUser.id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!toUserLocked) {
        throw new NotFoundException(`User with ID ${toUser.id} not found`);
      }

      // Calculate new balances
      const fromBalanceBefore = balance;
      const fromBalanceAfter = balance - amount;
      const toBalanceBefore = parseFloat(toUserLocked.walletBalance.toString());
      const toBalanceAfter = toBalanceBefore + amount;

      // Update balances
      fromUser.walletBalance = fromBalanceAfter;
      toUserLocked.walletBalance = toBalanceAfter;

      await manager.save([fromUser, toUserLocked]);

      // Create DEBIT transaction for sender
      const debitTransaction = manager.create(Transaction, {
        type: TransactionType.DEBIT,
        amount,
        balanceBefore: fromBalanceBefore,
        balanceAfter: fromBalanceAfter,
        status: TransactionStatus.COMPLETED,
        fromUserId,
        toUserId: toUser.id,
        description: description.trim(),
      });

      // Create CREDIT transaction for recipient
      const creditTransaction = manager.create(Transaction, {
        type: TransactionType.CREDIT,
        amount,
        balanceBefore: toBalanceBefore,
        balanceAfter: toBalanceAfter,
        status: TransactionStatus.COMPLETED,
        fromUserId,
        toUserId: toUser.id,
        description: description.trim(),
      });

      const savedDebit = await manager.save(debitTransaction);
      const savedCredit = await manager.save(creditTransaction);

      return {
        debitTransaction: savedDebit,
        creditTransaction: savedCredit,
      };
    });
  }

  async exchange(
    buyerId: number,
    listingId: number,
  ): Promise<Transaction> {
    // Find listing
    const listing = await this.listingRepository.findOne({
      where: { id: listingId },
      relations: ['seller'],
    });
    if (!listing) {
      throw new NotFoundException(`Listing with ID ${listingId} not found`);
    }

    if (listing.status !== ListingStatus.ACTIVE) {
      throw new BadRequestException('Listing is not available for exchange');
    }

    if (listing.sellerId === buyerId) {
      throw new BadRequestException('Cannot exchange your own listing');
    }

    const price = parseFloat(listing.price.toString());

    // Use transaction to ensure atomicity
    return await this.dataSource.transaction(async (manager) => {
      // Lock and get buyer
      const buyer = await manager.findOne(User, {
        where: { id: buyerId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!buyer) {
        throw new NotFoundException(`User with ID ${buyerId} not found`);
      }

      // Check buyer balance
      const buyerBalance = parseFloat(buyer.walletBalance.toString());
      if (buyerBalance < price) {
        throw new BadRequestException('Insufficient balance');
      }

      // Lock and get seller
      const seller = await manager.findOne(User, {
        where: { id: listing.sellerId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!seller) {
        throw new NotFoundException(`Seller with ID ${listing.sellerId} not found`);
      }

      // Calculate new balances
      const buyerBalanceBefore = buyerBalance;
      const buyerBalanceAfter = buyerBalance - price;
      const sellerBalanceBefore = parseFloat(seller.walletBalance.toString());
      const sellerBalanceAfter = sellerBalanceBefore + price;

      // Update balances
      buyer.walletBalance = buyerBalanceAfter;
      seller.walletBalance = sellerBalanceAfter;

      await manager.save([buyer, seller]);

      // Mark listing as sold
      listing.status = ListingStatus.SOLD;
      await manager.save(listing);

      // Create transaction record
      const transaction = manager.create(Transaction, {
        type: TransactionType.EXCHANGE,
        amount: price,
        balanceBefore: buyerBalanceBefore,
        balanceAfter: buyerBalanceAfter,
        status: TransactionStatus.COMPLETED,
        fromUserId: buyerId,
        toUserId: listing.sellerId,
        listingId,
        description: `[Nuna'a Heritage] Exchange for listing: ${listing.title}`,
      });

      return await manager.save(transaction);
    });
  }

  async searchUsersForTransfer(searchTerm: string, limit: number = 20): Promise<User[]> {
    const queryBuilder = this.userRepository.createQueryBuilder('user');

    // Select only necessary fields for transfer
    queryBuilder.select([
      'user.id',
      'user.email',
      'user.firstName',
      'user.lastName',
      'user.avatarImage',
    ]);

    // Search in email, firstName, or lastName
    if (searchTerm && searchTerm.trim().length > 0) {
      const search = `%${searchTerm.trim()}%`;
      queryBuilder.where(
        '(user.email ILIKE :search OR user.firstName ILIKE :search OR user.lastName ILIKE :search OR CONCAT(COALESCE(user.firstName, \'\'), \' \', COALESCE(user.lastName, \'\')) ILIKE :search)',
        { search },
      );
    }

    // Limit results
    queryBuilder.limit(limit);

    // Order by email
    queryBuilder.orderBy('user.email', 'ASC');

    return await queryBuilder.getMany();
  }

  /**
   * Crédite un utilisateur depuis l'admin (transaction système)
   * @param adminUserId ID de l'admin qui effectue l'action
   * @param targetUserId ID de l'utilisateur à créditer
   * @param amount Montant en Pūpū
   * @param description Description de la transaction
   */
  async adminCreditUser(
    adminUserId: number,
    targetUserId: number,
    amount: number,
    description: string,
  ): Promise<Transaction> {
    if (amount <= 0) {
      throw new BadRequestException('Amount must be greater than 0');
    }

    if (!description || description.trim().length === 0) {
      throw new BadRequestException('Description is required');
    }

    // Utiliser une transaction pour garantir l'atomicité
    return await this.dataSource.transaction(async (manager) => {
      // Lock and get target user
      const targetUser = await manager.findOne(User, {
        where: { id: targetUserId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!targetUser) {
        throw new NotFoundException(`User with ID ${targetUserId} not found`);
      }

      // Calculate new balance
      const balanceBefore = parseFloat(targetUser.walletBalance.toString());
      const balanceAfter = balanceBefore + amount;

      // Update balance
      targetUser.walletBalance = balanceAfter;
      await manager.save(targetUser);

      // Create CREDIT transaction
      const creditTransaction = manager.create(Transaction, {
        type: TransactionType.CREDIT,
        amount,
        balanceBefore,
        balanceAfter,
        status: TransactionStatus.COMPLETED,
        fromUserId: adminUserId, // L'admin est l'origine
        toUserId: targetUserId,
        description: `[Nuna'a Heritage] ${description.trim()}`,
      });

      return await manager.save(creditTransaction);
    });
  }
}
