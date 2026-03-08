import { defineStore } from 'pinia'
import { useAuthStore } from './useAuthStore'

export enum PollType {
  QCM = 'qcm',
  RANKING = 'ranking',
}

export enum PollAccessLevel {
  PUBLIC = 'public',
  MEMBER = 'member',
}

export enum PollStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  ENDED = 'ended',
}

export interface PollOption {
  id: number
  pollId: number
  text: string
  order: number
  createdAt: string
  updatedAt: string
}

export interface Poll {
  id: number
  title: string
  description: string | null
  type: PollType
  accessLevel: PollAccessLevel
  status: PollStatus
  options: PollOption[]
  createdAt: string
  updatedAt: string
}

export interface PollResponse {
  id: number
  pollId: number
  userId: number | null
  optionId: number | null
  ranking: Array<{ optionId: number; position: number }> | null
  createdAt: string
  user?: {
    id: number
    email: string
  } | null
  option?: {
    id: number
    text: string
  } | null
}

export interface PollResults {
  pollId: number
  type: PollType
  totalResponses: number
  results: Array<{
    optionId: number
    text: string
    count?: number
    percentage?: number
    averagePosition?: number | null
    responseCount?: number
  }>
}

export interface PaginatedPollsResponse {
  data: Poll[]
  total: number
  page: number
  pageSize: number
  totalPages: number
  hasNext: boolean
  hasPrev: boolean
}

export interface PollForm {
  title: string
  description: string
  type: PollType
  accessLevel: PollAccessLevel
  status: PollStatus
  options: Array<{ text: string; order: number }>
}

export interface SubmitResponseForm {
  optionId?: number
  ranking?: Array<{ optionId: number; position: number }>
}

