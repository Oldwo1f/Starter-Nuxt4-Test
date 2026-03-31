/**
 * Admin agent tools for Te Natira'a event registrations.
 * Permet de lister et afficher les inscriptions proprement à l'utilisateur.
 */
import { TeNatiraaService } from '../../te-natiraa/te-natiraa.service';
import { TeNatiraaRegistration } from '../../entities/te-natiraa-registration.entity';
import {
  CreateTeNatiraaPresenceCodeDto,
  UpdateTeNatiraaPresenceCodeDto,
} from '../../te-natiraa/dto/create-presence-code.dto';
import { UpdateTeNatiraaEventDto } from '../../te-natiraa/dto/update-event.dto';
import {
  formatTeNatiraaEventDateFrLong,
  formatTeNatiraaEventDateFrShort,
} from '../../common/te-natiraa-dates';

export const listTeNatiraaRegistrationsTool = {
  type: 'function' as const,
  function: {
    name: 'list_te_natiraa_registrations',
    description:
      "Liste les inscriptions au Te Natira'a avec pagination. Optionnel : filtrer par eventId.",
    parameters: {
      type: 'object',
      properties: {
        page: { type: 'number', description: 'Numéro de page (défaut 1)' },
        limit: { type: 'number', description: 'Nombre par page (défaut 50, max 100)' },
        eventId: { type: 'number', description: "Filtrer par ID d'événement" },
      },
    },
  },
};

export const getTeNatiraaRegistrationsGroupedTool = {
  type: 'function' as const,
  function: {
    name: 'get_te_natiraa_registrations_grouped',
    description:
      "Récupère les inscriptions Te Natira'a regroupées par événement. Idéal pour afficher un résumé propre à l'utilisateur (événement, date, lieu, liste des inscrits avec adultes/enfants, statut).",
    parameters: {
      type: 'object',
      properties: {},
    },
  },
};

export const listTeNatiraaEventsTool = {
  type: 'function' as const,
  function: {
    name: 'list_te_natiraa_events',
    description: "Liste tous les événements Te Natira'a (passés et à venir).",
    parameters: {
      type: 'object',
      properties: {},
    },
  },
};

export const getTeNatiraaEventTool = {
  type: 'function' as const,
  function: {
    name: 'get_te_natiraa_event',
    description: "Détail d'un événement Te Natira'a par ID.",
    parameters: {
      type: 'object',
      properties: { id: { type: 'number' } },
      required: ['id'],
    },
  },
};

export const createTeNatiraaEventTool = {
  type: 'function' as const,
  function: {
    name: 'create_te_natiraa_event',
    description:
      "Crée un événement Te Natiraa. eventDate au format YYYY-MM-DD. eventTime ex. 8h00. stripePriceMemberId / stripePricePublicId = price Stripe optionnels.",
    parameters: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        eventDate: { type: 'string', description: 'YYYY-MM-DD' },
        eventTime: { type: 'string' },
        location: { type: 'string' },
        description: { type: 'string' },
        stripePriceMemberId: { type: 'string' },
        stripePricePublicId: { type: 'string' },
        isActive: { type: 'boolean' },
      },
      required: ['name', 'eventDate', 'location'],
    },
  },
};

export const updateTeNatiraaEventTool = {
  type: 'function' as const,
  function: {
    name: 'update_te_natiraa_event',
    description: "Met à jour un événement Te Natira'a (champs partiels).",
    parameters: {
      type: 'object',
      properties: {
        id: { type: 'number' },
        name: { type: 'string' },
        eventDate: { type: 'string' },
        eventTime: { type: 'string' },
        location: { type: 'string' },
        description: { type: 'string' },
        stripePriceMemberId: { type: 'string' },
        stripePricePublicId: { type: 'string' },
        isActive: { type: 'boolean' },
      },
      required: ['id'],
    },
  },
};

export const deleteTeNatiraaEventTool = {
  type: 'function' as const,
  function: {
    name: 'delete_te_natiraa_event',
    description: "Supprime un événement Te Natira'a.",
    parameters: {
      type: 'object',
      properties: { id: { type: 'number' } },
      required: ['id'],
    },
  },
};

