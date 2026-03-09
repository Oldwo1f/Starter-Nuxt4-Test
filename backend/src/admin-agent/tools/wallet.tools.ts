/**
 * Admin agent tools for wallet (crédit admin). Admin/superadmin uniquement.
 */
import { UserRole } from '../../entities/user.entity';
import { WalletService } from '../../wallet/wallet.service';

const STAFF_ADMIN_ROLES = [UserRole.ADMIN, UserRole.SUPERADMIN];

function requireAdmin(currentUser: { role: UserRole }): void {
  if (!STAFF_ADMIN_ROLES.includes(currentUser.role)) {
    throw new Error('Cette action nécessite le rôle admin ou superadmin.');
  }
}

export const adminCreditUserTool = {
  type: 'function' as const,
  function: {
    name: 'admin_credit_user',
    description: 'Crédite le portefeuille d\'un utilisateur en Pūpū. Admin/superadmin uniquement. Nécessite userId, amount, description.',
    parameters: {
      type: 'object',
      properties: {
        userId: { type: 'number', description: 'ID de l\'utilisateur à créditer' },
        amount: { type: 'number', description: 'Montant en Pūpū (doit être > 0)' },
        description: { type: 'string', description: 'Description de la transaction (obligatoire)' },
      },
      required: ['userId', 'amount', 'description'],
    },
  },
};

export async function executeAdminCreditUser(
  walletService: WalletService,
  currentUser: { id: number; role: UserRole },
  args: { userId: number; amount: number; description: string },
): Promise<string> {
  requireAdmin(currentUser);
  const transaction = await walletService.adminCreditUser(
    currentUser.id,
    args.userId,
    args.amount,
    args.description,
  );
  return JSON.stringify(transaction, null, 2);
}
