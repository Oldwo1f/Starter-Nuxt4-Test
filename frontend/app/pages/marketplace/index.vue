<script setup lang="ts">
import { useAuthStore } from '~/stores/useAuthStore'
import { useDate } from '~/composables/useDate'

definePageMeta({
  layout: 'marketplace',
})

const { fromNow } = useDate()

const API_BASE_URL = 'http://localhost:3001'
const authStore = useAuthStore()

// View mode: 'list' or 'grid'
const viewMode = ref<'list' | 'grid'>('list')

// Filters slideover state
const isFiltersOpen = ref(false)

// Filters
const filters = ref({
  locationId: undefined as number | undefined,
  categoryId: undefined as number | undefined,
  type: undefined as 'bien' | 'service' | undefined,
  minPrice: undefined as number | undefined,
  maxPrice: undefined as number | undefined,
  search: '' as string,
})

// Data
const listings = ref<any[]>([])
const locations = ref<any[]>([])
const locationsHierarchy = ref<any[]>([])
const categories = ref<any[]>([])
const isLoading = ref(false)
const pagination = ref({
  page: 1,
  pageSize: 20,
  total: 0,
  totalPages: 0,
  hasNext: false,
  hasPrev: false,
})

// Fetch locations
const fetchLocations = async () => {
  try {
    const hierarchy = await $fetch<any[]>(`${API_BASE_URL}/locations/hierarchy`)
    locationsHierarchy.value = hierarchy || []
    // Flatten for easier access
    const flat = await $fetch<any[]>(`${API_BASE_URL}/locations`)
    locations.value = flat || []
    console.log('Locations loaded:', locations.value.length)
  } catch (error) {
    console.error('Error fetching locations:', error)
    locations.value = []
    locationsHierarchy.value = []
  }
}

// Fetch categories
const fetchCategories = async () => {
  try {
    const cats = await $fetch<any[]>(`${API_BASE_URL}/categories`)
    categories.value = cats || []
    console.log('Categories loaded:', categories.value.length)
  } catch (error) {
    console.error('Error fetching categories:', error)
    categories.value = []
  }
}

// Fetch listings
const fetchListings = async () => {
  isLoading.value = true
  try {
    const params: any = {
      page: pagination.value.page,
      pageSize: pagination.value.pageSize,
    }
    if (filters.value.locationId) params.locationId = filters.value.locationId
    if (filters.value.categoryId) params.categoryId = filters.value.categoryId
    if (filters.value.type) params.type = filters.value.type
    if (filters.value.minPrice !== undefined) params.minPrice = filters.value.minPrice
    if (filters.value.maxPrice !== undefined) params.maxPrice = filters.value.maxPrice
    if (filters.value.search) params.search = filters.value.search

    const response = await $fetch<{
      data: any[]
      total: number
      page: number
      pageSize: number
      totalPages: number
      hasNext: boolean
      hasPrev: boolean
    }>(`${API_BASE_URL}/marketplace/listings`, {
      query: params,
    })

    listings.value = response.data
    pagination.value = {
      page: response.page,
      pageSize: response.pageSize,
      total: response.total,
      totalPages: response.totalPages,
      hasNext: response.hasNext,
      hasPrev: response.hasPrev,
    }
  } catch (error) {
    console.error('Error fetching listings:', error)
  } finally {
    isLoading.value = false
  }
}

// Watch filters and reset page, then refetch (only for desktop, mobile uses apply button)
// On desktop, filters apply automatically. On mobile, user clicks "Appliquer"
const isMobile = ref(false)
onMounted(() => {
  isMobile.value = window.innerWidth < 1024 // lg breakpoint
  window.addEventListener('resize', () => {
    isMobile.value = window.innerWidth < 1024
  })
})

watch(
  () => filters.value,
  () => {
    // Only auto-apply on desktop (when filters are visible in sidebar)
    if (!isMobile.value) {
      pagination.value.page = 1
      fetchListings()
    }
  },
  { deep: true }
)

// Watch page changes and refetch (without resetting page)
watch(
  () => pagination.value.page,
  () => {
    fetchListings()
  }
)

// Apply filters (called from component)
const applyFilters = () => {
  pagination.value.page = 1
  fetchListings()
  isFiltersOpen.value = false // Close slideover on mobile
}

// Check if any filters are active
const hasActiveFilters = computed(() => {
  return !!(
    filters.value.locationId ||
    filters.value.categoryId ||
    filters.value.type ||
    filters.value.minPrice !== undefined ||
    filters.value.maxPrice !== undefined ||
    filters.value.search.trim() !== ''
  )
})

