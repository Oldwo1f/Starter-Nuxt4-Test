/**
 * Admin agent tools for academy (courses, modules, videos) management.
 */
import { AcademyService } from '../../academy/academy.service';

export const listCoursesTool = {
  type: 'function' as const,
  function: {
    name: 'list_academy_courses',
    description: 'Liste tous les cours de l\'académie avec leurs modules et vidéos.',
    parameters: { type: 'object', properties: {} },
  },
};

export const getCourseTool = {
  type: 'function' as const,
  function: {
    name: 'get_academy_course',
    description: 'Récupère un cours par son ID avec modules et vidéos.',
    parameters: {
      type: 'object',
      properties: { id: { type: 'number', description: 'ID du cours' } },
      required: ['id'],
    },
  },
};

export const createCourseTool = {
  type: 'function' as const,
  function: {
    name: 'create_academy_course',
    description: 'Crée un nouveau cours. Nécessite title.',
    parameters: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Titre du cours' },
        description: { type: 'string' },
        thumbnailImage: { type: 'string' },
        isPublished: { type: 'boolean', description: 'Publié (défaut: false)' },
        accessLevel: { type: 'string', enum: ['public', 'member', 'premium', 'vip'], description: 'Niveau d\'accès' },
        order: { type: 'number', description: 'Ordre d\'affichage' },
        instructorFirstName: { type: 'string' },
        instructorLastName: { type: 'string' },
        instructorTitle: { type: 'string' },
        instructorLink: { type: 'string' },
      },
      required: ['title'],
    },
  },
};

export const updateCourseTool = {
  type: 'function' as const,
  function: {
    name: 'update_academy_course',
    description: 'Met à jour un cours existant.',
    parameters: {
      type: 'object',
      properties: {
        id: { type: 'number' },
        title: { type: 'string' },
        description: { type: 'string' },
        thumbnailImage: { type: 'string' },
        isPublished: { type: 'boolean' },
        accessLevel: { type: 'string', enum: ['public', 'member', 'premium', 'vip'] },
        order: { type: 'number' },
        instructorFirstName: { type: 'string' },
        instructorLastName: { type: 'string' },
        instructorTitle: { type: 'string' },
        instructorLink: { type: 'string' },
      },
      required: ['id'],
    },
  },
};

export const deleteCourseTool = {
  type: 'function' as const,
  function: {
    name: 'delete_academy_course',
    description: 'Supprime un cours par ID. Irréversible.',
    parameters: {
      type: 'object',
      properties: { id: { type: 'number' } },
      required: ['id'],
    },
  },
};

export const createAcademyModuleTool = {
  type: 'function' as const,
  function: {
    name: 'create_academy_module',
    description: 'Crée un module dans un cours. Nécessite courseId et title.',
    parameters: {
      type: 'object',
      properties: {
        courseId: { type: 'number', description: 'ID du cours parent' },
        title: { type: 'string', description: 'Titre du module' },
        description: { type: 'string' },
        order: { type: 'number', description: 'Ordre d\'affichage' },
      },
      required: ['courseId', 'title'],
    },
  },
};

export const getAcademyModuleTool = {
  type: 'function' as const,
  function: {
    name: 'get_academy_module',
    description: 'Récupère un module par son ID.',
    parameters: {
      type: 'object',
      properties: { id: { type: 'number' } },
      required: ['id'],
    },
  },
};

export const updateAcademyModuleTool = {
  type: 'function' as const,
  function: {
    name: 'update_academy_module',
    description: 'Met à jour un module existant.',
    parameters: {
      type: 'object',
      properties: {
        id: { type: 'number' },
        title: { type: 'string' },
        description: { type: 'string' },
        order: { type: 'number' },
      },
      required: ['id'],
    },
  },
};

export const deleteAcademyModuleTool = {
  type: 'function' as const,
  function: {
    name: 'delete_academy_module',
    description: 'Supprime un module par ID. Irréversible.',
    parameters: {
      type: 'object',
      properties: { id: { type: 'number' } },
      required: ['id'],
    },
  },
};

export const createAcademyVideoTool = {
  type: 'function' as const,
  function: {
    name: 'create_academy_video',
    description: 'Crée une vidéo dans un module. Nécessite moduleId, title, et videoUrl OU videoFile.',
    parameters: {
      type: 'object',
      properties: {
        moduleId: { type: 'number', description: 'ID du module parent' },
        title: { type: 'string', description: 'Titre de la vidéo' },
        videoUrl: { type: 'string', description: 'URL de la vidéo (YouTube, etc.)' },
        videoFile: { type: 'string', description: 'Chemin du fichier vidéo uploadé' },
        description: { type: 'string' },
        duration: { type: 'number', description: 'Durée en secondes' },
        order: { type: 'number' },
      },
      required: ['moduleId', 'title'],
    },
  },
};

export const getAcademyVideoTool = {
  type: 'function' as const,
  function: {
    name: 'get_academy_video',
    description: 'Récupère une vidéo par son ID.',
    parameters: {
      type: 'object',
      properties: { id: { type: 'number' } },
      required: ['id'],
    },
  },
};

