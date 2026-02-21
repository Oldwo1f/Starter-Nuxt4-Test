import { useAuthStore } from '~/stores/useAuthStore'

export default defineNuxtPlugin(() => {
  // Ce plugin s'exécute uniquement côté client
  // Il s'exécute après l'initialisation de Pinia mais avant les middlewares
  const authStore = useAuthStore()
  
  // Initialiser le store depuis localStorage
  authStore.initialize()
})
