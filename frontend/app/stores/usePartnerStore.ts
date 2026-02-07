import { defineStore } from 'pinia'
import { useAuthStore } from './useAuthStore'

export interface Partner {
  id: number
  name: string
  link: string | null
  bannerHorizontalUrl: string | null
  bannerVerticalUrl: string | null
  createdAt: string
  updatedAt: string
}

export interface PartnerForm {
  name: string
  link: string
  bannerHorizontal?: File
  bannerVertical?: File
  existingBannerHorizontal?: string | null
  existingBannerVertical?: string | null
  deleteBannerHorizontal?: boolean
  deleteBannerVertical?: boolean
}

export const usePartnerStore = defineStore('partner', () => {
  const config = useRuntimeConfig()
  const API_BASE_URL = config.public.apiBaseUrl || 'http://localhost:3001'
  const authStore = useAuthStore()

  // États
  const partners = ref<Partner[]>([])
  const isLoading = ref(false)
  const error = ref('')
  const selectedPartner = ref<Partner | null>(null)

  // États pour les modals
  const isModalOpen = ref(false)
  const isDeleteConfirmOpen = ref(false)
  const isDeleting = ref(false)
  const isEditMode = ref(false)

  // Form pour créer/éditer un partenaire
  const form = ref<PartnerForm>({
    name: '',
    link: '',
  })

  const fetchPartners = async () => {
    isLoading.value = true
    error.value = ''
    try {
      const response = await $fetch<Partner[]>(`${API_BASE_URL}/partners`, {
        headers: authStore.isAuthenticated
          ? {
              Authorization: `Bearer ${authStore.accessToken}`,
            }
          : {},
      })
      partners.value = response
    } catch (err: any) {
      const errorMessage = err.data?.message || err.message || 'Erreur lors du chargement des partenaires'
      error.value = errorMessage
    } finally {
      isLoading.value = false
    }
  }

  const openAddModal = () => {
    isEditMode.value = false
    form.value = {
      name: '',
      link: '',
      deleteBannerHorizontal: false,
      deleteBannerVertical: false,
    }
    isModalOpen.value = true
  }

  const openEditModal = (partner: Partner) => {
    isEditMode.value = true
    selectedPartner.value = partner
    form.value = {
      name: partner.name,
      link: partner.link || '',
      existingBannerHorizontal: partner.bannerHorizontalUrl,
      existingBannerVertical: partner.bannerVerticalUrl,
      deleteBannerHorizontal: false,
      deleteBannerVertical: false,
    }
    isModalOpen.value = true
  }

  const closeModal = () => {
    isModalOpen.value = false
    selectedPartner.value = null
    form.value = {
      name: '',
      link: '',
      deleteBannerHorizontal: false,
      deleteBannerVertical: false,
    }
  }

  const savePartner = async () => {
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

      // Ajouter les bannières
      if (form.value.bannerHorizontal) {
        formData.append('banners', form.value.bannerHorizontal)
      }
      if (form.value.bannerVertical) {
        formData.append('banners', form.value.bannerVertical)
      }

      // Ajouter les flags de suppression pour les bannières (en mode édition uniquement)
      if (isEditMode.value) {
        if (form.value.deleteBannerHorizontal) {
          formData.append('deleteBannerHorizontal', 'true')
        }
        if (form.value.deleteBannerVertical) {
          formData.append('deleteBannerVertical', 'true')
        }
      }

      if (isEditMode.value && selectedPartner.value) {
        // Mettre à jour
        await $fetch(`${API_BASE_URL}/partners/${selectedPartner.value.id}`, {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${authStore.accessToken}`,
          },
          body: formData,
        })
        closeModal()
        await fetchPartners()
        return {
          success: true,
          message: 'Le partenaire a été modifié avec succès.',
        }
      } else {
        // Créer
        await $fetch(`${API_BASE_URL}/partners`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${authStore.accessToken}`,
          },
          body: formData,
        })
        closeModal()
        await fetchPartners()
        return {
          success: true,
          message: 'Le partenaire a été créé avec succès.',
        }
      }
    } catch (err: any) {
      const errorMessage = err.data?.message || err.message || 'Erreur lors de la sauvegarde du partenaire'
      return {
        success: false,
        error: errorMessage,
      }
    }
  }

  const openDeleteConfirm = (partner: Partner) => {
    selectedPartner.value = partner
    isDeleteConfirmOpen.value = true
  }

  const closeDeleteConfirm = () => {
    isDeleteConfirmOpen.value = false
    selectedPartner.value = null
  }

  const deletePartner = async () => {
    if (!selectedPartner.value) return { success: false, error: 'Aucun partenaire sélectionné' }

    isDeleting.value = true
    try {
      await $fetch(`${API_BASE_URL}/partners/${selectedPartner.value.id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${authStore.accessToken}`,
        },
      })
      closeDeleteConfirm()
      await fetchPartners()
      return {
        success: true,
        message: 'Le partenaire a été supprimé avec succès.',
      }
    } catch (err: any) {
      const errorMessage = err.data?.message || err.message || 'Erreur lors de la suppression du partenaire'
      return {
        success: false,
        error: errorMessage,
      }
    } finally {
      isDeleting.value = false
    }
  }

  return {
    partners,
    isLoading,
    error,
    selectedPartner,
    isModalOpen,
    isDeleteConfirmOpen,
    isDeleting,
    isEditMode,
    form,
    fetchPartners,
    openAddModal,
    openEditModal,
    closeModal,
    savePartner,
    openDeleteConfirm,
    closeDeleteConfirm,
    deletePartner,
  }
})