export const updateAcademyVideoTool = {
  type: 'function' as const,
  function: {
    name: 'update_academy_video',
    description: 'Met à jour une vidéo existante.',
    parameters: {
      type: 'object',
      properties: {
        id: { type: 'number' },
        title: { type: 'string' },
        description: { type: 'string' },
        videoUrl: { type: 'string' },
        videoFile: { type: 'string' },
        duration: { type: 'number' },
        order: { type: 'number' },
      },
      required: ['id'],
    },
  },
};

export const deleteAcademyVideoTool = {
  type: 'function' as const,
  function: {
    name: 'delete_academy_video',
    description: 'Supprime une vidéo par ID. Irréversible.',
    parameters: {
      type: 'object',
      properties: { id: { type: 'number' } },
      required: ['id'],
    },
  },
};

export async function executeListCourses(academyService: AcademyService): Promise<string> {
  const courses = await academyService.findAllCourses(null);
  return JSON.stringify(courses, null, 2);
}

export async function executeGetCourse(academyService: AcademyService, args: { id: number }): Promise<string> {
  const course = await academyService.findOneCourse(args.id);
  return JSON.stringify(course, null, 2);
}

export async function executeCreateCourse(
  academyService: AcademyService,
  args: {
    title: string;
    description?: string;
    thumbnailImage?: string;
    isPublished?: boolean;
    accessLevel?: 'public' | 'member' | 'premium' | 'vip';
    order?: number;
    instructorFirstName?: string;
    instructorLastName?: string;
    instructorTitle?: string;
    instructorLink?: string;
  },
): Promise<string> {
  const course = await academyService.createCourse(
    args.title,
    args.description,
    args.thumbnailImage,
    args.isPublished ?? false,
    args.accessLevel ?? 'public',
    args.order ?? 0,
    undefined,
    args.instructorFirstName,
    args.instructorLastName,
    args.instructorTitle,
    args.instructorLink,
  );
  return JSON.stringify(course, null, 2);
}

export async function executeUpdateCourse(
  academyService: AcademyService,
  args: {
    id: number;
    title?: string;
    description?: string;
    thumbnailImage?: string;
    isPublished?: boolean;
    accessLevel?: 'public' | 'member' | 'premium' | 'vip';
    order?: number;
    instructorFirstName?: string;
    instructorLastName?: string;
    instructorTitle?: string;
    instructorLink?: string;
  },
): Promise<string> {
  const course = await academyService.updateCourse(
    args.id,
    args.title,
    args.description,
    args.thumbnailImage,
    args.isPublished,
    args.accessLevel,
    args.order,
    undefined,
    args.instructorFirstName,
    args.instructorLastName,
    args.instructorTitle,
    args.instructorLink,
  );
  return JSON.stringify(course, null, 2);
}

export async function executeDeleteCourse(academyService: AcademyService, args: { id: number }): Promise<string> {
  await academyService.deleteCourse(args.id);
  return JSON.stringify({ success: true, message: `Cours ${args.id} supprimé` });
}

export async function executeCreateModule(
  academyService: AcademyService,
  args: { courseId: number; title: string; description?: string; order?: number },
): Promise<string> {
  const mod = await academyService.createModule(
    args.courseId,
    args.title,
    args.description,
    args.order ?? 0,
  );
  return JSON.stringify(mod, null, 2);
}

export async function executeGetModule(academyService: AcademyService, args: { id: number }): Promise<string> {
  const mod = await academyService.findModule(args.id);
  return JSON.stringify(mod, null, 2);
}

export async function executeUpdateModule(
  academyService: AcademyService,
  args: { id: number; title?: string; description?: string; order?: number },
): Promise<string> {
  const mod = await academyService.updateModule(args.id, args.title, args.description, args.order);
  return JSON.stringify(mod, null, 2);
}

export async function executeDeleteModule(academyService: AcademyService, args: { id: number }): Promise<string> {
  await academyService.deleteModule(args.id);
  return JSON.stringify({ success: true, message: `Module ${args.id} supprimé` });
}

export async function executeCreateVideo(
  academyService: AcademyService,
  args: {
    moduleId: number;
    title: string;
    videoUrl?: string;
    videoFile?: string;
    description?: string;
    duration?: number;
    order?: number;
  },
): Promise<string> {
  const video = await academyService.createVideo(
    args.moduleId,
    args.title,
    args.videoFile ?? null,
    args.description,
    args.duration,
    args.order ?? 0,
    args.videoUrl ?? null,
  );
  return JSON.stringify(video, null, 2);
}

export async function executeGetVideo(academyService: AcademyService, args: { id: number }): Promise<string> {
  const video = await academyService.findVideo(args.id);
  return JSON.stringify(video, null, 2);
}

export async function executeUpdateVideo(
  academyService: AcademyService,
  args: {
    id: number;
    title?: string;
    description?: string;
    videoUrl?: string | null;
    videoFile?: string | null;
    duration?: number;
    order?: number;
  },
): Promise<string> {
  const video = await academyService.updateVideo(
    args.id,
    args.title,
    args.description,
    args.videoFile,
    args.duration,
    args.order,
    args.videoUrl,
  );
  return JSON.stringify(video, null, 2);
}

export async function executeDeleteVideo(academyService: AcademyService, args: { id: number }): Promise<string> {
  await academyService.deleteVideo(args.id);
  return JSON.stringify({ success: true, message: `Vidéo ${args.id} supprimée` });
}
