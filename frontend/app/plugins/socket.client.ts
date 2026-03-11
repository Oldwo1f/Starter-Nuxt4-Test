import { useAuthStore } from '~/stores/useAuthStore'
import { useMessagesStore } from '~/stores/useMessagesStore'

export default defineNuxtPlugin({
  name: 'socket',
  dependsOn: ['auth'],
  setup(nuxtApp) {
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

  // Exécuter après le montage de l'app pour s'assurer que le store auth est hydraté
  nuxtApp.hook('app:mounted', () => {
    if (authStore.isAuthenticated) {
      initSocket()
    }
  })
  }
})
