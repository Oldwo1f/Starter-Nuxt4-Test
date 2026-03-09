/**
 * Admin agent tools for culture (vidéos) management.
 */
import { CultureService } from '../../culture/culture.service';
import { CultureType } from '../../entities/culture.entity';

export const listCulturesTool = {
  type: 'function' as const,
  function: {
    name: 'list_cultures',
    description: 'Liste toutes les vidéos culture (reportages, documentaires, interviews).',
    parameters: {
      type: 'object',
      properties: {
        type: { type: 'string', enum: ['reportage', 'documentaire', 'interview'], description: 'Filtrer par type' },
      },
    },
  },
};

export const getCultureTool = {
  type: 'function' as const,
  function: {
    name: 'get_culture',
    description: 'Récupère une vidéo culture par son ID.',
    parameters: {
      type: 'object',
      properties: { id: { type: 'number', description: 'ID de la vidéo' } },
      required: ['id'],
    },
  },
};

export const createCultureTool = {
  type: 'function' as const,
  function: {
    name: 'create_culture',
    description: 'Crée une nouvelle vidéo culture. Nécessite title, type, youtubeUrl.',
    parameters: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Titre de la vidéo' },
        type: { type: 'string', enum: ['reportage', 'documentaire', 'interview'], description: 'Type de vidéo' },
        youtubeUrl: { type: 'string', description: 'URL YouTube de la vidéo' },
        director: { type: 'string', description: 'Réalisateur' },
        isPublic: { type: 'boolean', description: 'Visible par tous (défaut: true)' },
      },
      required: ['title', 'type', 'youtubeUrl'],
    },
  },
};

export const updateCultureTool = {
  type: 'function' as const,
  function: {
    name: 'update_culture',
    description: 'Met à jour une vidéo culture existante.',
    parameters: {
      type: 'object',
      properties: {
        id: { type: 'number', description: 'ID de la vidéo' },
        title: { type: 'string' },
        type: { type: 'string', enum: ['reportage', 'documentaire', 'interview'] },
        youtubeUrl: { type: 'string' },
        director: { type: 'string' },
        isPublic: { type: 'boolean' },
      },
      required: ['id'],
    },
  },
};

export const deleteCultureTool = {
  type: 'function' as const,
  function: {
    name: 'delete_culture',
    description: 'Supprime une vidéo culture par ID. Irréversible.',
    parameters: {
      type: 'object',
      properties: { id: { type: 'number', description: 'ID de la vidéo' } },
      required: ['id'],
    },
  },
};

export async function executeListCultures(
  cultureService: CultureService,
  args: { type?: string },
): Promise<string> {
  const cultures = args.type
    ? await cultureService.findByType(args.type as CultureType, true)
    : await cultureService.findAll(true);
  return JSON.stringify(cultures, null, 2);
}

export async function executeGetCulture(cultureService: CultureService, args: { id: number }): Promise<string> {
  const culture = await cultureService.findOne(args.id, true);
  return JSON.stringify(culture, null, 2);
}

export async function executeCreateCulture(
  cultureService: CultureService,
  createdById: number,
  args: {
    title: string;
    type: string;
    youtubeUrl: string;
    director?: string;
    isPublic?: boolean;
  },
): Promise<string> {
  const culture = await cultureService.create(
    args.title,
    args.type as CultureType,
    args.youtubeUrl,
    args.director,
    args.isPublic ?? true,
    createdById,
  );
  return JSON.stringify(culture, null, 2);
}

export async function executeUpdateCulture(
  cultureService: CultureService,
  args: {
    id: number;
    title?: string;
    type?: string;
    youtubeUrl?: string;
    director?: string;
    isPublic?: boolean;
  },
): Promise<string> {
  const culture = await cultureService.update(
    args.id,
    args.title,
    args.type as CultureType | undefined,
    args.youtubeUrl,
    args.director,
    args.isPublic,
  );
  return JSON.stringify(culture, null, 2);
}

export async function executeDeleteCulture(cultureService: CultureService, args: { id: number }): Promise<string> {
  await cultureService.remove(args.id);
  return JSON.stringify({ success: true, message: `Vidéo culture ${args.id} supprimée` });
}
