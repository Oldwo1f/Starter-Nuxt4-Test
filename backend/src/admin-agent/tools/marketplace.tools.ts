/**
 * Admin agent tools for marketplace (annonces). L'admin peut modifier/supprimer toute annonce.
 */
import { MarketplaceService } from '../../marketplace/marketplace.service';
import { ListingStatus, ListingType } from '../../entities/listing.entity';

export const listListingsTool = {
  type: 'function' as const,
  function: {
    name: 'list_listings',
    description: 'Liste les annonces du marketplace avec pagination. Filtres: page, pageSize, search, status, type, sellerId, showAll.',
    parameters: {
      type: 'object',
      properties: {
        page: { type: 'number', description: 'Numéro de page (1-based)' },
        pageSize: { type: 'number', description: 'Nombre par page (défaut 20)' },
        search: { type: 'string', description: 'Recherche dans titre et description' },
        status: { type: 'string', enum: ['active', 'sold', 'archived'], description: 'Filtrer par statut' },
        type: { type: 'string', enum: ['bien', 'service'], description: 'Filtrer par type' },
        sellerId: { type: 'number', description: 'Filtrer par vendeur' },
        showAll: { type: 'boolean', description: 'Afficher toutes les annonces (y compris non actives)' },
      },
    },
  },
};

export const getListingTool = {
  type: 'function' as const,
  function: {
    name: 'get_listing',
    description: 'Récupère une annonce par son ID.',
    parameters: {
      type: 'object',
      properties: { id: { type: 'number', description: 'ID de l\'annonce' } },
      required: ['id'],
    },
  },
};

export const updateListingTool = {
  type: 'function' as const,
  function: {
    name: 'update_listing',
    description: 'Met à jour une annonce. L\'admin peut modifier toute annonce.',
    parameters: {
      type: 'object',
      properties: {
        id: { type: 'number', description: 'ID de l\'annonce' },
        title: { type: 'string' },
        description: { type: 'string' },
        price: { type: 'number', description: 'Prix en Pūpū' },
        priceUnit: { type: 'string' },
        type: { type: 'string', enum: ['bien', 'service'] },
        categoryId: { type: 'number' },
        locationId: { type: 'number' },
        status: { type: 'string', enum: ['active', 'sold', 'archived'] },
        isSearching: { type: 'boolean' },
      },
      required: ['id'],
    },
  },
};

export const deleteListingTool = {
  type: 'function' as const,
  function: {
    name: 'delete_listing',
    description: 'Supprime une annonce par ID. L\'admin peut supprimer toute annonce. Irréversible.',
    parameters: {
      type: 'object',
      properties: { id: { type: 'number', description: 'ID de l\'annonce' } },
      required: ['id'],
    },
  },
};

export async function executeListListings(
  marketplaceService: MarketplaceService,
  args: {
    page?: number;
    pageSize?: number;
    search?: string;
    status?: string;
    type?: string;
    sellerId?: number;
    showAll?: boolean;
  },
): Promise<string> {
  const result = await marketplaceService.findAll(
    args.page ?? 1,
    args.pageSize ?? 20,
    {
      search: args.search,
      status: args.status as ListingStatus | undefined,
      type: args.type as ListingType | undefined,
      sellerId: args.sellerId,
      showAll: args.showAll ?? false,
    },
  );
  return JSON.stringify(result, null, 2);
}

export async function executeGetListing(
  marketplaceService: MarketplaceService,
  args: { id: number },
): Promise<string> {
  const listing = await marketplaceService.findOne(args.id, false);
  return JSON.stringify(listing, null, 2);
}

export async function executeUpdateListing(
  marketplaceService: MarketplaceService,
  currentUser: { id: number; role: string },
  args: {
    id: number;
    title?: string;
    description?: string;
    price?: number;
    priceUnit?: string;
    type?: string;
    categoryId?: number;
    locationId?: number;
    status?: string;
    isSearching?: boolean;
  },
): Promise<string> {
  const updates: Record<string, unknown> = {};
  if (args.title !== undefined) updates.title = args.title;
  if (args.description !== undefined) updates.description = args.description;
  if (args.price !== undefined) updates.price = args.price;
  if (args.priceUnit !== undefined) updates.priceUnit = args.priceUnit;
  if (args.type !== undefined) updates.type = args.type as ListingType;
  if (args.categoryId !== undefined) updates.categoryId = args.categoryId;
  if (args.locationId !== undefined) updates.locationId = args.locationId;
  if (args.status !== undefined) updates.status = args.status as ListingStatus;
  if (args.isSearching !== undefined) updates.isSearching = args.isSearching;

  const listing = await marketplaceService.update(
    args.id,
    currentUser.id,
    updates as Parameters<typeof marketplaceService.update>[2],
    currentUser.role,
  );
  return JSON.stringify(listing, null, 2);
}

export async function executeDeleteListing(
  marketplaceService: MarketplaceService,
  currentUser: { id: number; role: string },
  args: { id: number },
): Promise<string> {
  await marketplaceService.remove(args.id, currentUser.id, currentUser.role);
  return JSON.stringify({ success: true, message: `Annonce ${args.id} supprimée` });
}
