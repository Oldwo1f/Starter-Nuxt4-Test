import { DateTime } from 'luxon';

/** Événements Te Natira'a : date civile et filtrage « à venir » toujours en heure de Tahiti. */
export const TE_NATIRAA_TIMEZONE = 'Pacific/Tahiti';

/** `YYYY-MM-DD` (DTO admin) → Date minuit UTC de ce jour civil (usage TypeORM + transformer). */
export function teNatiraaYmdToUtcDate(ymd: string): Date {
  const part = ymd.trim().split('T')[0];
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(part);
  if (!m) {
    throw new Error(`Date Te Natira'a invalide: ${ymd}`);
  }
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  return new Date(Date.UTC(y, mo - 1, d));
}

export function todayYmdInTeNatiraa(now: Date = new Date()): string {
  return DateTime.fromJSDate(now).setZone(TE_NATIRAA_TIMEZONE).toISODate()!;
}

export function eventDateToYmd(eventDate: Date | string): string {
  if (typeof eventDate === 'string') {
    return eventDate.split('T')[0];
  }
  const y = eventDate.getUTCFullYear();
  const m = String(eventDate.getUTCMonth() + 1).padStart(2, '0');
  const d = String(eventDate.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Libellé long FR (jour de la semaine + date) pour la date civile à Tahiti. */
export function formatTeNatiraaEventDateFrLong(eventDate: Date | string): string {
  const ymd = eventDateToYmd(eventDate);
  return DateTime.fromISO(ymd, { zone: TE_NATIRAA_TIMEZONE }).setLocale('fr').toFormat('EEEE d MMMM yyyy');
}

/** Libellé court FR pour l'agent admin / listes. */
export function formatTeNatiraaEventDateFrShort(eventDate: Date | string): string {
  const ymd = eventDateToYmd(eventDate);
  return DateTime.fromISO(ymd, { zone: TE_NATIRAA_TIMEZONE }).setLocale('fr').toLocaleString(DateTime.DATE_SHORT);
}
