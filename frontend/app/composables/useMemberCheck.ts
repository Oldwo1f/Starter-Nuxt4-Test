import { useAuthStore } from '~/stores/useAuthStore'

/**
 * Composable pour vérifier si l'utilisateur peut créer des annonces.
 * La création d'annonces est réservée aux membres (member, premium, vip) et au staff.
 * Les inscrits (role: user) n'ont pas le droit de poster d'annonces.
 */
export const useMemberCheck = () => {
  const authStore = useAuthStore()

  const canCreateListing = computed(() => {
    const role = authStore.user?.role?.toLowerCase()
    if (!role) return false
    return ['member', 'premium', 'vip', 'admin', 'superadmin', 'moderator'].includes(role)
  })

  /** True si l'utilisateur est chargé et authentifié mais n'est pas membre (inscrit) */
  const isNonMemberAuthenticated = computed(() => {
    if (!authStore.user || !authStore.isAuthenticated) return false
    return !canCreateListing.value
  })

  return {
    canCreateListing,
    isNonMemberAuthenticated,
  }
}
