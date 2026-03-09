/**
 * Admin agent tools for partners management.
 */
import { PartnersService } from '../../partners/partners.service';

export const listPartnersTool = {
  type: 'function' as const,
  function: {
    name: 'list_partners',
    description: 'Liste tous les partenaires.',
    parameters: { type: 'object', properties: {} },
  },
};

export const getPartnerTool = {
  type: 'function' as const,
  function: {
    name: 'get_partner',
    description: 'Récupère un partenaire par son ID.',
    parameters: {
      type: 'object',
      properties: { id: { type: 'number', description: 'ID du partenaire' } },
      required: ['id'],
    },
  },
};

export const createPartnerTool = {
  type: 'function' as const,
  function: {
    name: 'create_partner',
    description: 'Crée un nouveau partenaire. Nécessite name.',
    parameters: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Nom du partenaire' },
        link: { type: 'string', description: 'Lien du site partenaire' },
        bannerHorizontalUrl: { type: 'string', description: 'URL bannière horizontale' },
        bannerVerticalUrl: { type: 'string', description: 'URL bannière verticale' },
      },
      required: ['name'],
    },
  },
};

export const updatePartnerTool = {
  type: 'function' as const,
  function: {
    name: 'update_partner',
    description: 'Met à jour un partenaire existant.',
    parameters: {
      type: 'object',
      properties: {
        id: { type: 'number', description: 'ID du partenaire' },
        name: { type: 'string' },
        link: { type: 'string' },
        bannerHorizontalUrl: { type: 'string' },
        bannerVerticalUrl: { type: 'string' },
      },
      required: ['id'],
    },
  },
};

export const deletePartnerTool = {
  type: 'function' as const,
  function: {
    name: 'delete_partner',
    description: 'Supprime un partenaire par ID. Irréversible.',
    parameters: {
      type: 'object',
      properties: { id: { type: 'number', description: 'ID du partenaire' } },
      required: ['id'],
    },
  },
};

export async function executeListPartners(partnersService: PartnersService): Promise<string> {
  const partners = await partnersService.findAll();
  return JSON.stringify(partners, null, 2);
}

export async function executeGetPartner(partnersService: PartnersService, args: { id: number }): Promise<string> {
  const partner = await partnersService.findOne(args.id);
  return JSON.stringify(partner, null, 2);
}

export async function executeCreatePartner(
  partnersService: PartnersService,
  args: {
    name: string;
    link?: string;
    bannerHorizontalUrl?: string;
    bannerVerticalUrl?: string;
  },
): Promise<string> {
  const partner = await partnersService.create(
    args.name,
    args.link,
    args.bannerHorizontalUrl,
    args.bannerVerticalUrl,
  );
  return JSON.stringify(partner, null, 2);
}

export async function executeUpdatePartner(
  partnersService: PartnersService,
  args: {
    id: number;
    name?: string;
    link?: string;
    bannerHorizontalUrl?: string;
    bannerVerticalUrl?: string;
  },
): Promise<string> {
  const partner = await partnersService.update(
    args.id,
    args.name,
    args.link,
    args.bannerHorizontalUrl,
    args.bannerVerticalUrl,
  );
  return JSON.stringify(partner, null, 2);
}

export async function executeDeletePartner(partnersService: PartnersService, args: { id: number }): Promise<string> {
  await partnersService.remove(args.id);
  return JSON.stringify({ success: true, message: `Partenaire ${args.id} supprimé` });
}
