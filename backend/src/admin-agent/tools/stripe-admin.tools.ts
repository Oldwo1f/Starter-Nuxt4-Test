/**
 * Outils Stripe pour l’agent (admin/superadmin — données sensibles).
 */
import { UserRole } from '../../entities/user.entity';
import { StripeService } from '../../stripe/stripe.service';

const ADMIN_ROLES = [UserRole.ADMIN, UserRole.SUPERADMIN];

function requireStripeAdmin(currentUser: { role: UserRole }): void {
  if (!ADMIN_ROLES.includes(currentUser.role)) {
    throw new Error('Réservé aux rôles admin ou superadmin.');
  }
}

export const stripeGetUserSummaryTool = {
  type: 'function' as const,
  function: {
    name: 'stripe_get_user_summary',
    description:
      'Résumé cotisation Stripe pour un utilisateur (customer id, abonnement Te Ohi, dernier paiement pack, dates).',
    parameters: {
      type: 'object',
      properties: { userId: { type: 'number', description: 'ID utilisateur' } },
      required: ['userId'],
    },
  },
};

export const stripeListPaymentsTool = {
  type: 'function' as const,
  function: {
    name: 'stripe_list_recent_payments',
    description:
      'Liste les derniers enregistrements stripe_payments (pack Te Ohi / Umete).',
    parameters: {
      type: 'object',
      properties: {
        limit: { type: 'number', description: 'Nombre max (défaut 20, max 100)' },
      },
    },
  },
};

export const stripeReplayCheckoutSessionTool = {
  type: 'function' as const,
  function: {
    name: 'stripe_replay_checkout_session',
    description:
      'Rejoue le traitement d’une session Checkout Stripe déjà payée (équivalent webhook checkout.session.completed). Utile si le webhook n’est pas arrivé.',
    parameters: {
      type: 'object',
      properties: {
        sessionId: { type: 'string', description: 'ID session cs_...' },
      },
      required: ['sessionId'],
    },
  },
};

export const stripeCancelTeOhiSubscriptionTool = {
  type: 'function' as const,
  function: {
    name: 'stripe_cancel_te_ohi_subscription',
    description:
      'Annule l’abonnement Te Ohi Stripe pour cet utilisateur (subscription cancel) et retire stripeTeOhiSubscriptionId du profil.',
    parameters: {
      type: 'object',
      properties: { userId: { type: 'number' } },
      required: ['userId'],
    },
  },
};

export const stripeRefundPaymentTool = {
  type: 'function' as const,
  function: {
    name: 'stripe_refund_payment',
    description:
      'Rembourse un paiement cotisation via Stripe (refund sur le payment_intent). Utiliser l’ID interne stripe_payments (id), pas le session id.',
    parameters: {
      type: 'object',
      properties: { paymentId: { type: 'number', description: 'ID ligne stripe_payments' } },
      required: ['paymentId'],
    },
  },
};

export async function executeStripeGetUserSummary(
  stripeService: StripeService,
  currentUser: { role: UserRole },
  args: { userId: number },
): Promise<string> {
  requireStripeAdmin(currentUser);
  const data = await stripeService.adminGetUserStripeSummary(args.userId);
  return JSON.stringify(data, null, 2);
}

export async function executeStripeListPayments(
  stripeService: StripeService,
  currentUser: { role: UserRole },
  args: { limit?: number },
): Promise<string> {
  requireStripeAdmin(currentUser);
  const rows = await stripeService.adminListStripePayments(args.limit ?? 20);
  return JSON.stringify(rows, null, 2);
}

export async function executeStripeReplayCheckoutSession(
  stripeService: StripeService,
  currentUser: { role: UserRole },
  args: { sessionId: string },
): Promise<string> {
  requireStripeAdmin(currentUser);
  const result = await stripeService.adminReplayCheckoutSession(args.sessionId.trim());
  return JSON.stringify(result, null, 2);
}

export async function executeStripeCancelTeOhiSubscription(
  stripeService: StripeService,
  currentUser: { role: UserRole },
  args: { userId: number },
): Promise<string> {
  requireStripeAdmin(currentUser);
  const result = await stripeService.adminCancelTeOhiSubscription(args.userId);
  return JSON.stringify(result, null, 2);
}

export async function executeStripeRefundPayment(
  stripeService: StripeService,
  currentUser: { role: UserRole },
  args: { paymentId: number },
): Promise<string> {
  requireStripeAdmin(currentUser);
  const result = await stripeService.adminRefundStripePayment(args.paymentId);
  return JSON.stringify(result, null, 2);
}
