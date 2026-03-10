/**
 * MCP tools for blog post management.
 */

import * as z from 'zod';
import { api } from '../api.js';

export const listBlogPostsSchema = {
  page: z.number().int().min(1).optional().describe('Page number (1-based)'),
  pageSize: z.number().int().min(1).max(100).optional().describe('Items per page'),
  search: z.string().optional().describe('Search in title, content'),
  authorId: z.number().int().positive().optional().describe('Filter by author ID'),
  status: z.enum(['draft', 'active', 'archived']).optional().describe('Filter by status'),
  sortBy: z.string().optional().describe('Sort column (createdAt, title, etc.)'),
  sortOrder: z.enum(['ASC', 'DESC']).optional().describe('Sort order'),
};

export const getBlogPostSchema = {
  id: z.number().int().positive().describe('Blog post ID'),
};

export const createBlogPostSchema = {
  title: z.string().min(1).describe('Post title'),
  content: z.string().min(1).describe('Post content (supports markdown)'),
  videoUrl: z.string().url().optional().describe('Video URL (YouTube, Vimeo, etc.)'),
  status: z.enum(['draft', 'active', 'archived']).optional().describe('Status (default: draft)'),
  publishedAt: z.string().datetime().optional().describe('Publication date (ISO) or scheduled'),
  isPinned: z.boolean().optional().describe('Featured at top'),
};

export const updateBlogPostSchema = {
  id: z.number().int().positive().describe('Blog post ID'),
  title: z.string().min(1).optional().describe('Post title'),
  content: z.string().min(1).optional().describe('Post content'),
  videoUrl: z.string().url().optional().describe('Video URL'),
  status: z.enum(['draft', 'active', 'archived']).optional().describe('Status'),
  publishedAt: z.string().datetime().optional().describe('Publication date (ISO)'),
  isPinned: z.boolean().optional().describe('Featured at top'),
};

export const deleteBlogPostSchema = {
  id: z.number().int().positive().describe('Blog post ID'),
};

export async function listBlogPosts(
  args: z.infer<z.ZodObject<typeof listBlogPostsSchema>>
) {
  const params: Record<string, string | number | undefined> = {
    page: args.page ?? 1,
    pageSize: args.pageSize ?? 10,
    search: args.search,
    authorId: args.authorId,
    sortBy: args.sortBy,
    sortOrder: args.sortOrder,
  };
  if (args.status) params.status = args.status;
  const data = await api.get<{
    data: unknown[];
    total: number;
    page: number;
    pageSize: number;
  }>('/blog', params);
  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(data, null, 2),
      },
    ],
  };
}

export async function getBlogPost(args: { id: number }) {
  const data = await api.get<unknown>(`/blog/${args.id}`);
  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(data, null, 2),
      },
    ],
  };
}

export async function createBlogPost(args: {
  title: string;
  content: string;
  videoUrl?: string;
  status?: string;
  publishedAt?: string;
  isPinned?: boolean;
}) {
  const form = new FormData();
  form.append('title', args.title);
  form.append('content', args.content);
  form.append('status', args.status ?? 'draft');
  if (args.publishedAt) form.append('publishedAt', args.publishedAt);
  else form.append('publishedAt', '');
  form.append('isPinned', String(args.isPinned ?? false));
  if (args.videoUrl) form.append('videoUrl', args.videoUrl);
  const data = await api.post<{ id: number }>('/blog', form);
  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(data, null, 2),
      },
    ],
  };
}

export async function updateBlogPost(args: {
  id: number;
  title?: string;
  content?: string;
  videoUrl?: string;
  status?: string;
  publishedAt?: string;
  isPinned?: boolean;
}) {
  const form = new FormData();
  if (args.title !== undefined) form.append('title', args.title);
  if (args.content !== undefined) form.append('content', args.content);
  if (args.videoUrl !== undefined) form.append('videoUrl', args.videoUrl);
  if (args.status !== undefined) form.append('status', args.status);
  if (args.publishedAt !== undefined) form.append('publishedAt', args.publishedAt);
  if (args.isPinned !== undefined) form.append('isPinned', String(args.isPinned));
  const data = await api.patch<unknown>(`/blog/${args.id}`, form);
  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(data, null, 2),
      },
    ],
  };
}

export async function deleteBlogPost(args: { id: number }) {
  await api.delete(`/blog/${args.id}`);
  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify({ success: true, message: `Blog post ${args.id} deleted` }),
      },
    ],
  };
}
