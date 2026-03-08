import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Poll, PollType, PollStatus, PollAccessLevel } from '../entities/poll.entity';
import { PollOption } from '../entities/poll-option.entity';
import { PollResponse } from '../entities/poll-response.entity';
import { User, UserRole } from '../entities/user.entity';
import { CreatePollDto } from './dto/create-poll.dto';
import { UpdatePollDto } from './dto/update-poll.dto';
import { SubmitResponseDto } from './dto/submit-response.dto';

@Injectable()
export class PollsService {
  constructor(
    @InjectRepository(Poll)
    private pollRepository: Repository<Poll>,
    @InjectRepository(PollOption)
    private pollOptionRepository: Repository<PollOption>,
    @InjectRepository(PollResponse)
    private pollResponseRepository: Repository<PollResponse>,
  ) {}

  async create(createPollDto: CreatePollDto, user?: User): Promise<Poll> {
    const poll = this.pollRepository.create({
      title: createPollDto.title,
      description: createPollDto.description || null,
      type: createPollDto.type,
      accessLevel: createPollDto.accessLevel,
      status: createPollDto.status || PollStatus.DRAFT,
    });

    const savedPoll = await this.pollRepository.save(poll);

    // Créer les options
    const options = createPollDto.options.map((opt, index) =>
      this.pollOptionRepository.create({
        pollId: savedPoll.id,
        text: opt.text,
        order: opt.order !== undefined ? opt.order : index,
      }),
    );

    await this.pollOptionRepository.save(options);

    // Passer l'utilisateur pour que les admins puissent accéder même si accessLevel = MEMBER
    return this.findOne(savedPoll.id, user);
  }

