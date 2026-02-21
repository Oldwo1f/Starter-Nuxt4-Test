export default defineNuxtPlugin({
  name: 'auth-init',
  enforce: 'pre', // S'exécuter avant les middlewares pour initialiser le store
  setup() {
    // Ce plugin s'exécute uniquement côté client
    const authStore = useAuthStore()
    
    // Initialiser le store depuis localStorage
    authStore.initialize()
  }
})
