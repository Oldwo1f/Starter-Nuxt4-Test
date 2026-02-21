import { useAuthStore } from '~/stores/useAuthStore'

export default defineNuxtRouteMiddleware((to) => {
  // Ne pas vérifier l'authentification côté serveur (SSR)
  // Le plugin client initialisera le store depuis localStorage
  if (!process.client) {
    return
  }
  
  const authStore = useAuthStore()
  
  // Initialiser le store depuis localStorage si ce n'est pas déjà fait
  // (sécurité au cas où le plugin ne s'est pas encore exécuté)
  authStore.initialize()
  
  // Vérifier l'authentification uniquement côté client
  if (!authStore.isAuthenticated) {
    return navigateTo('/login')
  }
})
