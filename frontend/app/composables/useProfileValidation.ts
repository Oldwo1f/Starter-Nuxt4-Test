import { useAuthStore } from '~/stores/useAuthStore'

export const useProfileValidation = () => {
  const authStore = useAuthStore()

  // Vérifier si le profil est complet
  const isProfileComplete = computed(() => {
    if (!authStore.user) return false
    
    // Vérifier les informations personnelles
    const hasPhone = !!(authStore.user.phoneNumber && authStore.user.phoneNumber.trim())
    const hasFirstName = !!(authStore.user.firstName && authStore.user.firstName.trim())
    const hasLastName = !!(authStore.user.lastName && authStore.user.lastName.trim())
    const hasCommune = !!(authStore.user.commune && authStore.user.commune.trim())
    
    if (!hasPhone || !hasFirstName || !hasLastName || !hasCommune) {
      return false
    }
    
    // Vérifier les préférences de contact (au moins 2 moyens)
    const hasMessenger = !!(authStore.user.contactPreferences?.accounts?.messenger && authStore.user.contactPreferences.accounts.messenger.trim())
    const hasTelegram = !!(authStore.user.contactPreferences?.accounts?.telegram && authStore.user.contactPreferences.accounts.telegram.trim())
    const hasWhatsapp = !!(authStore.user.contactPreferences?.accounts?.whatsapp && authStore.user.contactPreferences.accounts.whatsapp.trim())
    
    let contactCount = 0
    if (hasPhone) contactCount++
    if (hasMessenger) contactCount++
    if (hasTelegram) contactCount++
    if (hasWhatsapp) contactCount++
    
    return contactCount >= 2
  })

  return {
    isProfileComplete,
  }
}
