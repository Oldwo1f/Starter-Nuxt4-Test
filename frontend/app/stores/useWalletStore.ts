import { defineStore } from 'pinia'
import { useAuthStore } from './useAuthStore'

export interface Transaction {
  id: number
  type: 'debit' | 'credit' | 'exchange'
  amount: number
  balanceBefore: number
  balanceAfter: number
  status: 'pending' | 'completed' | 'cancelled'
  fromUserId: number
  toUserId: number
  listingId?: number | null
  description?: string | null
  createdAt: string
  fromUser?: any
  toUser?: any
  listing?: any
}

export interface PaginatedTransactionsResponse {
  data: Transaction[]
  total: number
  page: number
  pageSize: number
  totalPages: number
  hasNext: boolean
  hasPrev: boolean
}

export const useWalletStore = defineStore('wallet', () => {
  const config = useRuntimeConfig()
  const API_BASE_URL = config.public.apiBaseUrl || 'http://localhost:3001'
  const authStore = useAuthStore()

  // State
  const balance = ref<number>(0)
  const transactions = ref<Transaction[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const pagination = ref({
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 0,
    hasNext: false,
    hasPrev: false,
  })

  // Actions
  const fetchBalance = async () => {
    if (!authStore.accessToken) {
      return { success: false, error: 'Non authentifié' }
    }

    isLoading.value = true
    error.value = null
    try {
      const response = await $fetch<{ balance: number }>(
        `${API_BASE_URL}/wallet/balance`,
        {
          headers: {
            Authorization: `Bearer ${authStore.accessToken}`,
          },
        }
      )
      balance.value = response.balance
      return { success: true, data: response }
    } catch (err: any) {
      error.value = err.data?.message || err.message || 'Erreur lors de la récupération du solde'
      return {
        success: false,
        error: error.value,
      }
    } finally {
      isLoading.value = false
    }
  }

  const fetchTransactions = async (page: number = 1, pageSize: number = 20) => {
    if (!authStore.accessToken) {
      return { success: false, error: 'Non authentifié' }
    }

    isLoading.value = true
    error.value = null
    try {
      const response = await $fetch<PaginatedTransactionsResponse>(
        `${API_BASE_URL}/wallet/transactions`,
        {
          headers: {
            Authorization: `Bearer ${authStore.accessToken}`,
          },
          query: { page, pageSize },
        }
      )
      transactions.value = response.data
      pagination.value = {
        page: response.page,
        pageSize: response.pageSize,
        total: response.total,
        totalPages: response.totalPages,
        hasNext: response.hasNext,
        hasPrev: response.hasPrev,
      }
      return { success: true, data: response }
    } catch (err: any) {
      error.value = err.data?.message || err.message || 'Erreur lors du chargement des transactions'
      return {
        success: false,
        error: error.value,
      }
    } finally {
      isLoading.value = false
    }
  }

  const transfer = async (
    toUserEmail: string,
    amount: number,
    description: string
  ) => {
    if (!authStore.accessToken) {
      return { success: false, error: 'Non authentifié' }
    }

    if (!description || description.trim().length === 0) {
      return { success: false, error: 'La description est obligatoire' }
    }

    isLoading.value = true
    error.value = null
    try {
      const response = await $fetch<{
        debitTransaction: Transaction
        creditTransaction: Transaction
      }>(
        `${API_BASE_URL}/wallet/transfer`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${authStore.accessToken}`,
          },
          body: {
            toUserEmail,
            amount,
            description: description.trim(),
          },
        }
      )
      
      // Update balance
      await fetchBalance()
      // Refresh transactions
      await fetchTransactions(pagination.value.page, pagination.value.pageSize)
      
      // Return the debit transaction (for the sender)
      return { success: true, data: response.debitTransaction }
    } catch (err: any) {
      error.value = err.data?.message || err.message || 'Erreur lors du transfert'
      return {
        success: false,
        error: error.value,
      }
    } finally {
      isLoading.value = false
    }
  }

  const exchange = async (listingId: number) => {
    if (!authStore.accessToken) {
      return { success: false, error: 'Non authentifié' }
    }

    isLoading.value = true
    error.value = null
    try {
      const transaction = await $fetch<Transaction>(
        `${API_BASE_URL}/wallet/exchange`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${authStore.accessToken}`,
          },
          body: {
            listingId,
          },
        }
      )
      
      // Update balance
      await fetchBalance()
      // Refresh transactions
      await fetchTransactions(pagination.value.page, pagination.value.pageSize)
      
      return { success: true, data: transaction }
    } catch (err: any) {
      error.value = err.data?.message || err.message || 'Erreur lors de l\'échange'
      return {
        success: false,
        error: error.value,
      }
    } finally {
      isLoading.value = false
    }
  }

  const searchUsers = async (searchTerm: string, limit: number = 20) => {
    if (!authStore.accessToken) {
      return { success: false, error: 'Non authentifié', data: [] }
    }

    try {
      const users = await $fetch<any[]>(
        `${API_BASE_URL}/wallet/search-users`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${authStore.accessToken}`,
          },
          query: {
            search: searchTerm,
            limit,
          },
        }
      )

      return { success: true, data: users || [] }
    } catch (err: any) {
      return {
        success: false,
        error: err.data?.message || err.message || 'Erreur lors de la recherche',
        data: [],
      }
    }
  }

  return {
    // State
    balance: readonly(balance),
    transactions: readonly(transactions),
    isLoading: readonly(isLoading),
    error: readonly(error),
    pagination: readonly(pagination),
    // Actions
    fetchBalance,
    fetchTransactions,
    transfer,
    exchange,
    searchUsers,
  }
})
