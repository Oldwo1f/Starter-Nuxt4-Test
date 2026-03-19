import { useAuthStore } from '~/stores/useAuthStore'

/** Champs requis pour considérer le profil complet (aligné avec useProfileValidation) */
const PROFILE_REQUIRED_FIELDS = ['phoneNumber', 'firstName', 'lastName', 'commune'] as const

function isCachedProfilePotentiallyIncomplete(user: Record<string, unknown> | null): boolean {
  if (!user) return false
  return PROFILE_REQUIRED_FIELDS.some(
    (field) => !user[field] || (typeof user[field] === 'string' && !(user[field] as string).trim())
  )
}

export default defineNuxtPlugin({
  name: 'auth',
  async setup() {
    const authStore = useAuthStore()
    authStore.initialize()

    // Si l'utilisateur est connecté mais les données en cache semblent incomplètes
    // (ex: ancienne réponse refresh sans commune), récupérer le profil frais
    if (authStore.isAuthenticated && isCachedProfilePotentiallyIncomplete(authStore.user as Record<string, unknown>)) {
      authStore.fetchProfile().catch(() => {})
    }
  },
})
