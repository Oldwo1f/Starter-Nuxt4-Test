import { useAuthStore } from '~/stores/useAuthStore'
import { useMessagesStore } from '~/stores/useMessagesStore'

export default defineNuxtPlugin(() => {
  const authStore = useAuthStore()

  const initSocket = () => {
    if (!authStore.isAuthenticated) return
    const messagesStore = useMessagesStore()
    messagesStore.initSocket()
    messagesStore.fetchUnreadCount()
  }

  const cleanupSocket = () => {
    const messagesStore = useMessagesStore()
    messagesStore.cleanup()
  }

  authStore.$subscribe((_, state) => {
    if (state.isAuthenticated) {
      initSocket()
    } else {
      cleanupSocket()
    }
  })

  if (authStore.isAuthenticated) {
    initSocket()
  }
})
