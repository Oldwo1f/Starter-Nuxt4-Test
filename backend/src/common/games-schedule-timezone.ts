import { DateTime } from 'luxon';

/**
 * Fuseau horaire pour les plages « croisière » (Bingo, Kikiri).
 * Même variable que les stats jeux (GAMES_TIMEZONE) ; défaut Tahiti si non défini.
 */
export function getGamesScheduleTimezone(): string {
  return process.env.GAMES_TIMEZONE || 'Pacific/Tahiti';
}

export function nowInGamesScheduleZone(): DateTime {
  return DateTime.now().setZone(getGamesScheduleTimezone());
}

/** Même logique qu’avant : minutes depuis minuit dans le fuseau jeux. */
export function isCruiseWindowOpen(
  openHour: number,
  openMinute: number,
  closeHour: number,
  closeMinute: number,
  now: DateTime = nowInGamesScheduleZone(),
): boolean {
  const openM = openHour * 60 + openMinute;
  const closeM = closeHour * 60 + closeMinute;
  const cur = now.hour * 60 + now.minute;
  if (openM <= closeM) {
    return cur >= openM && cur < closeM;
  }
  return cur >= openM || cur < closeM;
}

/**
 * Prochain instant d’ouverture (UTC stocké en Date JS) quand la table est fermée en mode croisière.
 */
export function getNextCruiseOpenUtc(
  openHour: number,
  openMinute: number,
  closeHour: number,
  closeMinute: number,
  now: DateTime = nowInGamesScheduleZone(),
): Date | null {
  if (isCruiseWindowOpen(openHour, openMinute, closeHour, closeMinute, now)) {
    return null;
  }
  const openM = openHour * 60 + openMinute;
  const closeM = closeHour * 60 + closeMinute;
  const todayOpen = now.set({ hour: openHour, minute: openMinute, second: 0, millisecond: 0 });
  const todayClose = now.set({ hour: closeHour, minute: closeMinute, second: 0, millisecond: 0 });

  if (openM <= closeM) {
    if (now < todayOpen) return todayOpen.toJSDate();
    if (now >= todayClose) return todayOpen.plus({ days: 1 }).toJSDate();
    return null;
  }

  if (now >= todayClose && now < todayOpen) {
    return todayOpen.toJSDate();
  }
  return null;
}

/**
 * true si l’instant est au même jour calendaire (fuseau jeux) à l’heure de fermeture ou après.
 */
export function isAtOrAfterClosingWallTime(
  instant: Date,
  closeHour: number,
  closeMinute: number,
): boolean {
  const tz = getGamesScheduleTimezone();
  const z = DateTime.fromJSDate(instant).setZone(tz);
  const closeSameDay = z.set({ hour: closeHour, minute: closeMinute, second: 0, millisecond: 0 });
  return instant.getTime() >= closeSameDay.toMillis();
}
