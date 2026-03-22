import { useAuthStore } from '~/stores/useAuthStore'
import { useMyBadgeCountStore } from '~/stores/useMyBadgeCountStore'

export default defineNuxtPlugin(() => {
  const authStore = useAuthStore()
  const badgeStore = useMyBadgeCountStore()

  watch(
    () => authStore.isAuthenticated,
    (ok) => {
      if (ok) {
        void badgeStore.refresh()
      } else {
        badgeStore.reset()
      }
    },
    { immediate: true },
  )
})
