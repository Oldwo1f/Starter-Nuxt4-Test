import { defineStore } from 'pinia'
import { useAuthStore } from './useAuthStore'

export type StripePack = 'teOhi' | 'umete'

export interface StripeCheckoutSession {
  sessionId: string
  url: string
  paymentId: number
}

export interface StripePayment {
  id: number
  pack: StripePack
  amountXpf: number
  status: 'pending' | 'paid' | 'cancelled' | 'failed'
  stripeSessionId: string | null
  paidAt: string | null
  createdAt: string
}

export interface StripeMeResponse {
  payment: StripePayment | null
  user: {
    role: string
    paidAccessExpiresAt: string | null
  } | null
}

export const useStripeStore = defineStore('stripe', () => {
  const config = useRuntimeConfig()
  const API_BASE_URL = config.public.apiBaseUrl || 'http://localhost:3001'
  const authStore = useAuthStore()

  const payment = ref<StripePayment | null>(null)
  const userAccess = ref<StripeMeResponse['user']>(null)
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  const createCheckoutSession = async (pack: StripePack) => {
    if (!authStore.accessToken) {
      return { success: false, error: 'Non authentifié' }
    }

    isLoading.value = true
    error.value = null
    try {
      const response = await $fetch<StripeCheckoutSession>(
        `${API_BASE_URL}/stripe/create-checkout-session`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${authStore.accessToken}`,
            'Content-Type': 'application/json',
          },
          body: { pack },
        }
      )
      
      // Redirect to Stripe Checkout
      if (response.url) {
        window.location.href = response.url
      }
      
      return { success: true, data: response }
    } catch (err: any) {
      error.value =
        err.data?.message ||
        err.message ||
        "Erreur lors de la création de la session de paiement"
      return { success: false, error: error.value }
    } finally {
      isLoading.value = false
    }
  }

  const fetchMyStripePayment = async () => {
    if (!authStore.accessToken) {
      return { success: false, error: 'Non authentifié' }
    }

    isLoading.value = true
    error.value = null
    try {
      const response = await $fetch<StripeMeResponse>(
        `${API_BASE_URL}/stripe/me`,
        {
          headers: {
            Authorization: `Bearer ${authStore.accessToken}`,
          },
        }
      )
      payment.value = response.payment
      userAccess.value = response.user
      return { success: true, data: response }
    } catch (err: any) {
      error.value =
        err.data?.message ||
        err.message ||
        "Erreur lors de la récupération de l'état du paiement"
      return { success: false, error: error.value }
    } finally {
      isLoading.value = false
    }
  }

  const processPendingPayment = async (sessionId: string) => {
    if (!authStore.accessToken) {
      return { success: false, error: 'Non authentifié' }
    }

    isLoading.value = true
    error.value = null
    try {
      await $fetch(
        `${API_BASE_URL}/stripe/process-pending/${sessionId}`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${authStore.accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      )
      
      // Refresh payment status and user profile
      await fetchMyStripePayment()
      await authStore.fetchProfile()
      
      return { success: true }
    } catch (err: any) {
      error.value =
        err.data?.message ||
        err.message ||
        "Erreur lors du traitement du paiement"
      return { success: false, error: error.value }
    } finally {
      isLoading.value = false
    }
  }

  return {
    payment,
    userAccess,
    isLoading,
    error,
    createCheckoutSession,
    fetchMyStripePayment,
    processPendingPayment,
  }
})
