import { defineStore } from 'pinia'
import { useAuthStore } from './useAuthStore'

export interface Goodie {
  id: number
  name: string
  link: string | null
  fileUrl: string | null
  description: string | null
  imageUrl: string | null
  offeredByName: string | null
  offeredByLink: string | null
  accessLevel: 'public' | 'member' | 'premium' | 'vip'
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
  accessLevel: 'public' | 'member' | 'premium' | 'vip'
  image?: File
  existingImage?: string | null
  deleteImage?: boolean
  file?: File
  existingFile?: string | null
  deleteFile?: boolean
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
    accessLevel: 'public',
    deleteImage: false,
    deleteFile: false,
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
    // Public est accessible à tous
    if (goodie.accessLevel === 'public') {
      return true
    }

    // Si l'utilisateur n'est pas connecté, seul public est accessible
    if (!authStore.isAuthenticated || !authStore.user) {
      return false
    }

    const userRole = authStore.user.role?.toLowerCase()

    // Les staff (admin, superadmin, moderator) ont accès à tout
    if (['admin', 'superadmin', 'moderator'].includes(userRole)) {
      return true
    }

    // Hiérarchie des niveaux d'accès
    const levelHierarchy: Record<'public' | 'member' | 'premium' | 'vip', number> = {
      public: 0,
      member: 1,
      premium: 2,
      vip: 3,
    }

    // Mapping des rôles utilisateur vers leurs niveaux
    const roleToLevel: Record<string, number> = {
      user: 0, // user = public
      member: 1,
      premium: 2,
      vip: 3,
      admin: 999, // admin a accès à tout
      superadmin: 999,
      moderator: 999,
    }

    const userLevel = roleToLevel[userRole] || 0
    const requiredLevel = levelHierarchy[goodie.accessLevel]

    return userLevel >= requiredLevel
  }

  // Obtenir le message d'accès requis pour un goodie
  const getAccessMessage = (goodie: Goodie): string => {
    switch (goodie.accessLevel) {
      case 'public':
        return 'Disponible pour tous'
      case 'member':
        return 'Devenir membre pour accéder'
      case 'premium':
        return 'Disponible premium'
      case 'vip':
        return 'Disponible VIP'
      default:
        return 'Accès restreint'
    }
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
      accessLevel: 'public',
      deleteImage: false,
      deleteFile: false,
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
      accessLevel: goodie.accessLevel,
      existingImage: goodie.imageUrl,
      deleteImage: false,
      existingFile: goodie.fileUrl,
      deleteFile: false,
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
      accessLevel: 'public',
      deleteImage: false,
      deleteFile: false,
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
      formData.append('accessLevel', form.value.accessLevel)

      // Ajouter l'image
      if (form.value.image) {
        formData.append('image', form.value.image)
      }

      // Ajouter le fichier
      if (form.value.file) {
        formData.append('file', form.value.file)
      }

      // Ajouter le flag de suppression pour l'image (en mode édition uniquement)
      if (isEditMode.value && form.value.deleteImage) {
        formData.append('deleteImage', 'true')
      }

      // Ajouter le flag de suppression pour le fichier (en mode édition uniquement)
      if (isEditMode.value && form.value.deleteFile) {
        formData.append('deleteFile', 'true')
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
    getAccessMessage,
    
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
