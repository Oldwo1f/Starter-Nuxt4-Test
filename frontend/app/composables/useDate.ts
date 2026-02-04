import dayjs from 'dayjs'
import 'dayjs/locale/fr'
import relativeTime from 'dayjs/plugin/relativeTime'
import localizedFormat from 'dayjs/plugin/localizedFormat'

// Configure dayjs
dayjs.extend(relativeTime)
dayjs.extend(localizedFormat)
dayjs.locale('fr')

/**
 * Composable for date formatting and manipulation using dayjs
 */
export const useDate = () => {
  /**
   * Format a date string to a readable French format
   */
  const formatDate = (date: string | Date, format: string = 'D MMMM YYYY à HH:mm') => {
    return dayjs(date).format(format)
  }

  /**
   * Get relative time (e.g., "il y a 2 heures")
   */
  const fromNow = (date: string | Date) => {
    return dayjs(date).fromNow()
  }

  /**
   * Format date for display in cards (short format)
   */
  const formatShortDate = (date: string | Date) => {
    return dayjs(date).format('DD/MM/YYYY')
  }

  /**
   * Format date with time
   */
  const formatDateTime = (date: string | Date) => {
    return dayjs(date).format('DD/MM/YYYY HH:mm')
  }

  /**
   * Check if date is today
   */
  const isToday = (date: string | Date) => {
    return dayjs(date).isSame(dayjs(), 'day')
  }

  /**
   * Check if date is in the past
   */
  const isPast = (date: string | Date) => {
    return dayjs(date).isBefore(dayjs())
  }

  return {
    dayjs,
    formatDate,
    fromNow,
    formatShortDate,
    formatDateTime,
    isToday,
    isPast,
  }
}
