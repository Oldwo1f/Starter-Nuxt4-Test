import { defineStore } from 'pinia'
import { useAuthStore } from './useAuthStore'

export interface Listing {
  id: number
  title: string
  description: string
  price: number
  priceUnit?: string | null
  type: 'bien' | 'service'
  status: 'active' | 'sold' | 'archived'
  categoryId: number
  locationId: number
  sellerId: number
  images: string[]
  viewCount: number
  createdAt: string
  updatedAt: string
  seller?: any
  location?: any
  category?: any
}

export interface ListingFilters {
  locationId?: number
  categoryId?: number
  type?: 'bien' | 'service'
  minPrice?: number
  maxPrice?: number
  search?: string
  status?: 'active' | 'sold' | 'archived'
  sellerId?: number
}

export interface PaginatedResponse {
  data: Listing[]
  total: number
  page: number
  pageSize: number
  totalPages: number
  hasNext: boolean
  hasPrev: boolean
}

export const useMarketplaceStore = defineStore('marketplace', () => {
  const config = useRuntimeConfig()
  const API_BASE_URL = config.public.apiBaseUrl || 'http://localhost:3001'
  const authStore = useAuthStore()

  // State
  const listings = ref<Listing[]>([])
  const currentListing = ref<Listing | null>(null)
  const filters = ref<ListingFilters>({})
  const viewMode = ref<'list' | 'grid'>('list')
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
  const fetchListings = async (
    page: number = 1,
    pageSize: number = 20,
    customFilters?: ListingFilters,
  ) => {
    isLoading.value = true
    error.value = null
    try {
      const activeFilters = customFilters || filters.value
      const params: any = { page, pageSize }
      
      if (activeFilters.locationId) params.locationId = activeFilters.locationId
      if (activeFilters.categoryId) params.categoryId = activeFilters.categoryId
      if (activeFilters.type) params.type = activeFilters.type
      if (activeFilters.minPrice !== undefined) params.minPrice = activeFilters.minPrice
      if (activeFilters.maxPrice !== undefined) params.maxPrice = activeFilters.maxPrice
      if (activeFilters.search) params.search = activeFilters.search
      if (activeFilters.status) params.status = activeFilters.status
      if (activeFilters.sellerId) params.sellerId = activeFilters.sellerId

      const response = await $fetch<PaginatedResponse>(
        `${API_BASE_URL}/marketplace/listings`,
        { query: params }
      )

      listings.value = response.data
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
      error.value = err.data?.message || err.message || 'Erreur lors du chargement des annonces'
      return {
        success: false,
        error: error.value,
      }
    } finally {
      isLoading.value = false
    }
  }

  const fetchListingById = async (id: number) => {
    isLoading.value = true
    error.value = null
    try {
      const listing = await $fetch<Listing>(
        `${API_BASE_URL}/marketplace/listings/${id}`
      )
      currentListing.value = listing
      return { success: true, data: listing }
    } catch (err: any) {
      error.value = err.data?.message || err.message || 'Erreur lors du chargement de l\'annonce'
      return {
        success: false,
        error: error.value,
      }
    } finally {
      isLoading.value = false
    }
  }

  const createListing = async (
    listingData: {
      title: string
      description: string
      price: number
      priceUnit?: string
      type: 'bien' | 'service'
      categoryId: number
      locationId: number
      images?: File[]
    }
  ) => {
    if (!authStore.accessToken) {
      return { success: false, error: 'Non authentifié' }
    }

    isLoading.value = true
    error.value = null
    try {
      const formData = new FormData()
      formData.append('title', listingData.title)
      formData.append('description', listingData.description)
      formData.append('price', Math.round(listingData.price).toString())
      formData.append('type', listingData.type)
      formData.append('categoryId', listingData.categoryId.toString())
      formData.append('locationId', listingData.locationId.toString())
      if (listingData.priceUnit) {
        formData.append('priceUnit', listingData.priceUnit)
      }

      if (listingData.images && listingData.images.length > 0) {
        listingData.images.forEach((file) => {
          formData.append('images', file)
        })
      }

      const listing = await $fetch<Listing>(
        `${API_BASE_URL}/marketplace/listings`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${authStore.accessToken}`,
          },
          body: formData,
        }
      )

      return { success: true, data: listing }
    } catch (err: any) {
      error.value = err.data?.message || err.message || 'Erreur lors de la création de l\'annonce'
      return {
        success: false,
        error: error.value,
      }
    } finally {
      isLoading.value = false
    }
  }

  const updateListing = async (
    id: number,
    updates: {
      title?: string
      description?: string
      price?: number
      priceUnit?: string
      type?: 'bien' | 'service'
      categoryId?: number
      locationId?: number
      status?: 'active' | 'sold' | 'archived'
    }
  ) => {
    if (!authStore.accessToken) {
      return { success: false, error: 'Non authentifié' }
    }

    isLoading.value = true
    error.value = null
    try {
      const updateData: any = { ...updates }
      if (updates.price !== undefined) {
        updateData.price = Math.round(updates.price) // Ensure integer
      }
      const listing = await $fetch<Listing>(
        `${API_BASE_URL}/marketplace/listings/${id}`,
        {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${authStore.accessToken}`,
          },
          body: updateData,
        }
      )

      // Update local state by merging to preserve existing properties (relations, etc.)
      const index = listings.value.findIndex((l) => l.id === id)
      if (index !== -1) {
        // Preserve images array reference if images weren't in the update
        const existingImages = listings.value[index].images
        const imagesInUpdate = 'images' in updateData
        
        // Merge with existing listing to preserve relations and other properties
        Object.assign(listings.value[index], listing)
        
        // If images weren't updated, restore the original reference to prevent image reload
        if (!imagesInUpdate && existingImages) {
          // Compare to make sure images haven't actually changed
          const newImages = listing.images || []
          const imagesUnchanged = 
            newImages.length === existingImages.length &&
            (newImages.length === 0 || JSON.stringify(newImages) === JSON.stringify(existingImages))
          
          if (imagesUnchanged) {
            listings.value[index].images = existingImages
          }
        }
      }
      if (currentListing.value?.id === id) {
        const existingImages = currentListing.value.images
        const imagesInUpdate = 'images' in updateData
        
        Object.assign(currentListing.value, listing)
        
        if (!imagesInUpdate && existingImages) {
          const newImages = listing.images || []
          const imagesUnchanged = 
            newImages.length === existingImages.length &&
            (newImages.length === 0 || JSON.stringify(newImages) === JSON.stringify(existingImages))
          
          if (imagesUnchanged) {
            currentListing.value.images = existingImages
          }
        }
      }

      return { success: true, data: listing }
    } catch (err: any) {
      error.value = err.data?.message || err.message || 'Erreur lors de la mise à jour de l\'annonce'
      return {
        success: false,
        error: error.value,
      }
    } finally {
      isLoading.value = false
    }
  }

  const deleteListing = async (id: number) => {
    if (!authStore.accessToken) {
      return { success: false, error: 'Non authentifié' }
    }

    isLoading.value = true
    error.value = null
    try {
      await $fetch(`${API_BASE_URL}/marketplace/listings/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${authStore.accessToken}`,
        },
      })

      // Remove from local state
      listings.value = listings.value.filter((l) => l.id !== id)
      if (currentListing.value?.id === id) {
        currentListing.value = null
      }

      return { success: true }
    } catch (err: any) {
      error.value = err.data?.message || err.message || 'Erreur lors de la suppression de l\'annonce'
      return {
        success: false,
        error: error.value,
      }
    } finally {
      isLoading.value = false
    }
  }

  const setFilters = (newFilters: ListingFilters) => {
    filters.value = { ...filters.value, ...newFilters }
  }

  const clearFilters = () => {
    filters.value = {}
  }

  const fetchMyListings = async (
    page: number = 1,
    pageSize: number = 20,
    status?: 'active' | 'sold' | 'archived'
  ) => {
    if (!authStore.user?.id) {
      return { success: false, error: 'Utilisateur non connecté' }
    }

    const filters: ListingFilters = {
      sellerId: authStore.user.id,
    }
    if (status) {
      filters.status = status
    }

    return fetchListings(page, pageSize, filters)
  }

  const updateListingStatus = async (
    id: number,
    status: 'active' | 'sold' | 'archived'
  ) => {
    // Get existing listing to preserve images array reference
    const existingIndex = listings.value.findIndex((l) => l.id === id)
    const existingListing = existingIndex !== -1 ? listings.value[existingIndex] : null
    const existingImages = existingListing?.images ? [...existingListing.images] : null
    const existingCurrentListing = currentListing.value?.id === id ? currentListing.value : null
    const existingCurrentImages = existingCurrentListing?.images ? [...existingCurrentListing.images] : null
    
    const result = await updateListing(id, { status })
    
    // Restore images array reference if unchanged to avoid image reload
    if (result.success) {
      const index = listings.value.findIndex((l) => l.id === id)
      if (index !== -1 && existingImages && existingListing) {
        // Compare images arrays (check length and first image to see if they're the same)
        const newImages = listings.value[index].images || []
        const imagesUnchanged = 
          newImages.length === existingImages.length &&
          (newImages.length === 0 || newImages[0] === existingImages[0])
        
        if (imagesUnchanged) {
          // Restore the original images array reference to prevent image reload
          listings.value[index].images = existingListing.images
        }
      }
      if (currentListing.value?.id === id && existingCurrentImages && existingCurrentListing) {
        const newImages = currentListing.value.images || []
        const imagesUnchanged = 
          newImages.length === existingCurrentImages.length &&
          (newImages.length === 0 || newImages[0] === existingCurrentImages[0])
        
        if (imagesUnchanged) {
          // Restore the original images array reference
          currentListing.value.images = existingCurrentListing.images
        }
      }
    }
    
    return result
  }

  const deleteListingImage = async (id: number, imageUrl: string) => {
    if (!authStore.accessToken) {
      return { success: false, error: 'Non authentifié' }
    }

    isLoading.value = true
    error.value = null
    try {
      // Get current listing
      const listingResult = await fetchListingById(id)
      if (!listingResult.success || !listingResult.data) {
        return { success: false, error: 'Impossible de charger l\'annonce' }
      }

      const currentImages = listingResult.data.images || []
      const updatedImages = currentImages.filter((img: string) => img !== imageUrl)

      // Update listing with new images array
      const result = await updateListing(id, { images: updatedImages })
      
      if (result.success) {
        // Refresh current listing
        await fetchListingById(id)
      }

      return result
    } catch (err: any) {
      error.value = err.data?.message || err.message || 'Erreur lors de la suppression de l\'image'
      return {
        success: false,
        error: error.value,
      }
    } finally {
      isLoading.value = false
    }
  }

  const addListingImages = async (id: number, imageFiles: File[]) => {
    if (!authStore.accessToken) {
      return { success: false, error: 'Non authentifié' }
    }

    isLoading.value = true
    error.value = null
    try {
      const formData = new FormData()
      imageFiles.forEach((file) => {
        formData.append('images', file)
      })

      const listing = await $fetch<Listing>(
        `${API_BASE_URL}/marketplace/listings/${id}/images`,
        {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${authStore.accessToken}`,
          },
          body: formData,
        }
      )

      // Update local state
      const index = listings.value.findIndex((l) => l.id === id)
      if (index !== -1) {
        listings.value[index] = listing
      }
      if (currentListing.value?.id === id) {
        currentListing.value = listing
      }

      return { success: true, data: listing }
    } catch (err: any) {
      error.value = err.data?.message || err.message || 'Erreur lors de l\'ajout des images'
      return {
        success: false,
        error: error.value,
      }
    } finally {
      isLoading.value = false
    }
  }

  return {
    // State
    listings: readonly(listings),
    currentListing: readonly(currentListing),
    filters: readonly(filters),
    viewMode,
    isLoading: readonly(isLoading),
    error: readonly(error),
    pagination: readonly(pagination),
    // Actions
    fetchListings,
    fetchListingById,
    createListing,
    updateListing,
    deleteListing,
    setFilters,
    clearFilters,
    fetchMyListings,
    updateListingStatus,
    deleteListingImage,
    addListingImages,
  }
})
