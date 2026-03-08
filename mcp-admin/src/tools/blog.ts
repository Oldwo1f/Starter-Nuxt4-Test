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
};

export const updateBlogPostSchema = {
  id: z.number().int().positive().describe('Blog post ID'),
  title: z.string().min(1).optional().describe('Post title'),
  content: z.string().min(1).optional().describe('Post content'),
  videoUrl: z.string().url().optional().describe('Video URL'),
};

export const deleteBlogPostSchema = {
  id: z.number().int().positive().describe('Blog post ID'),
};

export async function listBlogPosts(
  args: z.infer<z.ZodObject<typeof listBlogPostsSchema>>
) {
  const data = await api.get<{
    data: unknown[];
    total: number;
    page: number;
    pageSize: number;
  }>('/blog', {
    page: args.page ?? 1,
    pageSize: args.pageSize ?? 10,
    search: args.search,
    authorId: args.authorId,
    sortBy: args.sortBy,
    sortOrder: args.sortOrder,
  });
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
}) {
  const form = new FormData();
  form.append('title', args.title);
  form.append('content', args.content);
  let data = await api.post<{ id: number }>('/blog', form);
  if (args.videoUrl && data && typeof data === 'object' && 'id' in data) {
    data = await api.patch<unknown>(`/blog/${(data as { id: number }).id}`, {
      videoUrl: args.videoUrl,
    }) as { id: number };
  }
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
}) {
  const body: Record<string, string> = {};
  if (args.title !== undefined) body.title = args.title;
  if (args.content !== undefined) body.content = args.content;
  if (args.videoUrl !== undefined) body.videoUrl = args.videoUrl;
  const data = await api.patch<unknown>(`/blog/${args.id}`, body);
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
