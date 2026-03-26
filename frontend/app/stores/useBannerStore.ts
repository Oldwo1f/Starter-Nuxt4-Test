import { defineStore } from 'pinia'
import { useAuthStore } from './useAuthStore'

export type SiteBannerConfig = {
  id: number
  desktopImageUrl: string | null
  mobileImageUrl: string | null
  isActive: boolean
  updatedAt: string
}

export type BannerForm = {
  isActive: boolean
  desktop?: File
  mobile?: File
  existingDesktop?: string | null
  existingMobile?: string | null
}

export const useBannerStore = defineStore('site-banner', () => {
  const config = useRuntimeConfig()
  const API_BASE_URL = config.public.apiBaseUrl || 'http://localhost:3001'
  const authStore = useAuthStore()

  const data = ref<SiteBannerConfig | null>(null)
  const isLoading = ref(false)
  const isSaving = ref(false)
  const error = ref('')

  const form = ref<BannerForm>({
    isActive: false,
    existingDesktop: null,
    existingMobile: null,
  })

  const hydrateFormFromData = () => {
    form.value.isActive = !!data.value?.isActive
    form.value.existingDesktop = data.value?.desktopImageUrl ?? null
    form.value.existingMobile = data.value?.mobileImageUrl ?? null
    form.value.desktop = undefined
    form.value.mobile = undefined
  }

  const fetchBanner = async () => {
    isLoading.value = true
    error.value = ''
    try {
      const res = await $fetch<SiteBannerConfig>(`${API_BASE_URL}/banner`)
      data.value = res
      hydrateFormFromData()
    } catch (err: any) {
      error.value = err.data?.message || err.message || 'Erreur lors du chargement de la bannière'
    } finally {
      isLoading.value = false
    }
  }

  const saveBanner = async () => {
    if (!authStore.accessToken) {
      return { success: false, error: 'Non authentifié' }
    }

    isSaving.value = true
    try {
      const formData = new FormData()
      formData.append('isActive', String(!!form.value.isActive))

      if (form.value.desktop) {
        formData.append('desktop', form.value.desktop)
      }
      if (form.value.mobile) {
        formData.append('mobile', form.value.mobile)
      }

      const res = await $fetch<SiteBannerConfig>(`${API_BASE_URL}/banner`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${authStore.accessToken}` },
        body: formData,
      })

      data.value = res
      hydrateFormFromData()
      return { success: true, message: 'Bannière mise à jour.' }
    } catch (err: any) {
      return {
        success: false,
        error: err.data?.message || err.message || 'Erreur lors de la sauvegarde de la bannière',
      }
    } finally {
      isSaving.value = false
    }
  }

  return {
    data,
    form,
    isLoading,
    isSaving,
    error,
    fetchBanner,
    saveBanner,
  }
})

