import { Injectable, ForbiddenException } from '@nestjs/common';
import OpenAI from 'openai';
import { UsersService } from '../users/users.service';
import { BlogService } from '../blog/blog.service';
import { GoodiesService } from '../goodies/goodies.service';
import { PollsService } from '../polls/polls.service';
import { TodosService } from '../todos/todos.service';
import { CultureService } from '../culture/culture.service';
import { PartnersService } from '../partners/partners.service';
import { AcademyService } from '../academy/academy.service';
import { BillingService } from '../billing/billing.service';
import { WalletService } from '../wallet/wallet.service';
import { ReferralService } from '../referral/referral.service';
import { MarketplaceService } from '../marketplace/marketplace.service';
import { UserRole } from '../entities/user.entity';
import {
  listUsersTool,
  getUserTool,
  updateUserRoleTool,
  updateUserTool,
  deleteUserTool,
  executeListUsers,
  executeGetUser,
  executeUpdateUserRole,
  executeUpdateUser,
  executeDeleteUser,
} from './tools/users.tools';
import {
  listBlogPostsTool,
  getBlogPostTool,
  createBlogPostTool,
  updateBlogPostTool,
  deleteBlogPostTool,
  executeListBlogPosts,
  executeGetBlogPost,
  executeCreateBlogPost,
  executeUpdateBlogPost,
  executeDeleteBlogPost,
} from './tools/blog.tools';
import {
  listGoodiesTool,
  getGoodieTool,
  createGoodieTool,
  updateGoodieTool,
  deleteGoodieTool,
  executeListGoodies,
  executeGetGoodie,
  executeCreateGoodie,
  executeUpdateGoodie,
  executeDeleteGoodie,
} from './tools/goodies.tools';
import {
  listPollsTool,
  getPollTool,
  createPollTool,
  updatePollTool,
  deletePollTool,
  getPollResponsesTool,
  deletePollResponseTool,
  executeListPolls,
  executeGetPoll,
  executeCreatePoll,
  executeUpdatePoll,
  executeDeletePoll,
  executeGetPollResponses,
  executeDeletePollResponse,
} from './tools/polls.tools';
import {
  listTodosTool,
  getTodoTool,
  createTodoTool,
  updateTodoTool,
  deleteTodoTool,
  executeListTodos,
  executeGetTodo,
  executeCreateTodo,
  executeUpdateTodo,
  executeDeleteTodo,
} from './tools/todos.tools';
import {
  listCulturesTool,
  getCultureTool,
  createCultureTool,
  updateCultureTool,
  deleteCultureTool,
  executeListCultures,
  executeGetCulture,
  executeCreateCulture,
  executeUpdateCulture,
  executeDeleteCulture,
} from './tools/culture.tools';
import {
  listPartnersTool,
  getPartnerTool,
  createPartnerTool,
  updatePartnerTool,
  deletePartnerTool,
  executeListPartners,
  executeGetPartner,
  executeCreatePartner,
  executeUpdatePartner,
  executeDeletePartner,
} from './tools/partners.tools';
import {
  listCoursesTool,
  getCourseTool,
  createCourseTool,
  updateCourseTool,
  deleteCourseTool,
  createAcademyModuleTool,
  getAcademyModuleTool,
  updateAcademyModuleTool,
  deleteAcademyModuleTool,
  createAcademyVideoTool,
  getAcademyVideoTool,
  updateAcademyVideoTool,
  deleteAcademyVideoTool,
  executeListCourses,
  executeGetCourse,
  executeCreateCourse,
  executeUpdateCourse,
  executeDeleteCourse,
  executeCreateModule,
  executeGetModule,
  executeUpdateModule,
  executeDeleteModule,
  executeCreateVideo,
  executeGetVideo,
  executeUpdateVideo,
  executeDeleteVideo,
} from './tools/academy.tools';
import {
  getPendingBankVerificationsTool,
  confirmBankVerificationTool,
  getPendingLegacyVerificationsTool,
  confirmLegacyVerificationTool,
  rejectLegacyVerificationTool,
  executeGetPendingBankVerifications,
  executeConfirmBankVerification,
  executeGetPendingLegacyVerifications,
  executeConfirmLegacyVerification,
  executeRejectLegacyVerification,
} from './tools/billing.tools';
import {
  adminCreditUserTool,
  executeAdminCreditUser,
} from './tools/wallet.tools';
import {
  getReferralStatsTool,
  getReferralCodeTool,
  executeGetReferralStats,
  executeGetReferralCode,
} from './tools/referral.tools';
import {
  listListingsTool,
  getListingTool,
  updateListingTool,
  deleteListingTool,
  executeListListings,
  executeGetListing,
  executeUpdateListing,
  executeDeleteListing,
} from './tools/marketplace.tools';

