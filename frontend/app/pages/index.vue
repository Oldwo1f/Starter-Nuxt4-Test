<script setup lang="ts">
import { useAuthStore } from '~/stores/useAuthStore'

definePageMeta({
  layout: 'default',
})

const API_BASE_URL = 'http://localhost:3001'
const { appName } = useAppInfo()
const authStore = useAuthStore()

// Helper function to format image URL
const getImageUrl = (imagePath: string | null | undefined) => {
  if (!imagePath) return null
  // If image is an external URL (starts with http), use it directly
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    return imagePath
  }
  // Otherwise, it's a local path, add the backend URL prefix
  return `http://localhost:3001${imagePath}`
}

// Stats
const stats = ref({
  listings: 0,
  members: 0,
  transactions: 0,
})

// Featured listings
const featuredListings = ref<any[]>([])
const isLoading = ref(false)

// Fetch stats and featured listings
onMounted(async () => {
  isLoading.value = true
  try {
    // Get featured listings (latest 6)
    const listingsResponse = await $fetch<{
      data: any[]
      total: number
    }>(`${API_BASE_URL}/marketplace/listings`, {
      query: {
        page: 1,
        pageSize: 6,
      },
    })
    featuredListings.value = listingsResponse.data
    stats.value.listings = listingsResponse.total
  } catch (error) {
    console.error('Error fetching data:', error)
  } finally {
    isLoading.value = false
  }
})
</script>

<template>
  <div class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
    <!-- Hero Section -->
    <div class="mb-12 text-center">
      <h1 class="mb-4 text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
        Bienvenue sur {{ appName }}
      </h1>
      <p class="mx-auto max-w-2xl text-lg text-white/70">
        La marketplace de troc pour la communauté Nuna'a Heritage en Polynésie française.
        Échangez des biens et services avec la monnaie virtuelle Coquillage 🐚
      </p>
      <div class="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
        <UButton
          to="/marketplace"
          size="xl"
          color="primary"
          icon="i-heroicons-shopping-bag"
        >
          Découvrir la marketplace
        </UButton>
        <UButton
          v-if="!authStore.isAuthenticated"
          to="/register"
          size="xl"
          variant="outline"
          icon="i-heroicons-user-plus"
        >
          S'inscrire
        </UButton>
        <UButton
          v-else
          to="/marketplace/create"
          size="xl"
          variant="outline"
          icon="i-heroicons-plus-circle"
        >
          Créer une annonce
        </UButton>
      </div>
    </div>

    <!-- Stats Section -->
    <div class="mb-12 grid grid-cols-1 gap-6 sm:grid-cols-3">
      <UCard>
        <div class="flex items-center gap-4">
          <div class="rounded-full bg-primary-500/20 p-3">
            <UIcon name="i-heroicons-shopping-bag" class="h-6 w-6 text-primary-500" />
          </div>
          <div>
            <div class="text-2xl font-bold">{{ stats.listings }}</div>
            <div class="text-sm text-white/60">Annonces actives</div>
          </div>
        </div>
      </UCard>
      <UCard>
        <div class="flex items-center gap-4">
          <div class="rounded-full bg-primary-500/20 p-3">
            <UIcon name="i-heroicons-users" class="h-6 w-6 text-primary-500" />
          </div>
          <div>
            <div class="text-2xl font-bold">{{ stats.members }}</div>
            <div class="text-sm text-white/60">Membres</div>
          </div>
        </div>
      </UCard>
      <UCard>
        <div class="flex items-center gap-4">
          <div class="rounded-full bg-primary-500/20 p-3">
            <UIcon name="i-heroicons-arrow-path" class="h-6 w-6 text-primary-500" />
          </div>
          <div>
            <div class="text-2xl font-bold">{{ stats.transactions }}</div>
            <div class="text-sm text-white/60">Échanges réalisés</div>
          </div>
        </div>
      </UCard>
    </div>

    <!-- Featured Listings -->
    <div class="mb-12">
      <div class="mb-6 flex items-center justify-between">
        <h2 class="text-2xl font-bold">Annonces récentes</h2>
        <UButton to="/marketplace" variant="ghost" icon="i-heroicons-arrow-right">
          Voir tout
        </UButton>
      </div>
      <div v-if="isLoading" class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <UCard v-for="i in 6" :key="i">
          <div class="h-48 animate-pulse rounded-lg bg-white/10" />
        </UCard>
      </div>
      <div v-else-if="featuredListings.length > 0" class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <UCard
          v-for="listing in featuredListings"
          :key="listing.id"
          class="cursor-pointer transition-transform hover:scale-105"
          @click="navigateTo(`/marketplace/${listing.id}`)"
        >
          <template #header>
            <div class="relative aspect-square w-full overflow-hidden rounded-lg">
              <img
                v-if="listing.images && listing.images.length > 0"
                :src="getImageUrl(listing.images[0])"
                :alt="listing.title"
                class="h-full w-full object-cover"
              />
              <div v-else class="flex h-full items-center justify-center bg-white/10">
                <UIcon name="i-heroicons-photo" class="h-12 w-12 text-white/40" />
              </div>
            </div>
          </template>
          <div class="space-y-2">
            <h3 class="font-semibold line-clamp-2">{{ listing.title }}</h3>
            <div class="flex items-center gap-2 text-primary-500">
              <span class="text-xl">🐚</span>
              <span class="font-bold">{{ listing.price }}</span>
              <span class="text-sm text-white/60">coquillages</span>
            </div>
            <div class="text-sm text-white/60">
              {{ listing.location?.commune }}, {{ listing.location?.ile }}
            </div>
          </div>
        </UCard>
      </div>
      <div v-else class="text-center text-white/60">
        Aucune annonce pour le moment
      </div>
    </div>

    <!-- How it works CTA -->
    <UCard class="bg-gradient-to-r from-primary-500/20 to-primary-600/20">
      <div class="text-center">
        <h2 class="mb-4 text-2xl font-bold">Comment ça marche ?</h2>
        <p class="mb-6 text-white/80">
          Découvrez comment utiliser la marketplace de troc et la monnaie virtuelle Coquillage
        </p>
        <UButton to="/how-it-works" size="lg" color="primary" icon="i-heroicons-question-mark-circle">
          En savoir plus
        </UButton>
      </div>
    </UCard>
  </div>
</template>
