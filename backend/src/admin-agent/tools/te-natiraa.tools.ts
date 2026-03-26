/**
 * Admin agent tools for Te Natira'a event registrations.
 * Permet de lister et afficher les inscriptions proprement à l'utilisateur.
 */
import { TeNatiraaService } from '../../te-natiraa/te-natiraa.service';
import { TeNatiraaRegistration } from '../../entities/te-natiraa-registration.entity';
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