export const listTeNatiraaPresenceCodesTool = {
  type: 'function' as const,
  function: {
    name: 'list_te_natiraa_presence_codes',
    description: "Liste les codes de présence (QR / token, libellé, événement lié).",
    parameters: { type: 'object', properties: {} },
  },
};

export const createTeNatiraaPresenceCodeTool = {
  type: 'function' as const,
  function: {
    name: 'create_te_natiraa_presence_code',
    description:
      "Crée un code de présence (token UUID généré côté serveur). eventId optionnel pour lier à un événement.",
    parameters: {
      type: 'object',
      properties: {
        label: { type: 'string' },
        eventId: { type: 'number' },
      },
    },
  },
};

export const updateTeNatiraaPresenceCodeTool = {
  type: 'function' as const,
  function: {
    name: 'update_te_natiraa_presence_code',
    description: 'Met à jour libellé ou isActive d’un code de présence.',
    parameters: {
      type: 'object',
      properties: {
        id: { type: 'number' },
        label: { type: 'string' },
        isActive: { type: 'boolean' },
      },
      required: ['id'],
    },
  },
};

function formatRegistrationForDisplay(r: TeNatiraaRegistration) {
  const statusLabel =
    r.status === 'pending' ? 'En attente' : r.status === 'paid' ? 'Payé' : r.status === 'validated' ? 'Validé' : r.status;
  const createdAtStr = r.createdAt instanceof Date ? r.createdAt.toISOString() : String(r.createdAt);
  const eventStr = r.event
    ? `${r.event.name} - ${formatTeNatiraaEventDateFrShort(r.event.eventDate)} à ${r.event.eventTime} - ${r.event.location}`
    : undefined;
  return {
    id: r.id,
    nom: `${r.firstName} ${r.lastName}`,
    email: r.email,
    adultes: r.adultCount,
    enfants: r.childCount,
    statut: statusLabel,
    dateInscription: createdAtStr,
    evenement: eventStr,
  };
}

export async function executeListTeNatiraaRegistrations(
  teNatiraaService: TeNatiraaService,
  args: { page?: number; limit?: number; eventId?: number },
): Promise<string> {
  const page = Math.max(1, args.page ?? 1);
  const limit = Math.min(100, Math.max(1, args.limit ?? 50));
  const result = await teNatiraaService.getRegistrations(page, limit, args.eventId);

  const summary = {
    total: result.total,
    page: result.page,
    totalPages: result.totalPages,
    items: result.items.map(formatRegistrationForDisplay),
  };

  return JSON.stringify(summary, null, 2);
}

export async function executeGetTeNatiraaRegistrationsGrouped(
  teNatiraaService: TeNatiraaService,
): Promise<string> {
  const grouped = await teNatiraaService.getRegistrationsGroupedByEvent();

  const formatted = grouped.map((g) => {
    const eventDate = formatTeNatiraaEventDateFrLong(g.event.eventDate);
    const totalAdults = g.registrations.reduce((s, r) => s + (r.adultCount || 0), 0);
    const totalChildren = g.registrations.reduce((s, r) => s + (r.childCount || 0), 0);
    return {
      evenement: g.event.name,
      date: eventDate,
      heure: g.event.eventTime,
      lieu: g.event.location,
      nbInscriptions: g.registrations.length,
      totalAdultes: totalAdults,
      totalEnfants: totalChildren,
      inscriptions: g.registrations.map(formatRegistrationForDisplay),
    };
  });

  return JSON.stringify(
    {
      totalInscriptions: formatted.reduce((s, g) => s + g.nbInscriptions, 0),
      totalAdultes: formatted.reduce((s, g) => s + g.totalAdultes, 0),
      totalEnfants: formatted.reduce((s, g) => s + g.totalEnfants, 0),
      parEvenement: formatted,
    },
    null,
    2,
  );
}

export async function executeListTeNatiraaEvents(
  teNatiraaService: TeNatiraaService,
): Promise<string> {
  const events = await teNatiraaService.getEvents();
  const formatted = events.map((e) => ({
    id: e.id,
    nom: e.name,
    date: formatTeNatiraaEventDateFrShort(e.eventDate),
    heure: e.eventTime,
    lieu: e.location,
    actif: e.isActive,
  }));
  return JSON.stringify(formatted, null, 2);
}

