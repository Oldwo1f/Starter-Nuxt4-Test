/**
 * Admin agent tools for billing (vérifications paiements). Admin/superadmin uniquement.
 */
import { UserRole } from '../../entities/user.entity';
import { BillingService } from '../../billing/billing.service';

const STAFF_ADMIN_ROLES = [UserRole.ADMIN, UserRole.SUPERADMIN];

function requireAdmin(currentUser: { role: UserRole }): void {
  if (!STAFF_ADMIN_ROLES.includes(currentUser.role)) {
    throw new Error('Cette action nécessite le rôle admin ou superadmin.');
  }
}

export const getPendingBankVerificationsTool = {
  type: 'function' as const,
  function: {
    name: 'get_pending_bank_verifications',
    description: 'Liste les paiements virement bancaire en attente de vérification admin. Admin/superadmin uniquement.',
    parameters: { type: 'object', properties: {} },
  },
};

export const confirmBankVerificationTool = {
  type: 'function' as const,
  function: {
    name: 'confirm_bank_verification',
    description: 'Confirme un paiement virement bancaire (accorde accès et Pūpū). Admin/superadmin uniquement.',
    parameters: {
      type: 'object',
      properties: { paymentId: { type: 'number', description: 'ID du paiement' } },
      required: ['paymentId'],
    },
  },
};

export const getPendingLegacyVerificationsTool = {
  type: 'function' as const,
  function: {
    name: 'get_pending_legacy_verifications',
    description: 'Liste les vérifications paiements legacy (Naho/Tamiga) en attente. Admin/superadmin uniquement.',
    parameters: { type: 'object', properties: {} },
  },
};

export const confirmLegacyVerificationTool = {
  type: 'function' as const,
  function: {
    name: 'confirm_legacy_verification',
    description: 'Confirme une vérification paiement legacy. Admin/superadmin uniquement.',
    parameters: {
      type: 'object',
      properties: {
        verificationId: { type: 'number', description: 'ID de la vérification' },
        upgradeToPremium: { type: 'boolean', description: 'Passer en premium au lieu de member (défaut: false)' },
        expirationDay: { type: 'number', description: 'Jour d\'expiration personnalisé (1-31)' },
        expirationMonth: { type: 'number', description: 'Mois d\'expiration personnalisé (1-12)' },
      },
      required: ['verificationId'],
    },
  },
};

export const rejectLegacyVerificationTool = {
  type: 'function' as const,
  function: {
    name: 'reject_legacy_verification',
    description: 'Rejette une vérification paiement legacy (retire les droits). Admin/superadmin uniquement.',
    parameters: {
      type: 'object',
      properties: { verificationId: { type: 'number', description: 'ID de la vérification' } },
      required: ['verificationId'],
    },
  },
};

export async function executeGetPendingBankVerifications(
  billingService: BillingService,
  currentUser: { role: UserRole },
): Promise<string> {
  requireAdmin(currentUser);
  const list = await billingService.getPendingVerifications();
  return JSON.stringify(list, null, 2);
}

export async function executeConfirmBankVerification(
  billingService: BillingService,
  currentUser: { id: number; role: UserRole },
  args: { paymentId: number },
): Promise<string> {
  requireAdmin(currentUser);
  const result = await billingService.confirmVerification(args.paymentId, currentUser.id);
  return JSON.stringify(result, null, 2);
}

export async function executeGetPendingLegacyVerifications(
  billingService: BillingService,
  currentUser: { role: UserRole },
): Promise<string> {
  requireAdmin(currentUser);
  const list = await billingService.getPendingLegacyVerifications();
  return JSON.stringify(list, null, 2);
}

export async function executeConfirmLegacyVerification(
  billingService: BillingService,
  currentUser: { id: number; role: UserRole },
  args: {
    verificationId: number;
    upgradeToPremium?: boolean;
    expirationDay?: number;
    expirationMonth?: number;
  },
): Promise<string> {
  requireAdmin(currentUser);
  const result = await billingService.confirmLegacyVerification(
    args.verificationId,
    currentUser.id,
    args.upgradeToPremium ?? false,
    args.expirationDay,
    args.expirationMonth,
  );
  return JSON.stringify(result, null, 2);
}

export async function executeRejectLegacyVerification(
  billingService: BillingService,
  currentUser: { id: number; role: UserRole },
  args: { verificationId: number },
): Promise<string> {
  requireAdmin(currentUser);
  await billingService.rejectLegacyVerification(args.verificationId, currentUser.id);
  return JSON.stringify({ success: true, message: `Vérification ${args.verificationId} rejetée` });
}
