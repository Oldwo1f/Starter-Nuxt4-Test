#!/usr/bin/env node
/**
 * MCP server for Nuna Heritage site administration.
 * Exposes tools for managing users and blog posts.
 */
import { config } from 'dotenv';
import path from 'path';

// Load .env from project root (when running standalone)
const cwd = process.cwd();
const rootEnv =
  path.basename(cwd) === 'mcp-admin'
    ? path.resolve(cwd, '..', '.env')
    : path.resolve(cwd, '.env');
config({ path: rootEnv });

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import * as z from 'zod';
import {
  listUsers,
  getUser,
  updateUserRole,
  updateUser,
  deleteUser,
  listUsersSchema,
  getUserSchema,
  updateUserRoleSchema,
  updateUserSchema,
  deleteUserSchema,
} from './tools/users.js';
import {
  listBlogPosts,
  getBlogPost,
  createBlogPost,
  updateBlogPost,
  deleteBlogPost,
  listBlogPostsSchema,
  getBlogPostSchema,
  createBlogPostSchema,
  updateBlogPostSchema,
  deleteBlogPostSchema,
} from './tools/blog.js';

const server = new McpServer({
  name: 'nuna-admin',
  version: '1.0.0',
});

// --- Users tools ---
server.registerTool(
  'list_users',
  {
    description:
      'List users with pagination. Use to browse, search, or filter users by role. Admin only.',
    inputSchema: listUsersSchema,
  },
  async (args) => listUsers(args)
);

server.registerTool(
  'get_user',
  {
    description: 'Get a single user by ID. Returns full user profile. Admin only.',
    inputSchema: getUserSchema,
  },
  async (args) => getUser(args)
);

server.registerTool(
  'update_user_role',
  {
    description:
      'Change a user\'s role. Roles: superadmin, admin, moderator, user, member, premium, vip. Admin only.',
    inputSchema: updateUserRoleSchema,
  },
  async (args) => updateUserRole(args)
);

server.registerTool(
  'update_user',
  {
    description: 'Update user profile (firstName, lastName, isCertified). Admin only.',
    inputSchema: updateUserSchema,
  },
  async (args) => updateUser(args)
);

server.registerTool(
  'delete_user',
  {
    description: 'Delete a user by ID. Admin only. Irreversible.',
    inputSchema: deleteUserSchema,
  },
  async (args) => deleteUser(args)
);

// --- Blog tools ---
server.registerTool(
  'list_blog_posts',
  {
    description:
      'List blog posts with pagination. Use to browse or search articles. Filter by authorId if needed.',
    inputSchema: listBlogPostsSchema,
  },
  async (args) => listBlogPosts(args)
);

server.registerTool(
  'get_blog_post',
  {
    description: 'Get a single blog post by ID. Returns full article with author.',
    inputSchema: getBlogPostSchema,
  },
  async (args) => getBlogPost(args)
);

server.registerTool(
  'create_blog_post',
  {
    description:
      'Create a new blog post. Requires title and content. Optional videoUrl (YouTube, Vimeo). Admin/moderator only.',
    inputSchema: createBlogPostSchema,
  },
  async (args) => createBlogPost(args)
);

server.registerTool(
  'update_blog_post',
  {
    description: 'Update an existing blog post (title, content, videoUrl). Admin/moderator only.',
    inputSchema: updateBlogPostSchema,
  },
  async (args) => updateBlogPost(args)
);

server.registerTool(
  'delete_blog_post',
  {
    description: 'Delete a blog post by ID. Admin/moderator only. Irreversible.',
    inputSchema: deleteBlogPostSchema,
  },
  async (args) => deleteBlogPost(args)
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Nuna Admin MCP server running on stdio');
}

main().catch((err) => {
  console.error('Server error:', err);
  process.exit(1);
});
