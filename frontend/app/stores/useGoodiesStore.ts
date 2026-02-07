import { defineStore } from 'pinia'
import { useAuthStore } from './useAuthStore'

export interface Goodie {
  id: number
  name: string
  link: string | null
  description: string | null
  imageUrl: string | null
  offeredByName: string | null
  offeredByLink: string | null
  isPublic: boolean
  createdAt: string
  updatedAt: string
  createdBy?: {
    id: number
    email: string
  } | null
}

export interface GoodieForm {
  name: string
  link: string
  description: string
  offeredByName: string
  offeredByLink: string
  isPublic: boolean
  image?: File
  existingImage?: string | null
  deleteImage?: boolean
}

export const useGoodiesStore = defineStore('goodies', () => {
  const config = useRuntimeConfig()
  const API_BASE_URL = config.public.apiBaseUrl || 'http://localhost:3001'
  const authStore = useAuthStore()

  // États
  const goodies = ref<Goodie[]>([])
  const isLoading = ref(false)
  const error = ref('')
  const selectedGoodie = ref<Goodie | null>(null)

  // États pour les modals (admin)
  const isModalOpen = ref(false)
  const isDeleteConfirmOpen = ref(false)
  const isDeleting = ref(false)
  const isEditMode = ref(false)

  // Form pour créer/éditer un goodie (admin)
  const form = ref<GoodieForm>({
    name: '',
    link: '',
    description: '',
    offeredByName: '',
    offeredByLink: '',
    isPublic: true,
    deleteImage: false,
  })

  const fetchGoodies = async () => {
    isLoading.value = true
    error.value = ''
    try {
      const response = await $fetch<Goodie[]>(`${API_BASE_URL}/goodies`, {
        headers: authStore.isAuthenticated
          ? {
              Authorization: `Bearer ${authStore.accessToken}`,
            }
          : {},
      })
      goodies.value = response
    } catch (err: any) {
      const errorMessage = err.data?.message || err.message || 'Erreur lors du chargement des goodies'
      error.value = errorMessage
      console.error('Error fetching goodies:', err)
    } finally {
      isLoading.value = false
    }
  }

  // Méthodes pour les pages publiques
  const canAccessGoodie = (goodie: Goodie): boolean => {
    // Si le goodie est public, tout le monde peut y accéder
    if (goodie.isPublic) {
      return true
    }
    // Sinon, seuls les utilisateurs connectés peuvent y accéder
    return authStore.isAuthenticated
  }

  // Méthodes pour l'admin
  const openAddModal = () => {
    isEditMode.value = false
    form.value = {
      name: '',
      link: '',
      description: '',
      offeredByName: '',
      offeredByLink: '',
      isPublic: true,
      deleteImage: false,
    }
    isModalOpen.value = true
  }

  const openEditModal = (goodie: Goodie) => {
    isEditMode.value = true
    selectedGoodie.value = goodie
    form.value = {
      name: goodie.name,
      link: goodie.link || '',
      description: goodie.description || '',
      offeredByName: goodie.offeredByName || '',
      offeredByLink: goodie.offeredByLink || '',
      isPublic: goodie.isPublic,
      existingImage: goodie.imageUrl,
      deleteImage: false,
    }
    isModalOpen.value = true
  }

  const closeModal = () => {
    isModalOpen.value = false
    selectedGoodie.value = null
    form.value = {
      name: '',
      link: '',
      description: '',
      offeredByName: '',
      offeredByLink: '',
      isPublic: true,
      deleteImage: false,
    }
  }

  const saveGoodie = async () => {
    if (!form.value.name.trim()) {
      return {
        success: false,
        error: 'Le nom est requis',
      }
    }

    try {
      const formData = new FormData()
      formData.append('name', form.value.name)
      if (form.value.link) {
        formData.append('link', form.value.link)
      }
      if (form.value.description) {
        formData.append('description', form.value.description)
      }
      if (form.value.offeredByName) {
        formData.append('offeredByName', form.value.offeredByName)
      }
      if (form.value.offeredByLink) {
        formData.append('offeredByLink', form.value.offeredByLink)
      }
      formData.append('isPublic', form.value.isPublic.toString())

      // Ajouter l'image
      if (form.value.image) {
        formData.append('image', form.value.image)
      }

      // Ajouter le flag de suppression pour l'image (en mode édition uniquement)
      if (isEditMode.value && form.value.deleteImage) {
        formData.append('deleteImage', 'true')
      }

      if (isEditMode.value && selectedGoodie.value) {
        // Mettre à jour
        await $fetch(`${API_BASE_URL}/goodies/${selectedGoodie.value.id}`, {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${authStore.accessToken}`,
          },
          body: formData,
        })
        closeModal()
        await fetchGoodies()
        return {
          success: true,
          message: 'Le goodie a été modifié avec succès.',
        }
      } else {
        // Créer
        await $fetch(`${API_BASE_URL}/goodies`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${authStore.accessToken}`,
          },
          body: formData,
        })
        closeModal()
        await fetchGoodies()
        return {
          success: true,
          message: 'Le goodie a été créé avec succès.',
        }
      }
    } catch (err: any) {
      const errorMessage = err.data?.message || err.message || 'Erreur lors de la sauvegarde du goodie'
      return {
        success: false,
        error: errorMessage,
      }
    }
  }

  const openDeleteConfirm = (goodie: Goodie) => {
    selectedGoodie.value = goodie
    isDeleteConfirmOpen.value = true
  }

  const closeDeleteConfirm = () => {
    isDeleteConfirmOpen.value = false
    selectedGoodie.value = null
  }

  const deleteGoodie = async () => {
    if (!selectedGoodie.value) return { success: false, error: 'Aucun goodie sélectionné' }

    isDeleting.value = true
    try {
      await $fetch(`${API_BASE_URL}/goodies/${selectedGoodie.value.id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${authStore.accessToken}`,
        },
      })
      closeDeleteConfirm()
      await fetchGoodies()
      return {
        success: true,
        message: 'Le goodie a été supprimé avec succès.',
      }
    } catch (err: any) {
      const errorMessage = err.data?.message || err.message || 'Erreur lors de la suppression du goodie'
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
    goodies: readonly(goodies),
    isLoading: readonly(isLoading),
    error: readonly(error),
    
    // États admin
    selectedGoodie,
    isModalOpen,
    isDeleteConfirmOpen,
    isDeleting,
    isEditMode,
    form,
    
    // Méthodes publiques
    fetchGoodies,
    canAccessGoodie,
    
    // Méthodes admin
    openAddModal,
    openEditModal,
    closeModal,
    saveGoodie,
    openDeleteConfirm,
    closeDeleteConfirm,
    deleteGoodie,
  }
})