// Clear filters
const clearFilters = () => {
  filters.value = {
    locationId: undefined,
    categoryId: undefined,
    type: undefined,
    minPrice: undefined,
    maxPrice: undefined,
    search: '',
  }
  pagination.value.page = 1
  fetchListings()
  isFiltersOpen.value = false // Close slideover on mobile
}

// Initialize
onMounted(async () => {
  await Promise.all([fetchLocations(), fetchCategories(), fetchListings()])
})

// Get image URL
const getImageUrl = (listing: any) => {
  if (listing.images && listing.images.length > 0) {
    const imageUrl = listing.images[0]
    // If image is an external URL (starts with http), use it directly
    if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
      return imageUrl
    }
    // Otherwise, it's a local path, add the backend URL prefix
    return `http://localhost:3001${imageUrl}`
  }
  return null
}

// Get seller name
const getSellerName = (listing: any) => {
  if (listing.seller?.firstName || listing.seller?.lastName) {
    return `${listing.seller.firstName || ''} ${listing.seller.lastName || ''}`.trim()
  }
  return 'Anonyme'
}

// Get seller avatar URL
const getSellerAvatar = (listing: any) => {
  if (listing.seller?.avatarImage) {
    const avatarUrl = listing.seller.avatarImage
    if (avatarUrl.startsWith('http://') || avatarUrl.startsWith('https://')) {
      return avatarUrl
    }
    return `http://localhost:3001${avatarUrl}`
  }
  return null
}

// Get border class based on listing type
const getBorderClass = (type: string) => {
  if (type === 'service') {
    return 'border border-blue-400/30'
  }
  if (type === 'bien') {
    return 'border border-green-400/30'
  }
  return ''
}

// Get category color style - using inline styles with 0.5 opacity
const getCategoryColorStyle = (color: string | null | undefined) => {
  if (!color) return { backgroundColor: 'rgba(59, 130, 246, 0.5)' } // blue-500 as fallback
  
  // Map color names to Tailwind color values (RGBA) - 0.5 opacity
  const colorMap: Record<string, string> = {
    emerald: 'rgba(16, 185, 129, 0.5)', // emerald-500
    amber: 'rgba(245, 158, 11, 0.5)', // amber-500
    red: 'rgba(239, 68, 68, 0.5)', // red-500
    pink: 'rgba(236, 72, 153, 0.5)', // pink-500
    orange: 'rgba(249, 115, 22, 0.5)', // orange-500
    indigo: 'rgba(99, 102, 241, 0.5)', // indigo-500
    yellow: 'rgba(234, 179, 8, 0.5)', // yellow-500
    lime: 'rgba(132, 204, 22, 0.5)', // lime-500
    gray: 'rgba(107, 114, 128, 0.5)', // gray-500
    blue: 'rgba(59, 130, 246, 0.5)', // blue-500
    cyan: 'rgba(6, 182, 212, 0.5)', // cyan-500
    purple: 'rgba(168, 85, 247, 0.5)', // purple-500
    rose: 'rgba(244, 63, 94, 0.5)', // rose-500
    green: 'rgba(34, 197, 94, 0.5)', // green-500
    teal: 'rgba(20, 184, 166, 0.5)', // teal-500
    violet: 'rgba(139, 92, 246, 0.5)', // violet-500
    fuchsia: 'rgba(217, 70, 239, 0.5)', // fuchsia-500
    slate: 'rgba(100, 116, 139, 0.5)', // slate-500
  }
  
  return { backgroundColor: colorMap[color] || 'rgba(59, 130, 246, 0.5)' }
}
</script>

