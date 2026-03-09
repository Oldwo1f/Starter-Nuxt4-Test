/**
 * Admin agent tools for blog management.
 * Calls BlogService directly. Accessible to moderator, admin, superadmin.
 */
import { BlogService } from '../../blog/blog.service';

export const listBlogPostsTool = {
  type: 'function' as const,
  function: {
    name: 'list_blog_posts',
    description: 'Liste les articles du blog avec pagination. Filtres: search, authorId.',
    parameters: {
      type: 'object',
      properties: {
        page: { type: 'number', description: 'Numéro de page (1-based)' },
        pageSize: { type: 'number', description: 'Nombre par page (défaut 10)' },
        search: { type: 'string', description: 'Recherche dans titre et contenu' },
        authorId: { type: 'number', description: 'Filtrer par auteur' },
        sortBy: { type: 'string', description: 'Colonne de tri (id, title, createdAt)' },
        sortOrder: { type: 'string', enum: ['ASC', 'DESC'] },
      },
    },
  },
};

export const getBlogPostTool = {
  type: 'function' as const,
  function: {
    name: 'get_blog_post',
    description: 'Récupère un article de blog par son ID.',
    parameters: {
      type: 'object',
      properties: {
        id: { type: 'number', description: 'ID de l\'article' },
      },
      required: ['id'],
    },
  },
};

export const createBlogPostTool = {
  type: 'function' as const,
  function: {
    name: 'create_blog_post',
    description: 'Crée un nouvel article de blog. Nécessite title et content. Optionnel: videoUrl.',
    parameters: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Titre de l\'article' },
        content: { type: 'string', description: 'Contenu de l\'article' },
        videoUrl: { type: 'string', description: 'URL vidéo (YouTube, Vimeo)' },
      },
      required: ['title', 'content'],
    },
  },
};

export const updateBlogPostTool = {
  type: 'function' as const,
  function: {
    name: 'update_blog_post',
    description: 'Met à jour un article de blog existant.',
    parameters: {
      type: 'object',
      properties: {
        id: { type: 'number', description: 'ID de l\'article' },
        title: { type: 'string' },
        content: { type: 'string' },
        videoUrl: { type: 'string' },
      },
      required: ['id'],
    },
  },
};

export const deleteBlogPostTool = {
  type: 'function' as const,
  function: {
    name: 'delete_blog_post',
    description: 'Supprime un article de blog par ID. Irréversible.',
    parameters: {
      type: 'object',
      properties: {
        id: { type: 'number', description: 'ID de l\'article' },
      },
      required: ['id'],
    },
  },
};

export async function executeListBlogPosts(
  blogService: BlogService,
  args: {
    page?: number;
    pageSize?: number;
    search?: string;
    authorId?: number;
    sortBy?: string;
    sortOrder?: 'ASC' | 'DESC';
  },
): Promise<string> {
  const result = await blogService.findAllPaginated(
    args.page ?? 1,
    args.pageSize ?? 10,
    args.search,
    args.authorId,
    args.sortBy ?? 'createdAt',
    args.sortOrder ?? 'DESC',
  );
  return JSON.stringify(result, null, 2);
}

export async function executeGetBlogPost(blogService: BlogService, args: { id: number }): Promise<string> {
  const post = await blogService.findOne(args.id);
  return JSON.stringify(post, null, 2);
}

export async function executeCreateBlogPost(
  blogService: BlogService,
  authorId: number,
  args: { title: string; content: string; videoUrl?: string },
): Promise<string> {
  const post = await blogService.create(args.title, args.content, authorId, undefined, args.videoUrl);
  return JSON.stringify(post, null, 2);
}

export async function executeUpdateBlogPost(
  blogService: BlogService,
  args: { id: number; title?: string; content?: string; videoUrl?: string },
): Promise<string> {
  const post = await blogService.update(args.id, args.title, args.content, undefined, args.videoUrl);
  return JSON.stringify(post, null, 2);
}

export async function executeDeleteBlogPost(blogService: BlogService, args: { id: number }): Promise<string> {
  await blogService.remove(args.id);
  return JSON.stringify({ success: true, message: `Article ${args.id} supprimé` });
}
