<script setup lang="ts">
import { useAuthStore } from '~/stores/useAuthStore'
import { useMarketplaceStore } from '~/stores/useMarketplaceStore'

definePageMeta({
  layout: 'default',
  middleware: 'auth',
})

const marketplaceStore = useMarketplaceStore()
const authStore = useAuthStore()

// Helper function to format image URL
const { getImageUrl: getImageUrlHelper } = useApi()
const getImageUrl = (imagePath: string | null | undefined) => {
  if (!imagePath) return null
  return getImageUrlHelper(imagePath)
}

// Filters
const statusFilter = ref<'all' | 'active' | 'sold' | 'archived'>('all')

// Fetch user listings
const fetchMyListings = async () => {
  const filters: any = {
    sellerId: authStore.user?.id,
  }
  if (statusFilter.value !== 'all') {
    filters.status = statusFilter.value
  }
  await marketplaceStore.fetchListings(1, 50, filters)
}

// Delete listing
const handleDelete = async (id: number) => {
  if (!confirm('Êtes-vous sûr de vouloir supprimer cette annonce ?')) {
    return
  }
  const result = await marketplaceStore.deleteListing(id)
  if (result.success) {
    await fetchMyListings()
  } else {
    alert(result.error || 'Erreur lors de la suppression')
  }
}

// Watch filter
watch(statusFilter, () => {
  fetchMyListings()
})

onMounted(() => {
  fetchMyListings()
})
</script>

<template>
  <div class="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
    <div class="mb-6">
      <h1 class="text-3xl font-bold">Mes annonces</h1>
      <p class="text-white/60">Gérez vos annonces publiées</p>
    </div>

    <!-- Filter -->
    <UCard class="mb-6">
      <div class="flex flex-wrap gap-2">
        <UButton
          :variant="statusFilter === 'all' ? 'solid' : 'outline'"
          @click="statusFilter = 'all'"
        >
          Toutes
        </UButton>
        <UButton
          :variant="statusFilter === 'active' ? 'solid' : 'outline'"
          @click="statusFilter = 'active'"
        >
          Actives
        </UButton>
        <UButton
          :variant="statusFilter === 'sold' ? 'solid' : 'outline'"
          @click="statusFilter = 'sold'"
        >
          Vendues
        </UButton>
        <UButton
          :variant="statusFilter === 'archived' ? 'solid' : 'outline'"
          @click="statusFilter = 'archived'"
        >
          Archivées
        </UButton>
      </div>
    </UCard>

    <!-- Listings -->
    <div v-if="marketplaceStore.isLoading" class="text-center">
      <div class="inline-block h-8 w-8 animate-spin rounded-full border-4 border-primary-500 border-t-transparent" />
    </div>

    <div v-else-if="marketplaceStore.listings.length > 0" class="space-y-4">
      <UCard
        v-for="listing in marketplaceStore.listings"
        :key="listing.id"
        class="transition-transform hover:scale-[1.02]"
      >
        <div class="flex flex-col gap-4 sm:flex-row">
          <!-- Image -->
          <div class="aspect-square w-full shrink-0 overflow-hidden rounded-lg sm:w-32">
            <img
              v-if="listing.images && listing.images.length > 0"
              :src="getImageUrl(listing.images[0])"
              :alt="listing.title"
              class="h-full w-full object-cover"
            />
            <div v-else class="flex h-full items-center justify-center bg-white/10">
              <UIcon name="i-heroicons-photo" class="h-8 w-8 text-white/40" />
            </div>
          </div>

          <!-- Content -->
          <div class="flex-1 space-y-2">
            <div class="flex items-start justify-between gap-2">
              <div class="flex-1">
                <h3 class="text-lg font-semibold">{{ listing.title }}</h3>
                <div class="mt-1 flex flex-wrap items-center gap-2 text-sm text-white/60">
                  <span>{{ listing.location?.commune }}, {{ listing.location?.ile }}</span>
                  <span>•</span>
                  <span>{{ listing.category?.name }}</span>
                  <span>•</span>
                  <span>{{ listing.viewCount }} vues</span>
                </div>
              </div>
              <div class="flex shrink-0 flex-col items-end gap-1 text-primary-500">
                <div class="flex items-center gap-1">
                  <span class="text-xl">🐚</span>
                  <span class="font-bold">{{ listing.price }}</span>
                </div>
                <span v-if="listing.priceUnit" class="text-xs text-white/60">{{ listing.priceUnit }}</span>
              </div>
            </div>

            <!-- Status badge -->
            <div class="flex items-center gap-2">
              <UBadge
                :color="listing.status === 'active' ? 'green' : listing.status === 'sold' ? 'red' : 'gray'"
                variant="subtle"
              >
                {{ listing.status === 'active' ? 'Active' : listing.status === 'sold' ? 'Vendue' : 'Archivée' }}
              </UBadge>
            </div>

            <!-- Actions -->
            <div class="flex flex-wrap gap-2">
              <UButton
                :to="`/marketplace/${listing.id}`"
                variant="outline"
                size="sm"
                icon="i-heroicons-eye"
              >
                Voir
              </UButton>
              <UButton
                v-if="listing.status === 'active'"
                :to="`/marketplace/edit/${listing.id}`"
                variant="outline"
                size="sm"
                icon="i-heroicons-pencil"
              >
                Modifier
              </UButton>
              <UButton
                variant="outline"
                size="sm"
                color="red"
                icon="i-heroicons-trash"
                @click="handleDelete(listing.id)"
              >
                Supprimer
              </UButton>
            </div>
          </div>
        </div>
      </UCard>
    </div>

    <div v-else class="py-12 text-center text-white/60">
      <UIcon name="i-heroicons-inbox" class="mx-auto mb-4 h-12 w-12" />
      <p>Aucune annonce trouvée</p>
      <UButton to="/marketplace/create" color="primary" class="mt-4">
        Créer une annonce
      </UButton>
    </div>
  </div>
</template>