  async findAll(
    page: number = 1,
    pageSize: number = 10,
    status?: PollStatus,
    accessLevel?: PollAccessLevel,
    type?: PollType,
    user?: User,
  ) {
    const queryBuilder = this.pollRepository.createQueryBuilder('poll');

    // Charger les options
    queryBuilder.leftJoinAndSelect('poll.options', 'option');
    queryBuilder.orderBy('option.order', 'ASC');

    // Filtrer par statut (exclure les drafts sauf pour admin)
    if (status) {
      queryBuilder.andWhere('poll.status = :status', { status });
    } else {
      // Par défaut, exclure les drafts sauf si admin
      if (!user || !this.isStaffRole(user.role)) {
        queryBuilder.andWhere('poll.status != :draft', { draft: PollStatus.DRAFT });
      }
    }

    if (accessLevel) {
      queryBuilder.andWhere('poll.accessLevel = :accessLevel', { accessLevel });
    }

    if (type) {
      queryBuilder.andWhere('poll.type = :type', { type });
    }

    // Filtrer par accessLevel selon l'utilisateur
    if (!user || !this.isMemberRole(user.role)) {
      queryBuilder.andWhere('poll.accessLevel = :public', { public: PollAccessLevel.PUBLIC });
    }

    // Obtenir le total avant la pagination
    const total = await queryBuilder.getCount();

    // Appliquer la pagination
    const skip = (page - 1) * pageSize;
    queryBuilder.skip(skip).take(pageSize);

    // Exécuter la requête
    const data = await queryBuilder.getMany();

    // Calculer les métadonnées de pagination
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

  async findActive(user?: User): Promise<Poll[]> {
    const queryBuilder = this.pollRepository.createQueryBuilder('poll');

    queryBuilder.leftJoinAndSelect('poll.options', 'option');
    queryBuilder.orderBy('poll.createdAt', 'DESC');
    queryBuilder.orderBy('option.order', 'ASC');

    queryBuilder.andWhere('poll.status = :status', { status: PollStatus.ACTIVE });

    // Filtrer par accessLevel selon l'utilisateur
    if (!user || !this.isMemberRole(user.role)) {
      queryBuilder.andWhere('poll.accessLevel = :public', { public: PollAccessLevel.PUBLIC });
    }

    queryBuilder.take(4); // Limiter à 4 pour la home

    return queryBuilder.getMany();
  }

  async findOne(id: number, user?: User): Promise<Poll> {
    const poll = await this.pollRepository.findOne({
      where: { id },
      relations: ['options'],
      order: {
        options: {
          order: 'ASC',
        },
      },
    });

    if (!poll) {
      throw new NotFoundException(`Poll with ID ${id} not found`);
    }

    // Vérifier l'accès
    if (poll.status === PollStatus.DRAFT && (!user || !this.isStaffRole(user.role))) {
      throw new NotFoundException(`Poll with ID ${id} not found`);
    }

    if (poll.accessLevel === PollAccessLevel.MEMBER && (!user || !this.isMemberRole(user.role))) {
      throw new ForbiddenException('This poll is restricted to members');
    }

    return poll;
  }

  async update(id: number, updatePollDto: UpdatePollDto, user?: User): Promise<Poll> {
    // Passer l'utilisateur pour que les admins puissent accéder même si accessLevel = MEMBER
    const poll = await this.findOne(id, user);

    if (updatePollDto.title !== undefined) {
      poll.title = updatePollDto.title;
    }
    if (updatePollDto.description !== undefined) {
      poll.description = updatePollDto.description;
    }
    if (updatePollDto.type !== undefined) {
      poll.type = updatePollDto.type;
    }
    if (updatePollDto.accessLevel !== undefined) {
      poll.accessLevel = updatePollDto.accessLevel;
    }
    if (updatePollDto.status !== undefined) {
      poll.status = updatePollDto.status;
    }

    await this.pollRepository.save(poll);

    // Mettre à jour les options si fournies
    if (updatePollDto.options) {
      // Supprimer les anciennes options
      await this.pollOptionRepository.delete({ pollId: id });

      // Créer les nouvelles options
      const options = updatePollDto.options.map((opt, index) =>
        this.pollOptionRepository.create({
          pollId: id,
          text: opt.text,
          order: opt.order !== undefined ? opt.order : index,
        }),
      );

      await this.pollOptionRepository.save(options);
    }

    // Passer l'utilisateur pour que les admins puissent accéder même si accessLevel = MEMBER
    return this.findOne(id, user);
  }

  async remove(id: number): Promise<void> {
    const poll = await this.findOne(id);
    await this.pollRepository.remove(poll);
  }

  async hasUserResponded(pollId: number, userId: number | null): Promise<boolean> {
    if (!userId) {
      return false;
    }

    const response = await this.pollResponseRepository.findOne({
      where: { pollId, userId },
    });

    return !!response;
  }

  async submitResponse(pollId: number, submitResponseDto: SubmitResponseDto, user?: User): Promise<PollResponse> {
    const poll = await this.findOne(pollId, user);

    // Vérifier l'accès
    if (poll.accessLevel === PollAccessLevel.MEMBER && (!user || !this.isMemberRole(user.role))) {
      throw new ForbiddenException('This poll is restricted to members');
    }

    // Vérifier si l'utilisateur a déjà répondu
    if (user && await this.hasUserResponded(pollId, user.id)) {
      throw new BadRequestException('You have already responded to this poll');
    }

    // Valider la réponse selon le type
    if (poll.type === PollType.QCM) {
      if (!submitResponseDto.optionId) {
        throw new BadRequestException('optionId is required for QCM polls');
      }

      // Vérifier que l'option existe
      const option = await this.pollOptionRepository.findOne({
        where: { id: submitResponseDto.optionId, pollId },
      });

      if (!option) {
        throw new NotFoundException('Option not found');
      }

      const response = this.pollResponseRepository.create({
        pollId,
        userId: user?.id || null,
        optionId: submitResponseDto.optionId,
        ranking: null,
      });

      return this.pollResponseRepository.save(response);
    } else if (poll.type === PollType.RANKING) {
      if (!submitResponseDto.ranking || submitResponseDto.ranking.length === 0) {
        throw new BadRequestException('ranking is required for ranking polls');
      }

      // Vérifier que toutes les options existent
      const optionIds = submitResponseDto.ranking.map((r) => r.optionId);
      const options = await this.pollOptionRepository.find({
        where: { id: In(optionIds), pollId },
      });

      if (options.length !== optionIds.length) {
        throw new BadRequestException('Some options are invalid');
      }

      const response = this.pollResponseRepository.create({
        pollId,
        userId: user?.id || null,
        optionId: null,
        ranking: submitResponseDto.ranking,
      });

      return this.pollResponseRepository.save(response);
    }

    throw new BadRequestException('Invalid poll type');
  }

  async getResults(pollId: number, user?: User) {
    const poll = await this.findOne(pollId, user);

    // Vérifier que l'utilisateur a répondu
    if (user && !(await this.hasUserResponded(pollId, user.id))) {
      throw new ForbiddenException('You must respond to the poll before viewing results');
    }

    if (poll.type === PollType.QCM) {
      // Compter les réponses par option
      const responses = await this.pollResponseRepository.find({
        where: { pollId },
        relations: ['option'],
      });

      const totalResponses = responses.length;
      const optionCounts = new Map<number, number>();

      responses.forEach((response) => {
        if (response.optionId) {
          optionCounts.set(response.optionId, (optionCounts.get(response.optionId) || 0) + 1);
        }
      });

      const results = poll.options.map((option) => {
        const count = optionCounts.get(option.id) || 0;
        const percentage = totalResponses > 0 ? (count / totalResponses) * 100 : 0;

        return {
          optionId: option.id,
          text: option.text,
          count,
          percentage: Math.round(percentage * 100) / 100,
        };
      });

      return {
        pollId,
        type: poll.type,
        totalResponses,
        results,
      };
    } else if (poll.type === PollType.RANKING) {
      // Calculer les moyennes des positions
      const responses = await this.pollResponseRepository.find({
        where: { pollId },
      });

      const totalResponses = responses.length;
      const optionPositions = new Map<number, number[]>();

      responses.forEach((response) => {
        if (response.ranking) {
          response.ranking.forEach((item) => {
            if (!optionPositions.has(item.optionId)) {
              optionPositions.set(item.optionId, []);
            }
            optionPositions.get(item.optionId)!.push(item.position);
          });
        }
      });

      const results = poll.options
        .map((option) => {
          const positions = optionPositions.get(option.id) || [];
          const averagePosition =
            positions.length > 0
              ? positions.reduce((sum, pos) => sum + pos, 0) / positions.length
              : null;

          return {
            optionId: option.id,
            text: option.text,
            averagePosition: averagePosition ? Math.round(averagePosition * 100) / 100 : null,
            responseCount: positions.length,
          };
        })
        .sort((a, b) => {
          if (a.averagePosition === null) return 1;
          if (b.averagePosition === null) return -1;
          return a.averagePosition - b.averagePosition;
        });

      return {
        pollId,
        type: poll.type,
        totalResponses,
        results,
      };
    }

    throw new BadRequestException('Invalid poll type');
  }

  async getResponses(pollId: number, user?: User): Promise<PollResponse[]> {
    // Passer l'utilisateur pour que les admins puissent accéder même si accessLevel = MEMBER
    const poll = await this.findOne(pollId, user);
    
    const responses = await this.pollResponseRepository.find({
      where: { pollId },
      relations: ['user', 'option'],
      order: {
        createdAt: 'DESC',
      },
    });

    return responses;
  }

  async removeResponse(responseId: number): Promise<void> {
    const response = await this.pollResponseRepository.findOne({
      where: { id: responseId },
    });

    if (!response) {
      throw new NotFoundException(`Response with ID ${responseId} not found`);
    }

    await this.pollResponseRepository.remove(response);
  }

  private isStaffRole(role: UserRole): boolean {
    return [UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.MODERATOR].includes(role);
  }

  private isMemberRole(role: UserRole): boolean {
    return [UserRole.MEMBER, UserRole.PREMIUM, UserRole.VIP, UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.MODERATOR].includes(role);
  }
}