<template>
  <div class="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
    <!-- Header -->
    <div class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 class="text-3xl font-bold">Marketplace</h1>
        <p class="text-white/60">Découvrez les biens et services disponibles</p>
      </div>
      <div class="flex items-center gap-2">
        <!-- View mode toggle (hidden on mobile) -->
        <div class="hidden sm:flex rounded-lg border border-white/20 p-1">
          <UButton
            :variant="viewMode === 'list' ? 'solid' : 'ghost'"
            size="sm"
            icon="i-heroicons-bars-3"
            @click="viewMode = 'list'"
          />
          <UButton
            :variant="viewMode === 'grid' ? 'solid' : 'ghost'"
            size="sm"
            icon="i-heroicons-squares-2x2"
            @click="viewMode = 'grid'"
          />
        </div>
        <UButton
          v-if="authStore.isAuthenticated"
          to="/marketplace/create"
          color="primary"
          icon="i-heroicons-plus-circle"
        >
          <span class="hidden sm:inline">Créer une annonce</span>
          <span class="sm:hidden">Créer</span>
        </UButton>
      </div>
    </div>

    <!-- Filters Button (Mobile) with Slideover -->
    <div class="mb-4 flex gap-2">
      <USlideover v-model:open="isFiltersOpen" title="Filtres" side="left">
        <UButton
          icon="i-heroicons-funnel"
          color="neutral"
          variant="outline"
        >
          Filtres
        </UButton>

        <template #body>
          <MarketplaceFilters
            :locations="locations"
            :categories="categories"
            :filters="filters"
            @update:filters="(newFilters) => { filters.locationId = newFilters.locationId; filters.categoryId = newFilters.categoryId; filters.type = newFilters.type; filters.minPrice = newFilters.minPrice; filters.maxPrice = newFilters.maxPrice; filters.search = newFilters.search; }"
            @apply="applyFilters"
            @clear="clearFilters"
          />
        </template>
      </USlideover>
      
      <!-- Reset Filters Button (only shown when filters are active) -->
      <UButton
        v-if="hasActiveFilters"
        icon="i-heroicons-x-circle"
        color="neutral"
        variant="outline"
        @click="clearFilters"
      >
        Réinitialiser
      </UButton>
    </div>

    

    <!-- Results -->
    <div v-if="isLoading" class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <UCard v-for="i in 6" :key="i">
        <div class="h-48 animate-pulse rounded-lg bg-white/10" />
      </UCard>
    </div>

    <div v-else-if="listings.length > 0">
      <!-- List View (default on mobile) -->
      <div v-if="viewMode === 'list'" class="space-y-4">
        <UCard
          v-for="listing in listings"
          :key="listing.id"
          :class="['cursor-pointer transition-transform hover:scale-[1.02]', getBorderClass(listing.type)]"
          @click="navigateTo(`/marketplace/${listing.id}`)"
        >
          <div class="flex gap-4">
            <!-- Image -->
            <div class="relative aspect-square w-32 shrink-0 overflow-hidden rounded-lg">
              <img
                v-if="getImageUrl(listing)"
                :src="getImageUrl(listing)"
                :alt="listing.title"
                class="h-full w-full object-cover"
              />
              <div v-else class="flex h-full items-center justify-center bg-white/10">
                <UIcon name="i-heroicons-photo" class="h-12 w-12 text-white/40" />
              </div>
              <!-- Category label floating -->
              <div
                v-if="listing.category?.name"
                :style="getCategoryColorStyle(listing.category.color)"
                class="absolute top-2 left-2 rounded-full px-3 py-1 text-xs font-semibold text-white backdrop-blur-sm"
              >
                <span class="flex items-center gap-1.5">
                  <span>{{ listing.category.name }}</span>
                </span>
              </div>
            </div>
            <!-- Content - 75% left, 25% right -->
            <div class="flex flex-1 gap-4 h-32">
              <!-- Left side (75%) -->
              <div class="flex-[3] flex flex-col justify-between min-w-0">
                <div class="flex-1 flex flex-col min-w-0">
                  <h3 class="text-lg font-semibold line-clamp-1 mb-1">{{ listing.title }}</h3>
                  <p class="line-clamp-2 text-sm text-white/70 flex-1">{{ listing.description }}</p>
                </div>
                <!-- Location and Date at bottom -->
                <div class="flex items-center justify-between gap-4 text-xs text-white/60 mt-auto">
                  <span class="flex items-center gap-1">
                    <span class="text-red-500">📍</span>
                    {{ listing.location?.commune }}, {{ listing.location?.ile }}
                  </span>
                  <span v-if="listing.createdAt" class="flex items-center gap-1">
                    <UIcon name="i-heroicons-calendar" class="h-3.5 w-3.5 text-white/40" />
                    {{ fromNow(listing.createdAt) }}
                  </span>
                </div>
              </div>
              <!-- Right side (25%) -->
              <div class="flex-[1] flex flex-col justify-between items-end">
                <!-- Seller info at top -->
                <div class="flex items-center gap-2">
                  <UAvatar
                    v-if="getSellerAvatar(listing)"
                    :src="getSellerAvatar(listing)"
                    :alt="getSellerName(listing)"
                    size="sm"
                  />
                  <UAvatar
                    v-else
                    :alt="getSellerName(listing)"
                    size="sm"
                  />
                  <span class="text-sm text-white/80">{{ getSellerName(listing) }}</span>
                </div>
                <!-- Price at bottom -->
                <div class="flex flex-col items-end gap-1 mt-auto">
                  <div class="flex items-center gap-1 text-primary-500">
                    <span class="text-xl">🐚</span>
                    <span class="font-bold">{{ listing.price }}</span>
                  </div>
                  <span v-if="listing.priceUnit" class="text-xs font-medium text-white/70">{{ listing.priceUnit }}</span>
                </div>
              </div>
            </div>
          </div>
        </UCard>
      </div>

      <!-- Grid View -->
      <div v-else class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <UCard
          v-for="listing in listings"
          :key="listing.id"
          :class="['cursor-pointer transition-transform hover:scale-105', getBorderClass(listing.type)]"
          @click="navigateTo(`/marketplace/${listing.id}`)"
        >
          <template #header>
            <div class="relative aspect-square w-full overflow-hidden rounded-lg">
              <img
                v-if="getImageUrl(listing)"
                :src="getImageUrl(listing)"
                :alt="listing.title"
                class="h-full w-full object-cover"
              />
              <div v-else class="flex h-full items-center justify-center bg-white/10">
                <UIcon name="i-heroicons-photo" class="h-12 w-12 text-white/40" />
              </div>
              <!-- Category label floating -->
              <div
                v-if="listing.category?.name"
                :style="getCategoryColorStyle(listing.category.color)"
                class="absolute top-2 left-2 rounded-full px-3 py-1 text-xs font-semibold text-white backdrop-blur-sm"
              >
                <span class="flex items-center gap-1.5">
                  <span>{{ listing.category.name }}</span>
                </span>
              </div>
            </div>
          </template>
          <div class="space-y-2">
            <h3 class="font-semibold line-clamp-2">{{ listing.title }}</h3>
            <p class="line-clamp-2 text-sm text-white/70">{{ listing.description }}</p>
            <!-- Seller and Price on same line -->
            <div class="flex items-center justify-between gap-4">
              <!-- Seller info -->
              <div class="flex items-center gap-2">
                <UAvatar
                  v-if="getSellerAvatar(listing)"
                  :src="getSellerAvatar(listing)"
                  :alt="getSellerName(listing)"
                  size="sm"
                />
                <UAvatar
                  v-else
                  :alt="getSellerName(listing)"
                  size="sm"
                />
                <span class="text-sm text-white/80">{{ getSellerName(listing) }}</span>
              </div>
              <div class="flex flex-col items-end gap-1">
                <div class="flex items-center gap-2 text-primary-500">
                  <span class="text-xl">🐚</span>
                  <span class="font-bold">{{ listing.price }}</span>
                </div>
                <span v-if="listing.priceUnit" class="text-xs font-medium text-white/70">{{ listing.priceUnit }}</span>
              </div>
            </div>
            <!-- Location and Date on same line -->
            <div class="flex items-center justify-between gap-4 text-xs text-white/60">
              <span class="flex items-center gap-1">
                <span class="text-red-500">📍</span>
                {{ listing.location?.commune }}, {{ listing.location?.ile }}
              </span>
              <span v-if="listing.createdAt" class="flex items-center gap-1">
                <UIcon name="i-heroicons-calendar" class="h-3.5 w-3.5 text-white/40" />
                {{ fromNow(listing.createdAt) }}
              </span>
            </div>
          </div>
        </UCard>
      </div>

      <!-- Pagination -->
      <div v-if="pagination.totalPages > 1" class="mt-6 flex items-center justify-center gap-2">
        <UButton
          :disabled="!pagination.hasPrev"
          variant="outline"
          icon="i-heroicons-chevron-left"
          @click="pagination.page--"
        >
          Précédent
        </UButton>
        <span class="text-sm text-white/60">
          Page {{ pagination.page }} sur {{ pagination.totalPages }}
        </span>
        <UButton
          :disabled="!pagination.hasNext"
          variant="outline"
          trailing-icon="i-heroicons-chevron-right"
          @click="pagination.page++"
        >
          Suivant
        </UButton>
      </div>
    </div>

    <div v-else class="py-12 text-center text-white/60">
      <UIcon name="i-heroicons-inbox" class="mx-auto mb-4 h-12 w-12" />
      <p>Aucune annonce trouvée</p>
      <UButton
        v-if="authStore.isAuthenticated"
        to="/marketplace/create"
        color="primary"
        class="mt-4"
      >
        Créer la première annonce
      </UButton>
    </div>

  </div>
</template>
