/**
 * Configuration bannière site (staff).
 */
import { UserRole } from '../../entities/user.entity';
import { BannerService } from '../../banner/banner.service';

const STAFF_ROLES = [UserRole.MODERATOR, UserRole.ADMIN, UserRole.SUPERADMIN];

function requireStaff(currentUser: { role: UserRole }): void {
  if (!STAFF_ROLES.includes(currentUser.role)) {
    throw new Error('Accès refusé.');
  }
}

export const getSiteBannerTool = {
  type: 'function' as const,
  function: {
    name: 'get_site_banner',
    description:
      'Lit la configuration bannière site (actif, URLs images desktop/mobile).',
    parameters: { type: 'object', properties: {} },
  },
};

export const updateSiteBannerTool = {
  type: 'function' as const,
  function: {
    name: 'update_site_banner',
    description:
      "Met à jour la bannière site. Utiliser des URLs déjà déposées via le chat (bouton « Joindre une image ») : chemins /uploads/agent/{id}/... ou anciennes URLs /uploads/banners/site/...",
    parameters: {
      type: 'object',
      properties: {
        isActive: { type: 'boolean', description: 'Activer ou désactiver la bannière' },
        desktopImageUrl: {
          type: 'string',
          description: 'URL publique image desktop (ex. /uploads/agent/1/xxx.jpg)',
        },
        mobileImageUrl: {
          type: 'string',
          description: 'URL publique image mobile',
        },
        clearDesktop: {
          type: 'boolean',
          description: 'Si true, retire l’image desktop (garde isActive si fourni)',
        },
        clearMobile: { type: 'boolean', description: 'Si true, retire l’image mobile' },
      },
    },
  },
};

export async function executeGetSiteBanner(bannerService: BannerService): Promise<string> {
  const config = await bannerService.getConfig();
  return JSON.stringify(
    {
      isActive: config.isActive,
      desktopImageUrl: config.desktopImageUrl,
      mobileImageUrl: config.mobileImageUrl,
    },
    null,
    2,
  );
}

export async function executeUpdateSiteBanner(
  bannerService: BannerService,
  currentUser: { role: UserRole },
  args: {
    isActive?: boolean;
    desktopImageUrl?: string;
    mobileImageUrl?: string;
    clearDesktop?: boolean;
    clearMobile?: boolean;
  },
): Promise<string> {
  requireStaff(currentUser);
  const payload: {
    isActive?: boolean;
    desktopImageUrl?: string | null;
    mobileImageUrl?: string | null;
  } = {};

  if (typeof args.isActive === 'boolean') {
    payload.isActive = args.isActive;
  }
  if (args.clearDesktop) {
    payload.desktopImageUrl = null;
  } else if (args.desktopImageUrl !== undefined) {
    payload.desktopImageUrl = args.desktopImageUrl;
  }
  if (args.clearMobile) {
    payload.mobileImageUrl = null;
  } else if (args.mobileImageUrl !== undefined) {
    payload.mobileImageUrl = args.mobileImageUrl;
  }

  const updated = await bannerService.updateConfigFromPublicUrls(payload);
  return JSON.stringify(
    {
      ok: true,
      isActive: updated.isActive,
      desktopImageUrl: updated.desktopImageUrl,
      mobileImageUrl: updated.mobileImageUrl,
    },
    null,
    2,
  );
}
