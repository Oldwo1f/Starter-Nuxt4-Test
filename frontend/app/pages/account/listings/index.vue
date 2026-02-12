<script setup lang="ts">
import { useAuthStore } from '~/stores/useAuthStore'
import { useMarketplaceStore } from '~/stores/useMarketplaceStore'

definePageMeta({
  layout: 'account',
  middleware: 'auth',
})

const marketplaceStore = useMarketplaceStore()
const authStore = useAuthStore()
const toast = useToast()

// Helper function to format image URL
const { getImageUrl: getImageUrlHelper } = useApi()
const getImageUrl = (imagePath: string | null | undefined) => {
  if (!imagePath) return null
  return getImageUrlHelper(imagePath)
}

// Filters
const statusFilter = ref<'all' | 'active' | 'sold' | 'archived'>('all')

// Confirmation alert state
const confirmAlert = ref<{
  show: boolean
  title: string
  description: string
  onConfirm: () => void
}>({
  show: false,
  title: '',
  description: '',
  onConfirm: () => {},
})

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

// Computed filtered listings
// Filter locally based on statusFilter to handle immediate status changes
const displayedListings = computed(() => {
  if (statusFilter.value === 'all') {
    return marketplaceStore.listings
  }
  // Filter by status when a specific filter is active
  return marketplaceStore.listings.filter(listing => listing.status === statusFilter.value)
})

// Handle status change from ListingStatusChanger
const handleStatusChanged = (listingId: number, newStatus: 'active' | 'sold' | 'archived') => {
  // The store already updates the listing locally via updateListingStatus
  // The computed displayedListings will automatically filter it out if it doesn't match the current filter
  // No need to refetch - the computed handles the filtering reactively
  
  // If we're on a specific filter and the new status doesn't match, the card will disappear
  // automatically via the computed filter
  // If on "all" filter, the card stays with updated status
}

// Show confirmation alert
const showConfirm = (title: string, description: string, onConfirm: () => void) => {
  confirmAlert.value = {
    show: true,
    title,
    description,
    onConfirm,
  }
}

// Delete listing
const handleDelete = (id: number) => {
  showConfirm(
    'Supprimer l\'annonce',
    'Êtes-vous sûr de vouloir supprimer cette annonce ? Cette action est irréversible.',
    async () => {
      confirmAlert.value.show = false
      const result = await marketplaceStore.deleteListing(id)
      if (result.success) {
        toast.add({
          title: 'Annonce supprimée',
          description: 'Votre annonce a été supprimée avec succès.',
          color: 'green',
        })
        await fetchMyListings()
      } else {
        toast.add({
          title: 'Erreur',
          description: result.error || 'Erreur lors de la suppression',
          color: 'red',
        })
      }
    }
  )
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
  <div class="space-y-6">
    <!-- Confirmation Alert -->
    <UAlert
      v-if="confirmAlert.show"
      :title="confirmAlert.title"
      :description="confirmAlert.description"
      color="warning"
      variant="outline"
      icon="i-heroicons-exclamation-triangle"
      :actions="[
        {
          label: 'Annuler',
          color: 'neutral',
          variant: 'outline',
          onClick: () => { confirmAlert.show = false }
        },
        {
          label: 'Confirmer',
          color: 'error',
          onClick: confirmAlert.onConfirm
        }
      ]"
      class="mb-4"
    />

    <div class="flex items-start justify-between gap-4">
      <div class="space-y-2">
        <h1 class="text-3xl font-bold">Mes annonces</h1>
        <p class="text-white/60">Gérez vos annonces publiées</p>
      </div>
      <UButton
        to="/marketplace/create"
        color="primary"
        icon="i-heroicons-plus-circle"
      >
        Créer une annonce
      </UButton>
    </div>

    <!-- Filter -->
    <UCard class="bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10">
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
    <div v-if="marketplaceStore.isLoading" class="text-center py-12">
      <div class="inline-block h-8 w-8 animate-spin rounded-full border-4 border-primary-500 border-t-transparent" />
    </div>

    <div v-else-if="displayedListings.length > 0" class="space-y-4">
      <UCard
        v-for="listing in displayedListings"
        :key="listing.id"
        class="bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 transition-transform hover:scale-[1.01]"
      >
        <div class="flex flex-col gap-4 sm:flex-row">
          <!-- Image -->
          <div class="aspect-square w-full shrink-0 overflow-hidden rounded-lg sm:w-32">
            <img
              v-if="listing.images && listing.images.length > 0"
              :key="`${listing.id}-${listing.images[0]}`"
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
                  <span>•</span>
                  <span>{{ new Date(listing.createdAt).toLocaleDateString('fr-FR') }}</span>
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

            <!-- Status and Actions -->
            <div class="flex items-center justify-between gap-2">
              <ListingStatusChanger
                :listing-id="listing.id"
                :current-status="listing.status"
                size="sm"
                @status-changed="(newStatus) => handleStatusChanged(listing.id, newStatus)"
              />
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
                  :to="`/account/listings/edit/${listing.id}`"
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
