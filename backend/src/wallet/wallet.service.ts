import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { Transaction, TransactionType, TransactionStatus } from '../entities/transaction.entity';
import {
  JijiTransaction,
  JijiTransactionType,
  JijiTransactionStatus,
} from '../entities/jiji-transaction.entity';
import { User } from '../entities/user.entity';
import { Listing, ListingStatus } from '../entities/listing.entity';
import { BadgesService } from '../badges/badges.service';

@Injectable()
export class WalletService {
  constructor(
    @InjectRepository(Transaction)
    private transactionRepository: Repository<Transaction>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Listing)
    private listingRepository: Repository<Listing>,
    @InjectRepository(JijiTransaction)
    private jijiTransactionRepository: Repository<JijiTransaction>,
    private dataSource: DataSource,
    private badgesService: BadgesService,
  ) {}

  private async attachUserBadgeCounts(users: User[]): Promise<void> {
    if (users.length === 0) {
      return;
    }
    const counts = await this.badgesService.countBadgesByUserIds(users.map((u) => u.id));
    for (const u of users) {
      (u as User & { badgeCount?: number }).badgeCount = counts.get(u.id) ?? 0;
    }
  }

  async getBalance(userId: number): Promise<number> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }
    return parseFloat(user.walletBalance.toString());
  }

  async getJijiBalance(userId: number): Promise<number> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }
    return parseFloat(user.jijiBalance?.toString?.() ?? '0');
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

  /**
   * Débite un utilisateur vers un autre (ex: mise Kikiri)
   */
  async gameDebit(
    fromUserId: number,
    toUserId: number,
    amount: number,
    description: string,
  ): Promise<Transaction> {
    if (amount <= 0) {
      throw new BadRequestException('Amount must be greater than 0');
    }
    return await this.dataSource.transaction(async (manager) => {
      const fromUser = await manager.findOne(User, {
        where: { id: fromUserId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!fromUser) {
        throw new NotFoundException(`User with ID ${fromUserId} not found`);
      }
      const fromBalance = parseFloat(fromUser.walletBalance.toString());
      if (fromBalance < amount) {
        throw new BadRequestException('Insufficient balance');
      }
      const toUser = await manager.findOne(User, {
        where: { id: toUserId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!toUser) {
        throw new NotFoundException(`User with ID ${toUserId} not found`);
      }
      const toBalance = parseFloat(toUser.walletBalance.toString());
      fromUser.walletBalance = fromBalance - amount;
      toUser.walletBalance = toBalance + amount;
      await manager.save([fromUser, toUser]);
      const debitTx = manager.create(Transaction, {
        type: TransactionType.DEBIT,
        amount,
        balanceBefore: fromBalance,
        balanceAfter: fromBalance - amount,
        status: TransactionStatus.COMPLETED,
        fromUserId,
        toUserId,
        description: description.trim(),
      });
      return await manager.save(debitTx);
    });
  }

  /**
   * Crédite un utilisateur depuis un autre (ex: gain Kikiri)
   */
  async gameCredit(
    fromUserId: number,
    toUserId: number,
    amount: number,
    description: string,
  ): Promise<Transaction> {
    if (amount <= 0) {
      throw new BadRequestException('Amount must be greater than 0');
    }
    return await this.dataSource.transaction(async (manager) => {
      const fromUser = await manager.findOne(User, {
        where: { id: fromUserId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!fromUser) {
        throw new NotFoundException(`User with ID ${fromUserId} not found`);
      }
      const toUser = await manager.findOne(User, {
        where: { id: toUserId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!toUser) {
        throw new NotFoundException(`User with ID ${toUserId} not found`);
      }
      const fromBalance = parseFloat(fromUser.walletBalance.toString());
      const toBalance = parseFloat(toUser.walletBalance.toString());
      fromUser.walletBalance = fromBalance - amount;
      toUser.walletBalance = toBalance + amount;
      await manager.save([fromUser, toUser]);
      const creditTx = manager.create(Transaction, {
        type: TransactionType.CREDIT,
        amount,
        balanceBefore: toBalance,
        balanceAfter: toBalance + amount,
        status: TransactionStatus.COMPLETED,
        fromUserId,
        toUserId,
        description: description.trim(),
      });
      return await manager.save(creditTx);
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

    const users = await queryBuilder.getMany();
    await this.attachUserBadgeCounts(users);
    return users;
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

  /**
   * Débite le solde Jiji d'un utilisateur vers un autre (ex: mise Kikiri, achat grille Bingo)
   */
  async gameDebitJiji(
    fromUserId: number,
    toUserId: number,
    amount: number,
    description: string,
  ): Promise<JijiTransaction> {
    if (amount <= 0) {
      throw new BadRequestException('Amount must be greater than 0');
    }
    return await this.dataSource.transaction(async (manager) => {
      const fromUser = await manager.findOne(User, {
        where: { id: fromUserId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!fromUser) {
        throw new NotFoundException(`User with ID ${fromUserId} not found`);
      }
      const fromBalance = parseFloat(fromUser.jijiBalance?.toString?.() ?? '0');
      if (fromBalance < amount) {
        throw new BadRequestException('Solde Jiji insuffisant');
      }
      const toUser = await manager.findOne(User, {
        where: { id: toUserId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!toUser) {
        throw new NotFoundException(`User with ID ${toUserId} not found`);
      }
      const toBalance = parseFloat(toUser.jijiBalance?.toString?.() ?? '0');
      fromUser.jijiBalance = fromBalance - amount;
      toUser.jijiBalance = toBalance + amount;
      await manager.save([fromUser, toUser]);
      const debitTx = manager.create(JijiTransaction, {
        type: JijiTransactionType.DEBIT,
        amount,
        balanceBefore: fromBalance,
        balanceAfter: fromBalance - amount,
        status: JijiTransactionStatus.COMPLETED,
        fromUserId,
        toUserId,
        description: description.trim(),
      });
      return await manager.save(debitTx);
    });
  }

  /**
   * Crédite le solde Jiji d'un utilisateur depuis un autre (ex: gain Kikiri, jackpot Bingo)
   */
  async gameCreditJiji(
    fromUserId: number,
    toUserId: number,
    amount: number,
    description: string,
  ): Promise<JijiTransaction> {
    if (amount <= 0) {
      throw new BadRequestException('Amount must be greater than 0');
    }
    return await this.dataSource.transaction(async (manager) => {
      const fromUser = await manager.findOne(User, {
        where: { id: fromUserId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!fromUser) {
        throw new NotFoundException(`User with ID ${fromUserId} not found`);
      }
      const toUser = await manager.findOne(User, {
        where: { id: toUserId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!toUser) {
        throw new NotFoundException(`User with ID ${toUserId} not found`);
      }
      const fromBalance = parseFloat(fromUser.jijiBalance?.toString?.() ?? '0');
      const toBalance = parseFloat(toUser.jijiBalance?.toString?.() ?? '0');
      fromUser.jijiBalance = fromBalance - amount;
      toUser.jijiBalance = toBalance + amount;
      await manager.save([fromUser, toUser]);
      const creditTx = manager.create(JijiTransaction, {
        type: JijiTransactionType.CREDIT,
        amount,
        balanceBefore: toBalance,
        balanceAfter: toBalance + amount,
        status: JijiTransactionStatus.COMPLETED,
        fromUserId,
        toUserId,
        description: description.trim(),
      });
      return await manager.save(creditTx);
    });
  }

  /**
   * Crédite le solde Jiji d'un utilisateur (crédit système: inscription, Te Ohi, Umete)
   * @param manager Optional - si fourni, exécute dans le contexte de transaction existant
   */
  async creditJijiSystem(
    toUserId: number,
    amount: number,
    description: string,
    manager?: EntityManager,
  ): Promise<JijiTransaction> {
    if (amount <= 0) {
      throw new BadRequestException('Amount must be greater than 0');
    }
    const run = async (m: EntityManager) => {
      const toUser = await m.findOne(User, {
        where: { id: toUserId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!toUser) {
        throw new NotFoundException(`User with ID ${toUserId} not found`);
      }
      const toBalance = parseFloat(toUser.jijiBalance?.toString?.() ?? '0');
      const balanceAfter = toBalance + amount;
      toUser.jijiBalance = balanceAfter;
      await m.save(toUser);
      const creditTx = m.create(JijiTransaction, {
        type: JijiTransactionType.CREDIT,
        amount,
        balanceBefore: toBalance,
        balanceAfter,
        status: JijiTransactionStatus.COMPLETED,
        fromUserId: null,
        toUserId,
        description: description.trim(),
      });
      return await m.save(creditTx);
    };
    if (manager) {
      return run(manager);
    }
    return this.dataSource.transaction(run);
  }

  /**
   * Crédite le solde Jiji d'un utilisateur (crédit hebdomadaire système)
   */
  async creditJijiWeekly(
    toUserId: number,
    amount: number,
    description: string,
  ): Promise<JijiTransaction> {
    if (amount <= 0) {
      throw new BadRequestException('Amount must be greater than 0');
    }
    return await this.dataSource.transaction(async (manager) => {
      const toUser = await manager.findOne(User, {
        where: { id: toUserId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!toUser) {
        throw new NotFoundException(`User with ID ${toUserId} not found`);
      }
      const toBalance = parseFloat(toUser.jijiBalance?.toString?.() ?? '0');
      const balanceAfter = toBalance + amount;
      toUser.jijiBalance = balanceAfter;
      await manager.save(toUser);
      const creditTx = manager.create(JijiTransaction, {
        type: JijiTransactionType.WEEKLY_CREDIT,
        amount,
        balanceBefore: toBalance,
        balanceAfter,
        status: JijiTransactionStatus.COMPLETED,
        fromUserId: null,
        toUserId,
        description: description.trim(),
      });
      return await manager.save(creditTx);
    });
  }

  /**
   * Crédite le solde Jiji d'un utilisateur depuis l'admin (transaction système)
   */
  async adminCreditJiji(
    adminUserId: number,
    targetUserId: number,
    amount: number,
    description: string,
  ): Promise<JijiTransaction> {
    if (amount <= 0) {
      throw new BadRequestException('Amount must be greater than 0');
    }
    if (!description || description.trim().length === 0) {
      throw new BadRequestException('Description is required');
    }
    return await this.dataSource.transaction(async (manager) => {
      const targetUser = await manager.findOne(User, {
        where: { id: targetUserId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!targetUser) {
        throw new NotFoundException(`User with ID ${targetUserId} not found`);
      }
      const balanceBefore = parseFloat(targetUser.jijiBalance?.toString?.() ?? '0');
      const balanceAfter = balanceBefore + amount;
      targetUser.jijiBalance = balanceAfter;
      await manager.save(targetUser);
      const creditTx = manager.create(JijiTransaction, {
        type: JijiTransactionType.CREDIT,
        amount,
        balanceBefore,
        balanceAfter,
        status: JijiTransactionStatus.COMPLETED,
        fromUserId: adminUserId,
        toUserId: targetUserId,
        description: `[Nuna'a Heritage] ${description.trim()}`,
      });
      return await manager.save(creditTx);
    });
  }
}
