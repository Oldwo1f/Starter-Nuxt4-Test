<script setup lang="ts">
import { useAuthStore } from '~/stores/useAuthStore'
import { useWalletStore } from '~/stores/useWalletStore'
import { useDate } from '~/composables/useDate'

definePageMeta({
  layout: 'marketplace',
  middleware: 'auth',
})

const route = useRoute()
const { apiBaseUrl } = useApi()
const authStore = useAuthStore()
const walletStore = useWalletStore()
const { fromNow } = useDate()

const listingId = computed(() => parseInt(route.params.id as string, 10))
const listing = ref<any>(null)
const isLoading = ref(false)
const error = ref<string | null>(null)
const currentImageIndex = ref(0)

// Fetch listing
const fetchListing = async () => {
  isLoading.value = true
  error.value = null
  try {
    const data = await $fetch(`${apiBaseUrl}/marketplace/listings/${listingId.value}`)
    listing.value = data
  } catch (err: any) {
    error.value = err.data?.message || err.message || 'Erreur lors du chargement de l\'annonce'
  } finally {
    isLoading.value = false
  }
}

// Contact seller handler (to be implemented - Messenger integration)
const handleContactSeller = () => {
  // TODO: Implement Messenger conversation opening
  alert('Fonctionnalité de contact à venir - Intégration Messenger')
}

// Transfer Pūpū handler
const handleTransferPupu = () => {
  const router = useRouter()
  // Redirect to transfer page with pre-filled data
  router.push({
    path: '/account/wallet/transfer',
    query: {
      toUserId: listing.value?.sellerId,
      toUserEmail: listing.value?.seller?.email,
      amount: listing.value?.price,
      description: listing.value?.title,
    },
  })
}

// Get image URLs
const imageUrls = computed(() => {
  if (!listing.value?.images || listing.value.images.length === 0) return []
  return listing.value.images.map((img: string) => {
    // If image is an external URL (starts with http), use it directly
    if (img.startsWith('http://') || img.startsWith('https://')) {
      return img
    }
    // Otherwise, it's a local path, add the backend URL prefix
    return `${apiBaseUrl}${img}`
  })
})

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

onMounted(() => {
  fetchListing()
})
</script>

<template>
  <div class="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
    <div v-if="isLoading" class="text-center">
      <div class="inline-block h-8 w-8 animate-spin rounded-full border-4 border-primary-500 border-t-transparent" />
    </div>

    <div v-else-if="error" class="text-center text-red-500">
      <p>{{ error }}</p>
      <UButton to="/marketplace" class="mt-4">Retour à la marketplace</UButton>
    </div>

    <div v-else-if="listing" class="space-y-6">
      <!-- Back button -->
      <UButton to="/marketplace" variant="ghost" icon="i-heroicons-arrow-left">
        Retour
      </UButton>

      <!-- Main content -->
      <div class="grid gap-6 lg:grid-cols-3">
        <!-- Left column (2/3) -->
        <div class="lg:col-span-2 space-y-6">
          <!-- Images Gallery -->
          <UCard v-if="imageUrls.length > 0">
            <div class="space-y-4">
              <!-- Main image -->
              <div class="relative aspect-square w-full overflow-hidden rounded-lg">
                <img
                  :src="imageUrls[currentImageIndex]"
                  :alt="listing.title"
                  class="h-full w-full object-cover"
                />
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
              <!-- Thumbnails -->
              <div v-if="imageUrls.length > 1" class="flex gap-2 overflow-x-auto">
                <button
                  v-for="(url, index) in imageUrls"
                  :key="index"
                  :class="[
                    'h-20 w-20 shrink-0 overflow-hidden rounded-lg border-2 transition-all',
                    currentImageIndex === index ? 'border-primary-500' : 'border-transparent opacity-60 hover:opacity-100'
                  ]"
                  @click="currentImageIndex = index"
                >
                  <img :src="url" :alt="`Image ${index + 1}`" class="h-full w-full object-cover" />
                </button>
              </div>
            </div>
          </UCard>

          <!-- Title and description -->
          <UCard>
            <div class="space-y-4">
              <div>
                <h1 class="mb-2 text-3xl font-bold">{{ listing.title }}</h1>
                <div class="flex items-center gap-4 text-sm text-white/60">
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
              <div class="pt-2">
                <p class="whitespace-pre-wrap text-white/80">{{ listing.description }}</p>
              </div>
            </div>
          </UCard>
        </div>

        <!-- Right column (1/3) - Sidebar -->
        <div class="space-y-6">
          <!-- Price card -->
          <UCard>
            <template #header>
              <h2 class="text-xl font-semibold">Valeur</h2>
            </template>
            <div class="flex flex-col gap-1">
              <div class="flex items-center gap-2 text-3xl font-bold text-primary-500">
                <span>🐚</span>
                <span>{{ listing.price }}</span>
                <span class="text-lg text-white/60">Pūpū</span>
              </div>
              <span v-if="listing.priceUnit" class="text-sm text-white/60">{{ listing.priceUnit }}</span>
            </div>
          </UCard>

          <!-- Seller info -->
          <UCard>
            <template #header>
              <h2 class="text-xl font-semibold">Vendeur</h2>
            </template>
            <div class="space-y-4">
              <div class="flex items-center gap-4">
                <UAvatar
                  v-if="listing.seller?.avatarImage"
                  :src="`${apiBaseUrl}${listing.seller.avatarImage}`"
                  :alt="listing.seller.email"
                  size="lg"
                />
                <UAvatar
                  v-else
                  :alt="listing.seller?.email"
                  :text="listing.seller?.email?.charAt(0).toUpperCase()"
                  size="lg"
                />
                <div>
                  <div class="font-semibold">
                    {{ listing.seller?.firstName || listing.seller?.lastName || listing.seller?.email }}
                  </div>
                  <div class="text-sm text-white/60">{{ listing.seller?.email }}</div>
                </div>
              </div>
              <div v-if="authStore.isAuthenticated && authStore.user?.id !== listing.sellerId" class="space-y-2">
                <UButton
                  color="primary"
                  block
                  icon="i-heroicons-chat-bubble-left-right"
                  @click="handleContactSeller"
                >
                  Contacter le vendeur
                </UButton>
                <UButton
                  variant="outline"
                  block
                  icon="i-heroicons-arrow-path"
                  @click="handleTransferPupu"
                >
                  Transférer des Pūpū à ce vendeur
                </UButton>
              </div>
              <div v-else-if="authStore.isAuthenticated && authStore.user?.id === listing.sellerId" class="text-center">
                <p class="text-sm text-white/60">C'est votre annonce</p>
                <UButton to="/account/listings" variant="outline" class="mt-2 w-full">
                  Gérer mes annonces
                </UButton>
              </div>
              <div v-else class="space-y-2">
                <UButton
                  to="/login"
                  color="primary"
                  block
                  icon="i-heroicons-lock-closed"
                >
                  Connectez-vous pour contacter
                </UButton>
              </div>
            </div>
          </UCard>
        </div>
      </div>
    </div>
  </div>
</template>
