import { useAuthStore } from '~/stores/useAuthStore'

export const useProfileValidation = () => {
  const authStore = useAuthStore()

  // Vérifier si le profil est complet (nom, prénom, localisation, téléphone uniquement)
  const isProfileComplete = computed(() => {
    if (!authStore.user) return false

    const hasPhone = !!(authStore.user.phoneNumber && authStore.user.phoneNumber.trim())
    const hasFirstName = !!(authStore.user.firstName && authStore.user.firstName.trim())
    const hasLastName = !!(authStore.user.lastName && authStore.user.lastName.trim())
    const hasCommune = !!(authStore.user.commune && authStore.user.commune.trim())

    return hasPhone && hasFirstName && hasLastName && hasCommune
  })

  return {
    isProfileComplete,
  }
}
