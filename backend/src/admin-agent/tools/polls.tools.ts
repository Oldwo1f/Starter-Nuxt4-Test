/**
 * Admin agent tools for polls management.
 */
import { User, UserRole } from '../../entities/user.entity';
import { PollsService } from '../../polls/polls.service';
import { CreatePollDto } from '../../polls/dto/create-poll.dto';
import { UpdatePollDto } from '../../polls/dto/update-poll.dto';
import { PollType, PollAccessLevel, PollStatus } from '../../entities/poll.entity';

const STAFF_USER: User = { id: 0, email: 'agent@admin', role: UserRole.ADMIN } as User;

export const listPollsTool = {
  type: 'function' as const,
  function: {
    name: 'list_polls',
    description: 'Liste les sondages avec pagination. Filtres: page, pageSize, status, accessLevel, type.',
    parameters: {
      type: 'object',
      properties: {
        page: { type: 'number', description: 'Numéro de page (1-based)' },
        pageSize: { type: 'number', description: 'Nombre par page (défaut 10)' },
        status: { type: 'string', enum: ['draft', 'active', 'ended'], description: 'Filtrer par statut' },
        accessLevel: { type: 'string', enum: ['public', 'member'] },
        type: { type: 'string', enum: ['qcm', 'ranking'] },
      },
    },
  },
};

export const getPollTool = {
  type: 'function' as const,
  function: {
    name: 'get_poll',
    description: 'Récupère un sondage par son ID.',
    parameters: {
      type: 'object',
      properties: { id: { type: 'number', description: 'ID du sondage' } },
      required: ['id'],
    },
  },
};

export const createPollTool = {
  type: 'function' as const,
  function: {
    name: 'create_poll',
    description: 'Crée un nouveau sondage. Nécessite title, type, accessLevel, options (tableau de {text, order?}).',
    parameters: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Titre du sondage' },
        description: { type: 'string', description: 'Description' },
        type: { type: 'string', enum: ['qcm', 'ranking'], description: 'Type de sondage' },
        accessLevel: { type: 'string', enum: ['public', 'member'], description: 'Niveau d\'accès' },
        status: { type: 'string', enum: ['draft', 'active', 'ended'], description: 'Statut (défaut: draft)' },
        options: {
          type: 'array',
          description: 'Options du sondage',
          items: {
            type: 'object',
            properties: {
              text: { type: 'string', description: 'Texte de l\'option' },
              order: { type: 'number', description: 'Ordre d\'affichage' },
            },
            required: ['text'],
          },
        },
      },
      required: ['title', 'type', 'accessLevel', 'options'],
    },
  },
};

export const updatePollTool = {
  type: 'function' as const,
  function: {
    name: 'update_poll',
    description: 'Met à jour un sondage existant.',
    parameters: {
      type: 'object',
      properties: {
        id: { type: 'number', description: 'ID du sondage' },
        title: { type: 'string' },
        description: { type: 'string' },
        type: { type: 'string', enum: ['qcm', 'ranking'] },
        accessLevel: { type: 'string', enum: ['public', 'member'] },
        status: { type: 'string', enum: ['draft', 'active', 'ended'] },
        options: {
          type: 'array',
          items: {
            type: 'object',
            properties: { text: { type: 'string' }, order: { type: 'number' } },
            required: ['text'],
          },
        },
      },
      required: ['id'],
    },
  },
};

export const deletePollTool = {
  type: 'function' as const,
  function: {
    name: 'delete_poll',
    description: 'Supprime un sondage par ID. Irréversible.',
    parameters: {
      type: 'object',
      properties: { id: { type: 'number', description: 'ID du sondage' } },
      required: ['id'],
    },
  },
};

export const getPollResponsesTool = {
  type: 'function' as const,
  function: {
    name: 'get_poll_responses',
    description: 'Récupère toutes les réponses d\'un sondage.',
    parameters: {
      type: 'object',
      properties: { pollId: { type: 'number', description: 'ID du sondage' } },
      required: ['pollId'],
    },
  },
};

export const deletePollResponseTool = {
  type: 'function' as const,
  function: {
    name: 'delete_poll_response',
    description: 'Supprime une réponse à un sondage par ID de réponse.',
    parameters: {
      type: 'object',
      properties: { responseId: { type: 'number', description: 'ID de la réponse' } },
      required: ['responseId'],
    },
  },
};

export async function executeListPolls(
  pollsService: PollsService,
  args: {
    page?: number;
    pageSize?: number;
    status?: string;
    accessLevel?: string;
    type?: string;
  },
): Promise<string> {
  const result = await pollsService.findAll(
    args.page ?? 1,
    args.pageSize ?? 10,
    args.status as PollStatus | undefined,
    args.accessLevel as PollAccessLevel | undefined,
    args.type as PollType | undefined,
    STAFF_USER,
  );
  return JSON.stringify(result, null, 2);
}

export async function executeGetPoll(pollsService: PollsService, args: { id: number }): Promise<string> {
  const poll = await pollsService.findOne(args.id, STAFF_USER);
  return JSON.stringify(poll, null, 2);
}

export async function executeCreatePoll(
  pollsService: PollsService,
  args: {
    title: string;
    description?: string;
    type: string;
    accessLevel: string;
    status?: string;
    options: Array<{ text: string; order?: number }>;
  },
): Promise<string> {
  const dto: CreatePollDto = {
    title: args.title,
    description: args.description,
    type: args.type as PollType,
    accessLevel: args.accessLevel as PollAccessLevel,
    status: (args.status as PollStatus) || PollStatus.DRAFT,
    options: args.options.map((o, i) => ({ text: o.text, order: o.order ?? i })),
  };
  const poll = await pollsService.create(dto, STAFF_USER);
  return JSON.stringify(poll, null, 2);
}

export async function executeUpdatePoll(
  pollsService: PollsService,
  args: {
    id: number;
    title?: string;
    description?: string;
    type?: string;
    accessLevel?: string;
    status?: string;
    options?: Array<{ text: string; order?: number }>;
  },
): Promise<string> {
  const dto: UpdatePollDto = {};
  if (args.title !== undefined) dto.title = args.title;
  if (args.description !== undefined) dto.description = args.description;
  if (args.type !== undefined) dto.type = args.type as PollType;
  if (args.accessLevel !== undefined) dto.accessLevel = args.accessLevel as PollAccessLevel;
  if (args.status !== undefined) dto.status = args.status as PollStatus;
  if (args.options !== undefined) {
    dto.options = args.options.map((o, i) => ({ text: o.text, order: o.order ?? i }));
  }
  const poll = await pollsService.update(args.id, dto, STAFF_USER);
  return JSON.stringify(poll, null, 2);
}

export async function executeDeletePoll(pollsService: PollsService, args: { id: number }): Promise<string> {
  await pollsService.remove(args.id);
  return JSON.stringify({ success: true, message: `Sondage ${args.id} supprimé` });
}

export async function executeGetPollResponses(pollsService: PollsService, args: { pollId: number }): Promise<string> {
  const responses = await pollsService.getResponses(args.pollId, STAFF_USER);
  return JSON.stringify(responses, null, 2);
}

export async function executeDeletePollResponse(
  pollsService: PollsService,
  args: { responseId: number },
): Promise<string> {
  await pollsService.removeResponse(args.responseId);
  return JSON.stringify({ success: true, message: `Réponse ${args.responseId} supprimée` });
}
