import { useIntervalFn } from '@vueuse/core'

/** Fenêtre d’affichage du chat bingo / kikiri */
export const GAME_CHAT_DISPLAY_WINDOW_MS = 30 * 60 * 1000

export interface GameChatMessageLike {
  id: number
  createdAt: string
}

/**
 * Messages à afficher : uniquement ceux des dernières 30 minutes (max 50).
 * Réévalue périodiquement pour retirer les messages trop anciens sans nouvel événement socket.
 */
export function useGameChatDisplayedMessages<T extends GameChatMessageLike>(
  messages: () => readonly T[],
) {
  const timeTick = ref(0)

  if (import.meta.client) {
    useIntervalFn(() => {
      timeTick.value = Date.now()
    }, 30_000)
  }

  const displayedMessages = computed(() => {
    timeTick.value
    const cutoff = Date.now() - GAME_CHAT_DISPLAY_WINDOW_MS
    const list = messages()
    const recent = list.filter((m) => {
      const t = new Date(m.createdAt).getTime()
      return Number.isFinite(t) && t >= cutoff
    })
    return recent.slice(-50)
  })

  return { displayedMessages }
}
