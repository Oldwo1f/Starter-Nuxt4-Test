import { defineStore } from 'pinia'
import { useAuthStore } from './useAuthStore'

export type BankTransferPack = 'teOhi' | 'umete'
export type BankTransferPaymentStatus = 'pending' | 'paid' | 'cancelled'

export interface BankTransferPayment {
  id: number
  referenceId: string
  pack: BankTransferPack
  amountXpf: number
  status: BankTransferPaymentStatus
  bankTransactionId?: string | null
  payerName?: string | null
  paidAt?: string | null
  needsVerification?: boolean
  pupuInscriptionReceived?: boolean
  createdAt: string
  updatedAt?: string
}

export interface BankTransferMeResponse {
  payment: BankTransferPayment | null
  user: {
    role: string
    paidAccessExpiresAt: string | null
  } | null
}

export interface LegacyVerification {
  id: number
  paidWith: 'naho' | 'tamiga'
  status: 'pending' | 'confirmed' | 'rejected'
  createdAt: string
}

export interface LegacyVerificationMeResponse {
  verification: LegacyVerification | null
  user: {
    role: string
    paidAccessExpiresAt: string | null
  } | null
}

export const useBillingStore = defineStore('billing', () => {
  const config = useRuntimeConfig()
  const API_BASE_URL = config.public.apiBaseUrl || 'http://localhost:3001'
  const authStore = useAuthStore()

  const payment = ref<BankTransferPayment | null>(null)
  const userAccess = ref<BankTransferMeResponse['user']>(null)
  const legacyVerification = ref<LegacyVerification | null>(null)
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  const fetchMyBankTransfer = async () => {
    if (!authStore.accessToken) {
      return { success: false, error: 'Non authentifié' }
    }

    isLoading.value = true
    error.value = null
    try {
      const response = await $fetch<BankTransferMeResponse>(
        `${API_BASE_URL}/billing/bank-transfer/me`,
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

  const createOrReuseIntent = async (pack: BankTransferPack) => {
    if (!authStore.accessToken) {
      return { success: false, error: 'Non authentifié' }
    }

    isLoading.value = true
    error.value = null
    try {
      const created = await $fetch<BankTransferPayment>(
        `${API_BASE_URL}/billing/bank-transfer/intent`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${authStore.accessToken}`,
          },
          body: { pack },
        }
      )
      payment.value = created
      return { success: true, data: created }
    } catch (err: any) {
      error.value =
        err.data?.message ||
        err.message ||
        "Erreur lors de la génération de la référence de virement"
      return { success: false, error: error.value }
    } finally {
      isLoading.value = false
    }
  }

  const requestVerification = async (paymentId: number) => {
    if (!authStore.accessToken) {
      return { success: false, error: 'Non authentifié' }
    }

    isLoading.value = true
    error.value = null
    try {
      await $fetch(`${API_BASE_URL}/billing/bank-transfer/request-verification`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${authStore.accessToken}`,
        },
        body: { paymentId },
      })
      // Refresh payment status and user profile
      await fetchMyBankTransfer()
      await authStore.fetchProfile()
      return { success: true }
    } catch (err: any) {
      error.value =
        err.data?.message ||
        err.message ||
        "Erreur lors de la demande de vérification"
      return { success: false, error: error.value }
    } finally {
      isLoading.value = false
    }
  }

  const requestLegacyVerification = async (paidWith: 'naho' | 'tamiga') => {
    if (!authStore.accessToken) {
      return { success: false, error: 'Non authentifié' }
    }

    isLoading.value = true
    error.value = null
    try {
      const response = await $fetch<{ ok: boolean; alreadyRequested?: boolean }>(
        `${API_BASE_URL}/billing/legacy/request-verification`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${authStore.accessToken}`,
            'Content-Type': 'application/json',
          },
          body: { paidWith },
        }
      )
      
      if (response.ok) {
        // Refresh user profile to get updated role and access
        await authStore.fetchProfile()
        return { success: true, data: response }
      }
      
      return { success: false, error: 'Erreur lors de la demande de vérification' }
    } catch (err: any) {
      error.value =
        err.data?.message ||
        err.message ||
        "Erreur lors de la demande de vérification"
      return { success: false, error: error.value }
    } finally {
      isLoading.value = false
    }
  }

  const fetchMyLegacyVerification = async () => {
    if (!authStore.accessToken) {
      return { success: false, error: 'Non authentifié' }
    }

    isLoading.value = true
    error.value = null
    try {
      const response = await $fetch<LegacyVerificationMeResponse>(
        `${API_BASE_URL}/billing/legacy/me`,
        {
          headers: {
            Authorization: `Bearer ${authStore.accessToken}`,
          },
        }
      )
      legacyVerification.value = response.verification
      return { success: true, data: response }
    } catch (err: any) {
      error.value =
        err.data?.message ||
        err.message ||
        "Erreur lors de la récupération de l'état de la vérification"
      return { success: false, error: error.value }
    } finally {
      isLoading.value = false
    }
  }

  return {
    payment,
    userAccess,
    legacyVerification,
    isLoading,
    error,
    fetchMyBankTransfer,
    createOrReuseIntent,
    requestVerification,
    requestLegacyVerification,
    fetchMyLegacyVerification,
  }
})

