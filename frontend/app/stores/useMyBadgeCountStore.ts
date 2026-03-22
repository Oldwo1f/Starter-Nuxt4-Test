import { defineStore } from 'pinia'
import { useAuthStore } from '~/stores/useAuthStore'

export const useMyBadgeCountStore = defineStore('myBadgeCount', () => {
  const count = ref(0)

  function reset() {
    count.value = 0
  }

  function setCount(n: number) {
    count.value = Math.max(0, n)
  }

  async function refresh() {
    const authStore = useAuthStore()
    if (!authStore.accessToken) {
      reset()
      return
    }
    const config = useRuntimeConfig()
    const apiBase = config.public.apiBaseUrl || 'http://localhost:3001'
    try {
      const data = await $fetch<{ badges?: { badgeCode: string }[] }>(`${apiBase}/badges`, {
        headers: { Authorization: `Bearer ${authStore.accessToken}` },
      })
      setCount(Array.isArray(data.badges) ? data.badges.length : 0)
    } catch {
      reset()
    }
  }

  return { count, reset, setCount, refresh }
})
