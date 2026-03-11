import { useAuthStore } from '~/stores/useAuthStore'

export default defineNuxtPlugin({
  name: 'auth',
  setup() {
    const authStore = useAuthStore()
    authStore.initialize()
  },
})
