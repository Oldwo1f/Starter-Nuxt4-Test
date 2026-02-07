import { defineStore } from 'pinia'
import { useAuthStore } from './useAuthStore'

export type CultureType = 'reportage' | 'documentaire' | 'interview'

export interface Culture {
  id: number
  title: string
  type: CultureType
  youtubeUrl: string
  director: string | null
  isPublic: boolean
  createdAt: string
  updatedAt: string
  createdBy?: {
    id: number
    email: string
  } | null
}

export interface CultureForm {
  title: string
  type: CultureType
  youtubeUrl: string
  director: string
  isPublic: boolean
}

export const useCultureStore = defineStore('culture', () => {
  const config = useRuntimeConfig()
  const API_BASE_URL = config.public.apiBaseUrl || 'http://localhost:3001'
  const authStore = useAuthStore()

  // États
  const cultures = ref<Culture[]>([])
  const isLoading = ref(false)
  const error = ref('')
  const selectedCulture = ref<Culture | null>(null)

  // États pour les modals (admin)
  const isModalOpen = ref(false)
  const isDeleteConfirmOpen = ref(false)
  const isDeleting = ref(false)
  const isEditMode = ref(false)

  // Form pour créer/éditer une vidéo culture (admin)
  const form = ref<CultureForm>({
    title: '',
    type: 'reportage',
    youtubeUrl: '',
    director: '',
    isPublic: true,
  })

  const fetchCultures = async () => {
    isLoading.value = true
    error.value = ''
    try {
      const response = await $fetch<Culture[]>(`${API_BASE_URL}/culture`, {
        headers: authStore.isAuthenticated
          ? {
              Authorization: `Bearer ${authStore.accessToken}`,
            }
          : {},
      })
      cultures.value = response
    } catch (err: any) {
      const errorMessage = err.data?.message || err.message || 'Erreur lors du chargement des vidéos'
      error.value = errorMessage
      console.error('Error fetching cultures:', err)
    } finally {
      isLoading.value = false
    }
  }

  // Méthodes pour les pages publiques
  const canAccessCulture = (culture: Culture): boolean => {
    // Si la vidéo est publique, tout le monde peut y accéder
    if (culture.isPublic) {
      return true
    }
    // Sinon, seuls les utilisateurs connectés peuvent y accéder
    return authStore.isAuthenticated
  }

  // Méthodes pour l'admin
  const openAddModal = () => {
    isEditMode.value = false
    form.value = {
      title: '',
      type: 'reportage',
      youtubeUrl: '',
      director: 'Nuna\'a Heritage - Naho',
      isPublic: true,
    }
    isModalOpen.value = true
  }

  const openEditModal = (culture: Culture) => {
    isEditMode.value = true
    selectedCulture.value = culture
    form.value = {
      title: culture.title,
      type: culture.type,
      youtubeUrl: culture.youtubeUrl,
      director: culture.director || '',
      isPublic: culture.isPublic,
    }
    isModalOpen.value = true
  }

  const closeModal = () => {
    isModalOpen.value = false
    selectedCulture.value = null
    form.value = {
      title: '',
      type: 'reportage',
      youtubeUrl: '',
      director: 'Nuna\'a Heritage - Naho',
      isPublic: true,
    }
  }

  const saveCulture = async () => {
    if (!form.value.title.trim()) {
      return {
        success: false,
        error: 'Le titre est requis',
      }
    }

    if (!form.value.youtubeUrl.trim()) {
      return {
        success: false,
        error: 'L\'URL YouTube est requise',
      }
    }

    try {
      const body = {
        title: form.value.title,
        type: form.value.type,
        youtubeUrl: form.value.youtubeUrl,
        director: form.value.director || undefined,
        isPublic: form.value.isPublic,
      }

      if (isEditMode.value && selectedCulture.value) {
        // Mettre à jour
        await $fetch(`${API_BASE_URL}/culture/${selectedCulture.value.id}`, {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${authStore.accessToken}`,
            'Content-Type': 'application/json',
          },
          body,
        })
        closeModal()
        await fetchCultures()
        return {
          success: true,
          message: 'La vidéo a été modifiée avec succès.',
        }
      } else {
        // Créer
        await $fetch(`${API_BASE_URL}/culture`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${authStore.accessToken}`,
            'Content-Type': 'application/json',
          },
          body,
        })
        closeModal()
        await fetchCultures()
        return {
          success: true,
          message: 'La vidéo a été créée avec succès.',
        }
      }
    } catch (err: any) {
      const errorMessage = err.data?.message || err.message || 'Erreur lors de la sauvegarde de la vidéo'
      return {
        success: false,
        error: errorMessage,
      }
    }
  }

  const openDeleteConfirm = (culture: Culture) => {
    selectedCulture.value = culture
    isDeleteConfirmOpen.value = true
  }

  const closeDeleteConfirm = () => {
    isDeleteConfirmOpen.value = false
    selectedCulture.value = null
  }

  const deleteCulture = async () => {
    if (!selectedCulture.value) return { success: false, error: 'Aucune vidéo sélectionnée' }

    isDeleting.value = true
    try {
      await $fetch(`${API_BASE_URL}/culture/${selectedCulture.value.id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${authStore.accessToken}`,
        },
      })
      closeDeleteConfirm()
      await fetchCultures()
      return {
        success: true,
        message: 'La vidéo a été supprimée avec succès.',
      }
    } catch (err: any) {
      const errorMessage = err.data?.message || err.message || 'Erreur lors de la suppression de la vidéo'
      return {
        success: false,
        error: errorMessage,
      }
    } finally {
      isDeleting.value = false
    }
  }

  return {
    // États publics
    cultures: readonly(cultures),
    isLoading: readonly(isLoading),
    error: readonly(error),
    
    // États admin
    selectedCulture,
    isModalOpen,
    isDeleteConfirmOpen,
    isDeleting,
    isEditMode,
    form,
    
    // Méthodes publiques
    fetchCultures,
    canAccessCulture,
    
    // Méthodes admin
    openAddModal,
    openEditModal,
    closeModal,
    saveCulture,
    openDeleteConfirm,
    closeDeleteConfirm,
    deleteCulture,
  }
})