export async function executeGetTeNatiraaEvent(
  teNatiraaService: TeNatiraaService,
  args: { id: number },
): Promise<string> {
  const e = await teNatiraaService.getEventById(args.id);
  return JSON.stringify(
    {
      id: e.id,
      nom: e.name,
      date: formatTeNatiraaEventDateFrShort(e.eventDate),
      heure: e.eventTime,
      lieu: e.location,
      description: e.description,
      stripePriceMemberId: e.stripePriceMemberId,
      stripePricePublicId: e.stripePricePublicId,
      actif: e.isActive,
    },
    null,
    2,
  );
}

export async function executeCreateTeNatiraaEvent(
  teNatiraaService: TeNatiraaService,
  args: {
    name: string;
    eventDate: string;
    location: string;
    eventTime?: string;
    description?: string;
    stripePriceMemberId?: string | null;
    stripePricePublicId?: string | null;
    isActive?: boolean;
  },
): Promise<string> {
  const created = await teNatiraaService.createEvent({
    name: args.name,
    eventDate: args.eventDate,
    eventTime: args.eventTime,
    location: args.location,
    description: args.description,
    stripePriceMemberId: args.stripePriceMemberId ?? undefined,
    stripePricePublicId: args.stripePricePublicId ?? undefined,
    isActive: args.isActive,
  });
  return JSON.stringify({ id: created.id, message: 'Événement créé' }, null, 2);
}

export async function executeUpdateTeNatiraaEvent(
  teNatiraaService: TeNatiraaService,
  args: {
    id: number;
    name?: string;
    eventDate?: string;
    eventTime?: string;
    location?: string;
    description?: string;
    stripePriceMemberId?: string | null;
    stripePricePublicId?: string | null;
    isActive?: boolean;
  },
): Promise<string> {
  const { id, ...rest } = args;
  const dto = Object.fromEntries(
    Object.entries(rest).filter(([, v]) => v !== undefined),
  ) as UpdateTeNatiraaEventDto;
  const updated = await teNatiraaService.updateEvent(id, dto);
  return JSON.stringify({ id: updated.id, message: 'Événement mis à jour' }, null, 2);
}

export async function executeDeleteTeNatiraaEvent(
  teNatiraaService: TeNatiraaService,
  args: { id: number },
): Promise<string> {
  await teNatiraaService.deleteEvent(args.id);
  return JSON.stringify({ ok: true, message: 'Événement supprimé' });
}

export async function executeListTeNatiraaPresenceCodes(
  teNatiraaService: TeNatiraaService,
): Promise<string> {
  const rows = await teNatiraaService.listPresenceCodes();
  const formatted = rows.map((c) => ({
    id: c.id,
    token: c.token,
    label: c.label,
    eventId: c.eventId,
    eventName: c.event?.name ?? null,
    isActive: c.isActive,
    createdAt: c.createdAt,
  }));
  return JSON.stringify(formatted, null, 2);
}

export async function executeCreateTeNatiraaPresenceCode(
  teNatiraaService: TeNatiraaService,
  args: { label?: string; eventId?: number },
): Promise<string> {
  const dto: CreateTeNatiraaPresenceCodeDto = {};
  if (args.label !== undefined) dto.label = args.label;
  if (args.eventId !== undefined) dto.eventId = args.eventId;
  const row = await teNatiraaService.createPresenceCode(dto);
  return JSON.stringify(
    { id: row.id, token: row.token, label: row.label, eventId: row.eventId },
    null,
    2,
  );
}

export async function executeUpdateTeNatiraaPresenceCode(
  teNatiraaService: TeNatiraaService,
  args: { id: number; label?: string; isActive?: boolean },
): Promise<string> {
  const dto: UpdateTeNatiraaPresenceCodeDto = {};
  if (args.label !== undefined) dto.label = args.label;
  if (args.isActive !== undefined) dto.isActive = args.isActive;
  const row = await teNatiraaService.updatePresenceCode(args.id, dto);
  return JSON.stringify(
    { id: row.id, token: row.token, label: row.label, isActive: row.isActive },
    null,
    2,
  );
}