const SYSTEM_PROMPT = `Tu es un assistant d'administration pour le site Nuna Heritage. L'utilisateur t'accède via un chat et tu l'aides à gérer l'ensemble du site.

## Contexte d'affichage
- Le chat affiche du **Markdown** : réponds toujours en Markdown (titres, listes, tableaux, gras, code).
- Réponses **courtes et concises** : va droit au but, évite les phrases inutiles.
- **Peu d'éléments** (≤ 5) : utilise une liste à puces.
- **Beaucoup d'éléments** (> 5) : utilise un tableau Markdown (le chat applique bordures et padding automatiquement).
- **Images** : max 100px de hauteur. Pour les **avatars utilisateur** OBLIGATOIREMENT : \`<img src="URL" alt="avatar" />\` (alt="avatar" est requis pour le style rond 32px).

## Recherche utilisateurs (IMPORTANT)
Quand l'utilisateur demande à trouver, chercher ou lister quelqu'un par son nom (même sans dire "recherche") :
- Prénom mentionné (Marie, Jean, etc.) → list_users avec **firstName**
- Nom de famille mentionné (Dupont, Martin, etc.) → list_users avec **lastName**
- Nom complet (Marie Dupont) → list_users avec **firstName** et **lastName**, ou **search**
Exemples : "trouve Marie", "c'est qui Dupont ?", "liste les Jean" → utilise list_users avec les filtres nom/prénom.

## Outils disponibles

**Utilisateurs** : list_users (firstName, lastName, email, commune, search), get_user, update_user_role, update_user, delete_user
**Blog** : list_blog_posts, get_blog_post, create_blog_post, update_blog_post, delete_blog_post
**Goodies** : list_goodies, get_goodie, create_goodie, update_goodie, delete_goodie
**Sondages** : list_polls, get_poll, create_poll, update_poll, delete_poll, get_poll_responses, delete_poll_response
**Tâches internes** : list_todos, get_todo, create_todo, update_todo, delete_todo
**Culture (vidéos)** : list_cultures, get_culture, create_culture, update_culture, delete_culture
**Partenaires** : list_partners, get_partner, create_partner, update_partner, delete_partner
**Académie** : list_academy_courses, get_academy_course, create_academy_course, update_academy_course, delete_academy_course, create_academy_module, get_academy_module, update_academy_module, delete_academy_module, create_academy_video, get_academy_video, update_academy_video, delete_academy_video
**Billing** (admin/superadmin) : get_pending_bank_verifications, confirm_bank_verification, get_pending_legacy_verifications, confirm_legacy_verification, reject_legacy_verification
**Wallet** (admin/superadmin) : admin_credit_user
**Parrainage** : get_referral_stats, get_referral_code
**Marketplace** : list_listings, get_listing, update_listing, delete_listing`;

const TOOLS = [
  listUsersTool,
  getUserTool,
  updateUserRoleTool,
  updateUserTool,
  deleteUserTool,
  listBlogPostsTool,
  getBlogPostTool,
  createBlogPostTool,
  updateBlogPostTool,
  deleteBlogPostTool,
  listGoodiesTool,
  getGoodieTool,
  createGoodieTool,
  updateGoodieTool,
  deleteGoodieTool,
  listPollsTool,
  getPollTool,
  createPollTool,
  updatePollTool,
  deletePollTool,
  getPollResponsesTool,
  deletePollResponseTool,
  listTodosTool,
  getTodoTool,
  createTodoTool,
  updateTodoTool,
  deleteTodoTool,
  listCulturesTool,
  getCultureTool,
  createCultureTool,
  updateCultureTool,
  deleteCultureTool,
  listPartnersTool,
  getPartnerTool,
  createPartnerTool,
  updatePartnerTool,
  deletePartnerTool,
  listCoursesTool,
  getCourseTool,
  createCourseTool,
  updateCourseTool,
  deleteCourseTool,
  createAcademyModuleTool,
  getAcademyModuleTool,
  updateAcademyModuleTool,
  deleteAcademyModuleTool,
  createAcademyVideoTool,
  getAcademyVideoTool,
  updateAcademyVideoTool,
  deleteAcademyVideoTool,
  getPendingBankVerificationsTool,
  confirmBankVerificationTool,
  getPendingLegacyVerificationsTool,
  confirmLegacyVerificationTool,
  rejectLegacyVerificationTool,
  adminCreditUserTool,
  getReferralStatsTool,
  getReferralCodeTool,
  listListingsTool,
  getListingTool,
  updateListingTool,
  deleteListingTool,
];

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

@Injectable()
export class AdminAgentService {
  private openai: OpenAI | null = null;

