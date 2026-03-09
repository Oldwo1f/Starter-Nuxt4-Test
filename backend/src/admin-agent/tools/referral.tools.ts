/**
 * Admin agent tools for referral (parrainage).
 */
import { ReferralService } from '../../referral/referral.service';

export const getReferralStatsTool = {
  type: 'function' as const,
  function: {
    name: 'get_referral_stats',
    description: 'Récupère les statistiques de parrainage d\'un utilisateur (nombre de filleuls, inscrits, membres, validés, récompenses).',
    parameters: {
      type: 'object',
      properties: { userId: { type: 'number', description: 'ID de l\'utilisateur' } },
      required: ['userId'],
    },
  },
};

export const getReferralCodeTool = {
  type: 'function' as const,
  function: {
    name: 'get_referral_code',
    description: 'Récupère ou génère le code de parrainage d\'un utilisateur.',
    parameters: {
      type: 'object',
      properties: { userId: { type: 'number', description: 'ID de l\'utilisateur' } },
      required: ['userId'],
    },
  },
};

export async function executeGetReferralStats(
  referralService: ReferralService,
  args: { userId: number },
): Promise<string> {
  const stats = await referralService.getReferralStats(args.userId);
  return JSON.stringify(stats, null, 2);
}

export async function executeGetReferralCode(
  referralService: ReferralService,
  args: { userId: number },
): Promise<string> {
  const code = await referralService.getReferralCode(args.userId);
  return JSON.stringify({ code }, null, 2);
}
