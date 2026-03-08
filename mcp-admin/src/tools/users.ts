/**
 * MCP tools for user management.
 */

import * as z from 'zod';
import { api } from '../api.js';

export const UserRoleEnum = z.enum([
  'superadmin',
  'admin',
  'moderator',
  'user',
  'member',
  'premium',
  'vip',
]);

export type UserRole = z.infer<typeof UserRoleEnum>;

export const listUsersSchema = {
  page: z.number().int().min(1).optional().describe('Page number (1-based)'),
  pageSize: z.number().int().min(1).max(100).optional().describe('Items per page'),
  search: z.string().optional().describe('Search in email, ID'),
  role: UserRoleEnum.optional().describe('Filter by role'),
  sortBy: z.string().optional().describe('Sort column (id, email, createdAt, etc.)'),
  sortOrder: z.enum(['ASC', 'DESC']).optional().describe('Sort order'),
};

export const getUserSchema = {
  id: z.number().int().positive().describe('User ID'),
};

export const updateUserRoleSchema = {
  id: z.number().int().positive().describe('User ID'),
  role: UserRoleEnum.describe('New role'),
};

export const updateUserSchema = {
  id: z.number().int().positive().describe('User ID'),
  firstName: z.string().optional().describe('First name'),
  lastName: z.string().optional().describe('Last name'),
  isCertified: z.boolean().optional().describe('Certified badge status'),
};

export const deleteUserSchema = {
  id: z.number().int().positive().describe('User ID'),
};

export async function listUsers(args: z.infer<z.ZodObject<typeof listUsersSchema>>) {
  const data = await api.get<{ data: unknown[]; total: number; page: number; pageSize: number }>(
    '/users',
    {
      page: args.page ?? 1,
      pageSize: args.pageSize ?? 10,
      search: args.search,
      role: args.role,
      sortBy: args.sortBy,
      sortOrder: args.sortOrder,
    }
  );
  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(data, null, 2),
      },
    ],
  };
}

export async function getUser(args: { id: number }) {
  const data = await api.get<unknown>(`/users/${args.id}`);
  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(data, null, 2),
      },
    ],
  };
}

export async function updateUserRole(args: { id: number; role: UserRole }) {
  const data = await api.patch<unknown>(`/users/${args.id}/role`, { role: args.role });
  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(data, null, 2),
      },
    ],
  };
}

export async function updateUser(args: {
  id: number;
  firstName?: string;
  lastName?: string;
  isCertified?: boolean;
}) {
  const body: Record<string, unknown> = {};
  if (args.firstName !== undefined) body.firstName = args.firstName;
  if (args.lastName !== undefined) body.lastName = args.lastName;
  if (args.isCertified !== undefined) body.isCertified = args.isCertified;
  const data = await api.patch<unknown>(`/users/${args.id}`, body);
  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(data, null, 2),
      },
    ],
  };
}

export async function deleteUser(args: { id: number }) {
  await api.delete(`/users/${args.id}`);
  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify({ success: true, message: `User ${args.id} deleted` }),
      },
    ],
  };
}