export const usePollStore = defineStore('poll', () => {
  const config = useRuntimeConfig()
  const API_BASE_URL = config.public.apiBaseUrl || 'http://localhost:3001'
  const authStore = useAuthStore()

  // États
  const polls = ref<Poll[]>([])
  const activePolls = ref<Poll[]>([])
  const currentPoll = ref<Poll | null>(null)
  const currentPollResults = ref<PollResults | null>(null)
  const isLoading = ref(false)
  const error = ref('')

  // États pour les modals admin
  const isModalOpen = ref(false)
  const isDeleteConfirmOpen = ref(false)
  const isDeleting = ref(false)
  const isEditMode = ref(false)
  const selectedPoll = ref<Poll | null>(null)

  // Form pour créer/éditer un sondage
  const form = ref<PollForm>({
    title: '',
    description: '',
    type: PollType.QCM,
    accessLevel: PollAccessLevel.PUBLIC,
    status: PollStatus.DRAFT,
    options: [],
  })

  // Pagination
  const pagination = ref({
    page: 1,
    pageSize: 10,
    total: 0,
    totalPages: 0,
  })

  // Fetch all polls
  const fetchPolls = async (
    page: number = 1,
    pageSize: number = 10,
    status?: PollStatus,
    accessLevel?: PollAccessLevel,
    type?: PollType,
  ) => {
    isLoading.value = true
    error.value = ''
    try {
      const headers: Record<string, string> = {}
      if (authStore.isAuthenticated && authStore.accessToken) {
        headers.Authorization = `Bearer ${authStore.accessToken}`
      }

      const params: Record<string, string | number> = {
        page,
        pageSize,
      }

      if (status) params.status = status
      if (accessLevel) params.accessLevel = accessLevel
      if (type) params.type = type

      const response = await $fetch<PaginatedPollsResponse>(`${API_BASE_URL}/polls`, {
        headers,
        query: params,
      })

      polls.value = response.data
      pagination.value = {
        page: response.page,
        pageSize: response.pageSize,
        total: response.total,
        totalPages: response.totalPages,
      }
    } catch (err: any) {
      const errorMessage = err.data?.message || err.message || 'Erreur lors du chargement des sondages'
      error.value = errorMessage
      console.error('Error fetching polls:', err)
    } finally {
      isLoading.value = false
    }
  }

  // Garde pour éviter les appels multiples simultanés
  const isFetchingActivePolls = ref(false)

  // Fetch active polls (for home page)
  const fetchActivePolls = async () => {
    if (isFetchingActivePolls.value) return // Éviter les appels multiples simultanés
    
    isFetchingActivePolls.value = true
    isLoading.value = true
    error.value = ''
    try {
      const headers: Record<string, string> = {}
      if (authStore.isAuthenticated && authStore.accessToken) {
        headers.Authorization = `Bearer ${authStore.accessToken}`
      }

      const response = await $fetch<Poll[]>(`${API_BASE_URL}/polls/active`, {
        headers,
      })

      activePolls.value = response
    } catch (err: any) {
      const errorMessage = err.data?.message || err.message || 'Erreur lors du chargement des sondages actifs'
      error.value = errorMessage
      console.error('Error fetching active polls:', err)
    } finally {
      isLoading.value = false
      isFetchingActivePolls.value = false
    }
  }

  // Fetch single poll
  const fetchPoll = async (id: number) => {
    isLoading.value = true
    error.value = ''
    try {
      const headers: Record<string, string> = {}
      if (authStore.isAuthenticated && authStore.accessToken) {
        headers.Authorization = `Bearer ${authStore.accessToken}`
      }

      const response = await $fetch<Poll>(`${API_BASE_URL}/polls/${id}`, {
        headers,
      })

      currentPoll.value = response
      return response
    } catch (err: any) {
      const errorMessage = err.data?.message || err.message || 'Erreur lors du chargement du sondage'
      error.value = errorMessage
      throw err
    } finally {
      isLoading.value = false
    }
  }

  // Submit response
  const submitResponse = async (pollId: number, response: SubmitResponseForm) => {
    isLoading.value = true
    error.value = ''
    try {
      const headers: Record<string, string> = {}
      if (authStore.isAuthenticated && authStore.accessToken) {
        headers.Authorization = `Bearer ${authStore.accessToken}`
      }

      await $fetch<PollResponse>(`${API_BASE_URL}/polls/${pollId}/respond`, {
        method: 'POST',
        headers: {
          ...headers,
          'Content-Type': 'application/json',
        },
        body: response,
      })

      // Recharger le sondage et les résultats
      await fetchPoll(pollId)
      // Invalider le cache et recharger les résultats
      hasRespondedCache.value.set(pollId, true)
      resultsCache.value.delete(pollId) // Invalider le cache des résultats
      await getResults(pollId)
    } catch (err: any) {
      const errorMessage = err.data?.message || err.message || 'Erreur lors de la soumission de la réponse'
      error.value = errorMessage
      throw err
    } finally {
      isLoading.value = false
    }
  }

  // Get results
  const getResults = async (pollId: number) => {
    // Vérifier le cache
    if (resultsCache.value.has(pollId)) {
      currentPollResults.value = resultsCache.value.get(pollId)!
      return resultsCache.value.get(pollId)!
    }

    isLoading.value = true
    error.value = ''
    try {
      const headers: Record<string, string> = {}
      if (authStore.isAuthenticated && authStore.accessToken) {
        headers.Authorization = `Bearer ${authStore.accessToken}`
      }

      const response = await $fetch<PollResults>(`${API_BASE_URL}/polls/${pollId}/results`, {
        headers,
      })

      currentPollResults.value = response
      // Mettre en cache
      resultsCache.value.set(pollId, response)
      return response
    } catch (err: any) {
      const errorMessage = err.data?.message || err.message || 'Erreur lors du chargement des résultats'
      error.value = errorMessage
      throw err
    } finally {
      isLoading.value = false
    }
  }

  // Cache pour éviter les appels répétés
  const hasRespondedCache = ref<Map<number, boolean>>(new Map())
  const resultsCache = ref<Map<number, PollResults>>(new Map())

  // Check if user has responded
  const hasUserResponded = async (pollId: number): Promise<boolean> => {
    if (!authStore.isAuthenticated) return false

    // Vérifier le cache
    if (hasRespondedCache.value.has(pollId)) {
      return hasRespondedCache.value.get(pollId)!
    }

    try {
      const headers: Record<string, string> = {}
      if (authStore.accessToken) {
        headers.Authorization = `Bearer ${authStore.accessToken}`
      }

      const response = await $fetch<{ hasResponded: boolean }>(`${API_BASE_URL}/polls/${pollId}/has-responded`, {
        headers,
      })

      // Mettre en cache
      hasRespondedCache.value.set(pollId, response.hasResponded)
      return response.hasResponded
    } catch (err: any) {
      console.error('Error checking if user has responded:', err)
      return false
    }
  }

  // Admin: Create poll
  const createPoll = async () => {
    if (!authStore.accessToken) {
      throw new Error('Non authentifié')
    }

    isLoading.value = true
    error.value = ''
    try {
      const response = await $fetch<Poll>(`${API_BASE_URL}/polls`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${authStore.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: form.value,
      })

      await fetchPolls(pagination.value.page, pagination.value.pageSize)
      closeModal()
      return response
    } catch (err: any) {
      const errorMessage = err.data?.message || err.message || 'Erreur lors de la création du sondage'
      error.value = errorMessage
      throw err
    } finally {
      isLoading.value = false
    }
  }

  // Admin: Update poll
  const updatePoll = async (id: number) => {
    if (!authStore.accessToken) {
      throw new Error('Non authentifié')
    }

    isLoading.value = true
    error.value = ''
    try {
      const response = await $fetch<Poll>(`${API_BASE_URL}/polls/${id}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${authStore.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: form.value,
      })

      await fetchPolls(pagination.value.page, pagination.value.pageSize)
      closeModal()
      return response
    } catch (err: any) {
      const errorMessage = err.data?.message || err.message || 'Erreur lors de la mise à jour du sondage'
      error.value = errorMessage
      throw err
    } finally {
      isLoading.value = false
    }
  }

  // Admin: Delete poll
  const deletePoll = async (id: number) => {
    if (!authStore.accessToken) {
      throw new Error('Non authentifié')
    }

    isDeleting.value = true
    error.value = ''
    try {
      await $fetch(`${API_BASE_URL}/polls/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${authStore.accessToken}`,
        },
      })

      await fetchPolls(pagination.value.page, pagination.value.pageSize)
      isDeleteConfirmOpen.value = false
    } catch (err: any) {
      const errorMessage = err.data?.message || err.message || 'Erreur lors de la suppression du sondage'
      error.value = errorMessage
      throw err
    } finally {
      isDeleting.value = false
    }
  }

  // Admin: Open add modal
  const openAddModal = () => {
    isEditMode.value = false
    selectedPoll.value = null
    form.value = {
      title: '',
      description: '',
      type: PollType.QCM,
      accessLevel: PollAccessLevel.PUBLIC,
      status: PollStatus.DRAFT,
      options: [],
    }
    isModalOpen.value = true
  }

  // Admin: Open edit modal
  const openEditModal = (poll: Poll) => {
    isEditMode.value = true
    selectedPoll.value = poll
    form.value = {
      title: poll.title,
      description: poll.description || '',
      type: poll.type,
      accessLevel: poll.accessLevel,
      status: poll.status,
      options: poll.options.map((opt) => ({
        text: opt.text,
        order: opt.order,
      })),
    }
    isModalOpen.value = true
  }

  // Admin: Close modal
  const closeModal = () => {
    isModalOpen.value = false
    isEditMode.value = false
    selectedPoll.value = null
    form.value = {
      title: '',
      description: '',
      type: PollType.QCM,
      accessLevel: PollAccessLevel.PUBLIC,
      status: PollStatus.DRAFT,
      options: [],
    }
  }

  // Admin: Open delete confirm
  const openDeleteConfirm = (poll: Poll) => {
    selectedPoll.value = poll
    isDeleteConfirmOpen.value = true
  }

  // Admin: Close delete confirm
  const closeDeleteConfirm = () => {
    isDeleteConfirmOpen.value = false
    selectedPoll.value = null
  }

  // Admin: Get responses for a poll
  const getPollResponses = async (pollId: number) => {
    if (!authStore.accessToken) {
      throw new Error('Non authentifié')
    }

    isLoading.value = true
    error.value = ''
    try {
      const response = await $fetch<PollResponse[]>(`${API_BASE_URL}/polls/${pollId}/responses`, {
        headers: {
          Authorization: `Bearer ${authStore.accessToken}`,
        },
      })

      return response
    } catch (err: any) {
      const errorMessage = err.data?.message || err.message || 'Erreur lors du chargement des votes'
      error.value = errorMessage
      throw err
    } finally {
      isLoading.value = false
    }
  }

  // Admin: Delete a response
  const deleteResponse = async (responseId: number) => {
    if (!authStore.accessToken) {
      throw new Error('Non authentifié')
    }

    isLoading.value = true
    error.value = ''
    try {
      await $fetch(`${API_BASE_URL}/polls/responses/${responseId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${authStore.accessToken}`,
        },
      })
    } catch (err: any) {
      const errorMessage = err.data?.message || err.message || 'Erreur lors de la suppression du vote'
      error.value = errorMessage
      throw err
    } finally {
      isLoading.value = false
    }
  }

  return {
    // States
    polls,
    activePolls,
    currentPoll,
    currentPollResults,
    isLoading,
    error,
    isModalOpen,
    isDeleteConfirmOpen,
    isDeleting,
    isEditMode,
    selectedPoll,
    form,
    pagination,
    // Actions
    fetchPolls,
    fetchActivePolls,
    fetchPoll,
    submitResponse,
    getResults,
    hasUserResponded,
    createPoll,
    updatePoll,
    deletePoll,
    openAddModal,
    openEditModal,
    closeModal,
    openDeleteConfirm,
    closeDeleteConfirm,
    getPollResponses,
    deleteResponse,
  }
})
