/**
 * Admin agent tools for user management.
 * Calls UsersService directly. Restricted to admin/superadmin for sensitive operations.
 */
import { UserRole } from '../../entities/user.entity';
import { UsersService } from '../../users/users.service';

const STAFF_ADMIN_ROLES = [UserRole.ADMIN, UserRole.SUPERADMIN];

function requireAdmin(currentUser: { role: UserRole }): void {
  if (!STAFF_ADMIN_ROLES.includes(currentUser.role)) {
    throw new Error('Cette action nécessite le rôle admin ou superadmin.');
  }
}

export const listUsersTool = {
  type: 'function' as const,
  function: {
    name: 'list_users',
    description: `Liste les utilisateurs avec pagination et filtres de recherche.
IMPORTANT - Utilise les filtres dès que l'utilisateur mentionne un nom ou une identité :
- Si l'utilisateur dit un prénom (ex: "Marie", "Jean") → utilise firstName
- Si l'utilisateur dit un nom de famille (ex: "Dupont", "Martin") → utilise lastName
- Si l'utilisateur dit un nom complet (ex: "Marie Dupont") → utilise firstName ET lastName (ou search)
- Si l'utilisateur dit un email ou une commune → utilise email ou commune
Exemples : "trouve Marie", "qui est Dupont", "utilisateurs nommés Jean Martin" → utilise list_users avec les filtres appropriés.`,
    parameters: {
      type: 'object',
      properties: {
        page: { type: 'number', description: 'Numéro de page (1-based)' },
        pageSize: { type: 'number', description: 'Nombre par page (défaut 10)' },
        search: { type: 'string', description: 'Recherche générale (email, nom, prénom, commune, téléphone, ID). Alternative aux filtres ciblés.' },
        firstName: { type: 'string', description: 'Filtrer par PRÉNOM. À utiliser dès que l\'utilisateur mentionne un prénom (ex: "Marie", "Jean").' },
        lastName: { type: 'string', description: 'Filtrer par NOM DE FAMILLE. À utiliser dès que l\'utilisateur mentionne un nom (ex: "Dupont", "Martin").' },
        email: { type: 'string', description: 'Filtrer par email (contient)' },
        commune: { type: 'string', description: 'Filtrer par commune / adresse (contient)' },
        role: { type: 'string', enum: ['user', 'member', 'premium', 'vip', 'moderator', 'admin', 'superadmin'] },
        sortBy: { type: 'string', description: 'Colonne de tri (id, email, firstName, lastName, createdAt, etc.)' },
        sortOrder: { type: 'string', enum: ['ASC', 'DESC'] },
      },
    },
  },
};

export const getUserTool = {
  type: 'function' as const,
  function: {
    name: 'get_user',
    description: 'Récupère un utilisateur par son ID.',
    parameters: {
      type: 'object',
      properties: {
        id: { type: 'number', description: 'ID de l\'utilisateur' },
      },
      required: ['id'],
    },
  },
};

export const updateUserRoleTool = {
  type: 'function' as const,
  function: {
    name: 'update_user_role',
    description: 'Modifie le rôle d\'un utilisateur. Admin/superadmin uniquement.',
    parameters: {
      type: 'object',
      properties: {
        id: { type: 'number', description: 'ID de l\'utilisateur' },
        role: { type: 'string', enum: ['user', 'member', 'premium', 'vip', 'moderator', 'admin', 'superadmin'] },
      },
      required: ['id', 'role'],
    },
  },
};

export const updateUserTool = {
  type: 'function' as const,
  function: {
    name: 'update_user',
    description: 'Met à jour le profil utilisateur (firstName, lastName, isCertified). Admin/superadmin uniquement.',
    parameters: {
      type: 'object',
      properties: {
        id: { type: 'number', description: 'ID de l\'utilisateur' },
        firstName: { type: 'string' },
        lastName: { type: 'string' },
        isCertified: { type: 'boolean' },
      },
      required: ['id'],
    },
  },
};

export const deleteUserTool = {
  type: 'function' as const,
  function: {
    name: 'delete_user',
    description: 'Supprime un utilisateur par ID. Irréversible. Admin/superadmin uniquement.',
    parameters: {
      type: 'object',
      properties: {
        id: { type: 'number', description: 'ID de l\'utilisateur' },
      },
      required: ['id'],
    },
  },
};

export async function executeListUsers(
  usersService: UsersService,
  args: {
    page?: number;
    pageSize?: number;
    search?: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    commune?: string;
    role?: string;
    sortBy?: string;
    sortOrder?: 'ASC' | 'DESC';
  },
): Promise<string> {
  const result = await usersService.findAllPaginated(
    args.page ?? 1,
    args.pageSize ?? 10,
    args.search,
    args.role,
    undefined,
    undefined,
    args.sortBy ?? 'id',
    args.sortOrder ?? 'ASC',
    {
      firstName: args.firstName,
      lastName: args.lastName,
      email: args.email,
      commune: args.commune,
    },
  );
  return JSON.stringify(result, null, 2);
}

export async function executeGetUser(usersService: UsersService, args: { id: number }): Promise<string> {
  const user = await usersService.findById(args.id);
  if (!user) return JSON.stringify({ error: 'Utilisateur non trouvé' });
  const { password, ...safe } = user;
  return JSON.stringify(safe, null, 2);
}

export async function executeUpdateUserRole(
  usersService: UsersService,
  currentUser: { role: UserRole },
  args: { id: number; role: string },
): Promise<string> {
  requireAdmin(currentUser);
  const role = args.role as UserRole;
  const updated = await usersService.updateRole(args.id, role);
  const { password, ...safe } = updated;
  return JSON.stringify(safe, null, 2);
}

export async function executeUpdateUser(
  usersService: UsersService,
  currentUser: { role: UserRole },
  args: { id: number; firstName?: string; lastName?: string; isCertified?: boolean },
): Promise<string> {
  requireAdmin(currentUser);
  await usersService.updateUser(args.id, {
    firstName: args.firstName,
    lastName: args.lastName,
    isCertified: args.isCertified,
  });
  const user = await usersService.findById(args.id);
  if (!user) return JSON.stringify({ error: 'Utilisateur non trouvé' });
  const { password, ...safe } = user;
  return JSON.stringify(safe, null, 2);
}

export async function executeDeleteUser(
  usersService: UsersService,
  currentUser: { role: UserRole },
  args: { id: number },
): Promise<string> {
  requireAdmin(currentUser);
  await usersService.remove(args.id);
  return JSON.stringify({ success: true, message: `Utilisateur ${args.id} supprimé` });
}
