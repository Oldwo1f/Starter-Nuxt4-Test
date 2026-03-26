import {
  formatTeNatiraaEventDateFr,
  teNatiraaEventStartMs,
} from '~/utils/teNatiraaDate'

/**
 * Dates d'événements Te Natira'a : jour civil et heure d'affichage toujours interprétés en Pacific/Tahiti.
 */
export function useTeNatiraaEventDate() {
  return {
    formatEventDate: formatTeNatiraaEventDateFr,
    eventStartTimestampMs: teNatiraaEventStartMs,
  }
}
