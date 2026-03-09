/**
 * Admin agent tools for goodies management.
 */
import { UserRole } from '../../entities/user.entity';
import { GoodiesService } from '../../goodies/goodies.service';

export const listGoodiesTool = {
  type: 'function' as const,
  function: {
    name: 'list_goodies',
    description: 'Liste tous les goodies (bonus, ressources).',
    parameters: { type: 'object', properties: {} },
  },
};

export const getGoodieTool = {
  type: 'function' as const,
  function: {
    name: 'get_goodie',
    description: 'Récupère un goodie par son ID.',
    parameters: {
      type: 'object',
      properties: { id: { type: 'number', description: "ID du goodie" } },
      required: ['id'],
    },
  },
};

export const createGoodieTool = {
  type: 'function' as const,
  function: {
    name: 'create_goodie',
    description: 'Crée un nouveau goodie. Nécessite name. Optionnels: link, description, imageUrl, fileUrl, offeredByName, offeredByLink, accessLevel.',
    parameters: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Nom du goodie' },
        link: { type: 'string', description: 'Lien externe' },
        description: { type: 'string', description: 'Description' },
        imageUrl: { type: 'string', description: 'URL de l\'image' },
        fileUrl: { type: 'string', description: 'URL du fichier' },
        offeredByName: { type: 'string', description: 'Nom de l\'offrant' },
        offeredByLink: { type: 'string', description: 'Lien de l\'offrant' },
        accessLevel: { type: 'string', enum: ['public', 'member', 'premium', 'vip'], description: 'Niveau d\'accès requis' },
      },
      required: ['name'],
    },
  },
};

export const updateGoodieTool = {
  type: 'function' as const,
  function: {
    name: 'update_goodie',
    description: 'Met à jour un goodie existant.',
    parameters: {
      type: 'object',
      properties: {
        id: { type: 'number', description: 'ID du goodie' },
        name: { type: 'string' },
        link: { type: 'string' },
        description: { type: 'string' },
        imageUrl: { type: 'string' },
        fileUrl: { type: 'string' },
        offeredByName: { type: 'string' },
        offeredByLink: { type: 'string' },
        accessLevel: { type: 'string', enum: ['public', 'member', 'premium', 'vip'] },
      },
      required: ['id'],
    },
  },
};

export const deleteGoodieTool = {
  type: 'function' as const,
  function: {
    name: 'delete_goodie',
    description: 'Supprime un goodie par ID. Irréversible.',
    parameters: {
      type: 'object',
      properties: { id: { type: 'number', description: 'ID du goodie' } },
      required: ['id'],
    },
  },
};

export async function executeListGoodies(goodiesService: GoodiesService): Promise<string> {
  const goodies = await goodiesService.findAll(UserRole.ADMIN);
  return JSON.stringify(goodies, null, 2);
}

export async function executeGetGoodie(goodiesService: GoodiesService, args: { id: number }): Promise<string> {
  const goodie = await goodiesService.findOne(args.id, UserRole.ADMIN);
  return JSON.stringify(goodie, null, 2);
}

export async function executeCreateGoodie(
  goodiesService: GoodiesService,
  createdById: number,
  args: {
    name: string;
    link?: string;
    description?: string;
    imageUrl?: string;
    fileUrl?: string;
    offeredByName?: string;
    offeredByLink?: string;
    accessLevel?: 'public' | 'member' | 'premium' | 'vip';
  },
): Promise<string> {
  const goodie = await goodiesService.create(
    args.name,
    args.link,
    args.description,
    args.imageUrl,
    args.fileUrl,
    args.offeredByName,
    args.offeredByLink,
    args.accessLevel ?? 'public',
    createdById,
  );
  return JSON.stringify(goodie, null, 2);
}

export async function executeUpdateGoodie(
  goodiesService: GoodiesService,
  args: {
    id: number;
    name?: string;
    link?: string;
    description?: string;
    imageUrl?: string | null;
    fileUrl?: string | null;
    offeredByName?: string;
    offeredByLink?: string;
    accessLevel?: 'public' | 'member' | 'premium' | 'vip';
  },
): Promise<string> {
  const goodie = await goodiesService.update(
    args.id,
    args.name,
    args.link,
    args.description,
    args.imageUrl,
    args.fileUrl,
    args.offeredByName,
    args.offeredByLink,
    args.accessLevel,
  );
  return JSON.stringify(goodie, null, 2);
}

export async function executeDeleteGoodie(goodiesService: GoodiesService, args: { id: number }): Promise<string> {
  await goodiesService.remove(args.id);
  return JSON.stringify({ success: true, message: `Goodie ${args.id} supprimé` });
}
