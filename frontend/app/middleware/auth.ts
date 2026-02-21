import { useAuthStore } from '~/stores/useAuthStore'

export default defineNuxtRouteMiddleware((to) => {
  // Ne pas vérifier l'authentification côté serveur (SSR)
  // Le plugin client initialisera le store depuis localStorage
  if (!process.client) {
    return
  }
  
  const authStore = useAuthStore()
  
  // Vérifier l'authentification uniquement côté client
  // Le plugin auth.client.ts aura déjà initialisé le store depuis localStorage
  if (!authStore.isAuthenticated) {
    return navigateTo('/login')
  }
})
