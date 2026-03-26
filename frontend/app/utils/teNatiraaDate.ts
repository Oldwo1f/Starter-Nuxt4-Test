import dayjs from 'dayjs'
import 'dayjs/locale/fr'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'

dayjs.extend(utc)
dayjs.extend(timezone)

export const TE_NATIRAA_TIMEZONE = 'Pacific/Tahiti'

export function formatTeNatiraaEventDateFr(ymdOrIso: string): string {
  const ymd = ymdOrIso.split('T')[0]
  return dayjs.tz(ymd, 'YYYY-MM-DD', TE_NATIRAA_TIMEZONE).locale('fr').format('dddd D MMMM YYYY')
}

export function teNatiraaEventStartMs(ymdOrIso: string, eventTime: string): number {
  const ymd = ymdOrIso.split('T')[0]
  const normalized = (eventTime || '8h00').replace('h', ':')
  const parts = normalized.split(':')
  const h = parseInt(parts[0] ?? '8', 10)
  const min = parseInt(parts[1] ?? '0', 10) || 0
  return dayjs
    .tz(`${ymd} ${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`, 'YYYY-MM-DD HH:mm', TE_NATIRAA_TIMEZONE)
    .valueOf()
}

/** true si la date civile (YYYY-MM-DD) de l'événement est strictement avant « aujourd'hui » à Tahiti. */
export function isTeNatiraaEventDatePast(ymdOrIso: string): boolean {
  const ymd = ymdOrIso.split('T')[0]
  const today = dayjs.tz(new Date(), TE_NATIRAA_TIMEZONE).format('YYYY-MM-DD')
  return ymd < today
}
