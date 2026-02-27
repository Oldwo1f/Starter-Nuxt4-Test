import { defineStore } from 'pinia'
import { useAuthStore } from './useAuthStore'

export interface Referral {
  id: number
  referred: {
    id: number
    email: string
    firstName: string | null
    lastName: string | null
    avatarImage: string | null
    role: string
  }
  status: 'inscrit' | 'membre' | 'validee'
  createdAt: string
  updatedAt: string
}

export interface ReferralStats {
  total: number
  inscrits: number
  membres: number
  validees: number
  rewardsEarned: number
}

export const useReferralStore = defineStore('referral', () => {
  const config = useRuntimeConfig()
  const API_BASE_URL = config.public.apiBaseUrl || 'http://localhost:3001'
  const authStore = useAuthStore()

  // State
  const referralCode = ref<string | null>(null)
  const referrals = ref<Referral[]>([])
  const stats = ref<ReferralStats | null>(null)
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  // Actions
  const fetchReferralCode = async () => {
    if (!authStore.accessToken) {
      return { success: false, error: 'Non authentifié' }
    }

    isLoading.value = true
    error.value = null
    try {
      const response = await $fetch<{ code: string }>(
        `${API_BASE_URL}/referral/code`,
        {
          headers: {
            Authorization: `Bearer ${authStore.accessToken}`,
          },
        }
      )
      referralCode.value = response.code
      return { success: true, data: response }
    } catch (err: any) {
      error.value = err.data?.message || err.message || 'Erreur lors de la récupération du code'
      return {
        success: false,
        error: error.value,
      }
    } finally {
      isLoading.value = false
    }
  }

  const fetchReferrals = async () => {
    if (!authStore.accessToken) {
      return { success: false, error: 'Non authentifié' }
    }

    isLoading.value = true
    error.value = null
    try {
      const response = await $fetch<{ referrals: Referral[] }>(
        `${API_BASE_URL}/referral/referrals`,
        {
          headers: {
            Authorization: `Bearer ${authStore.accessToken}`,
          },
        }
      )
      referrals.value = response.referrals
      return { success: true, data: response }
    } catch (err: any) {
      error.value = err.data?.message || err.message || 'Erreur lors de la récupération des filleuls'
      return {
        success: false,
        error: error.value,
      }
    } finally {
      isLoading.value = false
    }
  }

  const fetchStats = async () => {
    if (!authStore.accessToken) {
      return { success: false, error: 'Non authentifié' }
    }

    isLoading.value = true
    error.value = null
    try {
      const response = await $fetch<ReferralStats>(
        `${API_BASE_URL}/referral/stats`,
        {
          headers: {
            Authorization: `Bearer ${authStore.accessToken}`,
          },
        }
      )
      stats.value = response
      return { success: true, data: response }
    } catch (err: any) {
      error.value = err.data?.message || err.message || 'Erreur lors de la récupération des statistiques'
      return {
        success: false,
        error: error.value,
      }
    } finally {
      isLoading.value = false
    }
  }

  const fetchAll = async () => {
    await Promise.all([
      fetchReferralCode(),
      fetchReferrals(),
      fetchStats(),
    ])
  }

  const getReferralLink = () => {
    if (!referralCode.value) return ''
    const config = useRuntimeConfig()
    const frontendUrl = config.public.frontendUrl || 'http://localhost:3000'
    return `${frontendUrl}/register?ref=${referralCode.value}`
  }

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      return { success: true }
    } catch (err) {
      return { success: false, error: 'Impossible de copier dans le presse-papiers' }
    }
  }

  return {
    // State
    referralCode,
    referrals,
    stats,
    isLoading,
    error,
    // Actions
    fetchReferralCode,
    fetchReferrals,
    fetchStats,
    fetchAll,
    getReferralLink,
    copyToClipboard,
  }
})