  constructor(
    private readonly usersService: UsersService,
    private readonly blogService: BlogService,
    private readonly goodiesService: GoodiesService,
    private readonly pollsService: PollsService,
    private readonly todosService: TodosService,
    private readonly cultureService: CultureService,
    private readonly partnersService: PartnersService,
    private readonly academyService: AcademyService,
    private readonly billingService: BillingService,
    private readonly walletService: WalletService,
    private readonly referralService: ReferralService,
    private readonly marketplaceService: MarketplaceService,
  ) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (apiKey) {
      this.openai = new OpenAI({ apiKey });
    }
  }

  async chat(
    message: string,
    history: ChatMessage[],
    currentUser: { id: number; email: string; role: UserRole },
  ): Promise<string> {
    if (!this.openai) {
      throw new ForbiddenException(
        'OPENAI_API_KEY non configurée. Ajoutez-la dans .env pour utiliser l\'agent.',
      );
    }

    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...history.map((m) => ({ role: m.role, content: m.content })),
      { role: 'user', content: message },
    ];

    let responseContent = '';
    let keepGoing = true;
    let iterations = 0;
    const maxIterations = 10;

    while (keepGoing && iterations < maxIterations) {
      iterations++;
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages,
        tools: TOOLS,
        tool_choice: 'auto',
      });

      const choice = response.choices[0];
      if (!choice) {
        break;
      }

      const messagePart = choice.message;

      if (messagePart.content) {
        responseContent += messagePart.content;
      }

      if (!messagePart.tool_calls || messagePart.tool_calls.length === 0) {
        keepGoing = false;
        break;
      }

      messages.push(messagePart);

      for (const toolCall of messagePart.tool_calls) {
        const fn = 'function' in toolCall ? toolCall.function : null;
        if (!fn) continue;
        const toolName = fn.name;
        let args: Record<string, unknown>;
        try {
          args = JSON.parse(fn.arguments || '{}');
        } catch {
          args = {};
        }

        let result: string;
        try {
          result = await this.executeTool(toolName, args, currentUser);
        } catch (err) {
          result = JSON.stringify({
            error: err instanceof Error ? err.message : 'Erreur inconnue',
          });
        }

        messages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: result,
        });
      }
    }

    return responseContent || "Je n'ai pas pu générer de réponse.";
  }

  private async executeTool(
    name: string,
    args: Record<string, unknown>,
    currentUser: { id: number; role: UserRole },
  ): Promise<string> {
    switch (name) {
      case 'list_users':
        return executeListUsers(this.usersService, args as Parameters<typeof executeListUsers>[1]);
      case 'get_user':
        return executeGetUser(this.usersService, args as { id: number });
      case 'update_user_role':
        return executeUpdateUserRole(
          this.usersService,
          currentUser,
          args as { id: number; role: string },
        );
      case 'update_user':
        return executeUpdateUser(this.usersService, currentUser, args as Parameters<typeof executeUpdateUser>[2]);
      case 'delete_user':
        return executeDeleteUser(this.usersService, currentUser, args as { id: number });
      case 'list_blog_posts':
        return executeListBlogPosts(this.blogService, args as Parameters<typeof executeListBlogPosts>[1]);
      case 'get_blog_post':
        return executeGetBlogPost(this.blogService, args as { id: number });
      case 'create_blog_post':
        return executeCreateBlogPost(
          this.blogService,
          currentUser.id,
          args as { title: string; content: string; videoUrl?: string },
        );
      case 'update_blog_post':
        return executeUpdateBlogPost(this.blogService, args as Parameters<typeof executeUpdateBlogPost>[1]);
      case 'delete_blog_post':
        return executeDeleteBlogPost(this.blogService, args as { id: number });
      case 'list_goodies':
        return executeListGoodies(this.goodiesService);
      case 'get_goodie':
        return executeGetGoodie(this.goodiesService, args as { id: number });
      case 'create_goodie':
        return executeCreateGoodie(this.goodiesService, currentUser.id, args as Parameters<typeof executeCreateGoodie>[2]);
      case 'update_goodie':
        return executeUpdateGoodie(this.goodiesService, args as Parameters<typeof executeUpdateGoodie>[1]);
      case 'delete_goodie':
        return executeDeleteGoodie(this.goodiesService, args as { id: number });
      case 'list_polls':
        return executeListPolls(this.pollsService, args as Parameters<typeof executeListPolls>[1]);
      case 'get_poll':
        return executeGetPoll(this.pollsService, args as { id: number });
      case 'create_poll':
        return executeCreatePoll(this.pollsService, args as Parameters<typeof executeCreatePoll>[1]);
      case 'update_poll':
        return executeUpdatePoll(this.pollsService, args as Parameters<typeof executeUpdatePoll>[1]);
      case 'delete_poll':
        return executeDeletePoll(this.pollsService, args as { id: number });
      case 'get_poll_responses':
        return executeGetPollResponses(this.pollsService, args as { pollId: number });
      case 'delete_poll_response':
        return executeDeletePollResponse(this.pollsService, args as { responseId: number });
      case 'list_todos':
        return executeListTodos(this.todosService);
      case 'get_todo':
        return executeGetTodo(this.todosService, args as { id: number });
      case 'create_todo':
        return executeCreateTodo(this.todosService, args as Parameters<typeof executeCreateTodo>[1]);
      case 'update_todo':
        return executeUpdateTodo(this.todosService, args as Parameters<typeof executeUpdateTodo>[1]);
      case 'delete_todo':
        return executeDeleteTodo(this.todosService, args as { id: number });
      case 'list_cultures':
        return executeListCultures(this.cultureService, args as { type?: string });
      case 'get_culture':
        return executeGetCulture(this.cultureService, args as { id: number });
      case 'create_culture':
        return executeCreateCulture(this.cultureService, currentUser.id, args as Parameters<typeof executeCreateCulture>[2]);
      case 'update_culture':
        return executeUpdateCulture(this.cultureService, args as Parameters<typeof executeUpdateCulture>[1]);
      case 'delete_culture':
        return executeDeleteCulture(this.cultureService, args as { id: number });
      case 'list_partners':
        return executeListPartners(this.partnersService);
      case 'get_partner':
        return executeGetPartner(this.partnersService, args as { id: number });
      case 'create_partner':
        return executeCreatePartner(this.partnersService, args as Parameters<typeof executeCreatePartner>[1]);
      case 'update_partner':
        return executeUpdatePartner(this.partnersService, args as Parameters<typeof executeUpdatePartner>[1]);
      case 'delete_partner':
        return executeDeletePartner(this.partnersService, args as { id: number });
      case 'list_academy_courses':
        return executeListCourses(this.academyService);
      case 'get_academy_course':
        return executeGetCourse(this.academyService, args as { id: number });
      case 'create_academy_course':
        return executeCreateCourse(this.academyService, args as Parameters<typeof executeCreateCourse>[1]);
      case 'update_academy_course':
        return executeUpdateCourse(this.academyService, args as Parameters<typeof executeUpdateCourse>[1]);
      case 'delete_academy_course':
        return executeDeleteCourse(this.academyService, args as { id: number });
      case 'create_academy_module':
        return executeCreateModule(this.academyService, args as Parameters<typeof executeCreateModule>[1]);
      case 'get_academy_module':
        return executeGetModule(this.academyService, args as { id: number });
      case 'update_academy_module':
        return executeUpdateModule(this.academyService, args as Parameters<typeof executeUpdateModule>[1]);
      case 'delete_academy_module':
        return executeDeleteModule(this.academyService, args as { id: number });
      case 'create_academy_video':
        return executeCreateVideo(this.academyService, args as Parameters<typeof executeCreateVideo>[1]);
      case 'get_academy_video':
        return executeGetVideo(this.academyService, args as { id: number });
      case 'update_academy_video':
        return executeUpdateVideo(this.academyService, args as Parameters<typeof executeUpdateVideo>[1]);
      case 'delete_academy_video':
        return executeDeleteVideo(this.academyService, args as { id: number });
      case 'get_pending_bank_verifications':
        return executeGetPendingBankVerifications(this.billingService, currentUser);
      case 'confirm_bank_verification':
        return executeConfirmBankVerification(this.billingService, currentUser, args as { paymentId: number });
      case 'get_pending_legacy_verifications':
        return executeGetPendingLegacyVerifications(this.billingService, currentUser);
      case 'confirm_legacy_verification':
        return executeConfirmLegacyVerification(this.billingService, currentUser, args as Parameters<typeof executeConfirmLegacyVerification>[2]);
      case 'reject_legacy_verification':
        return executeRejectLegacyVerification(this.billingService, currentUser, args as { verificationId: number });
      case 'admin_credit_user':
        return executeAdminCreditUser(this.walletService, currentUser, args as { userId: number; amount: number; description: string });
      case 'get_referral_stats':
        return executeGetReferralStats(this.referralService, args as { userId: number });
      case 'get_referral_code':
        return executeGetReferralCode(this.referralService, args as { userId: number });
      case 'list_listings':
        return executeListListings(this.marketplaceService, args as Parameters<typeof executeListListings>[1]);
      case 'get_listing':
        return executeGetListing(this.marketplaceService, args as { id: number });
      case 'update_listing':
        return executeUpdateListing(this.marketplaceService, { id: currentUser.id, role: currentUser.role }, args as Parameters<typeof executeUpdateListing>[2]);
      case 'delete_listing':
        return executeDeleteListing(this.marketplaceService, { id: currentUser.id, role: currentUser.role }, args as { id: number });
      default:
        return JSON.stringify({ error: `Outil inconnu: ${name}` });
    }
  }
}
