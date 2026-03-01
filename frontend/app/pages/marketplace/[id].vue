<script setup lang="ts">
import { useAuthStore } from '~/stores/useAuthStore'
import { useWalletStore } from '~/stores/useWalletStore'
import { useDate } from '~/composables/useDate'
import { useProfileValidation } from '~/composables/useProfileValidation'

definePageMeta({
  layout: 'marketplace',
  middleware: 'auth',
})

const route = useRoute()
const { apiBaseUrl } = useApi()
const authStore = useAuthStore()
const walletStore = useWalletStore()
const { fromNow } = useDate()
const { isProfileComplete } = useProfileValidation()

const listingId = computed(() => parseInt(route.params.id as string, 10))
const listing = ref<any>(null)
const isLoading = ref(false)
const error = ref<string | null>(null)
const currentImageIndex = ref(0)
const isContactModalOpen = ref(false)

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

// Contact seller handler - Open contact modal
const handleContactSeller = () => {
  isContactModalOpen.value = true
}

// Get available contact methods in user-defined order
const availableContactMethods = computed(() => {
  if (!listing.value?.seller) return []
  
  const seller = listing.value.seller
  const order = seller.contactPreferences?.order || ['phone', 'messenger', 'telegram', 'whatsapp']
  const accounts = seller.contactPreferences?.accounts || {}
  
  return order
    .map((method: string) => {
      // Check if method has a value
      let hasValue = false
      let value = ''
      let actionUrl = ''
      
      if (method === 'phone') {
        hasValue = !!(seller.phoneNumber && seller.phoneNumber.trim())
        value = seller.phoneNumber || ''
        actionUrl = hasValue ? `tel:${value}` : ''
      } else if (method === 'messenger') {
        hasValue = !!(accounts.messenger && accounts.messenger.trim())
        value = accounts.messenger || ''
        actionUrl = hasValue ? `https://m.me/${value.replace(/^@/, '')}` : ''
      } else if (method === 'telegram') {
        hasValue = !!(accounts.telegram && accounts.telegram.trim())
        value = accounts.telegram || ''
        actionUrl = hasValue ? `https://t.me/${value.replace(/^@/, '')}` : ''
      } else if (method === 'whatsapp') {
        hasValue = !!(accounts.whatsapp && accounts.whatsapp.trim())
        value = accounts.whatsapp || ''
        // Format phone number for WhatsApp (remove spaces and special chars)
        const phoneNumber = value.replace(/[^\d+]/g, '')
        actionUrl = hasValue ? `https://wa.me/${phoneNumber}` : ''
      }
      
      return hasValue ? { method, value, actionUrl } : null
    })
    .filter((item: { method: string; value: string; actionUrl: string } | null): item is { method: string; value: string; actionUrl: string } => item !== null)
})

// Get contact method label
const getContactMethodLabel = (method: string) => {
  const labels: Record<string, string> = {
    phone: 'Téléphone',
    messenger: 'Messenger',
    telegram: 'Telegram',
    whatsapp: 'WhatsApp',
  }
  return labels[method] || method
}

// Get contact method icon
const getContactMethodIcon = (method: string) => {
  const icons: Record<string, string> = {
    phone: 'i-heroicons-phone',
    messenger: 'i-heroicons-chat-bubble-left-right',
    telegram: 'i-heroicons-paper-airplane',
    whatsapp: 'i-heroicons-chat-bubble-oval-left',
  }
  return icons[method] || 'i-heroicons-circle-stack'
}

// Trading tags avec icônes (même structure que dans profile.vue)
const tradingTags = [
  { id: 'poisson', type: 'product', label: 'Poisson', icon: 'ph:fish-simple-fill' },
  { id: 'fruit', type: 'product', label: 'Fruit', icon: 'streamline-ultimate:fruit-banana-bold' },
  { id: 'legumes', type: 'product', label: 'Légumes', icon: 'fluent:food-carrot-20-regular' },
  { id: 'maa', type: 'product', label: 'Maa', icon: 'streamline:food-pizza-drink-cook-fast-cooking-nutrition-pizza-food' },
  { id: 'seefood', type: 'product', label: 'Produit de la mer', icon: 'maki:restaurant-seafood' },
  { id: 'electronique', type: 'product', label: 'Électronique', icon: 'i-material-symbols-devices-outline' },
  { id: 'jouet-vetement-bebe', type: 'product', label: 'Jouet/Vêtement bébé', icon: 'streamline:shopping-catergories-baby-botlle-bottle-milk-family-children-formula-care-child-kid-baby' },
  { id: 'jouet-vetement-enfants', type: 'product', label: 'Jouet/Vêtement enfants', icon: 'fa7-solid:children' },
  { id: 'service-jardin', type: 'service', label: 'Service jardin', icon: 'ph:tree-duotone' },
  { id: 'service-batiment', type: 'service', label: 'Service bâtiment', icon: 'material-symbols:tools-power-drill-outline-sharp' },
  { id: 'service-transport', type: 'service', label: 'Service transport', icon: 'i-material-symbols-local-shipping-outline' },
  { id: 'service-informatique', type: 'service', label: 'Service informatique', icon: 'i-material-symbols-computer-outline' },
]

// Get trading tag info
const getTradingTag = (tagId: string) => {
  return tradingTags.find(t => t.id === tagId)
}

// Handle contact action
const handleContactAction = (method: string, value: string, actionUrl: string) => {
  if (method === 'phone') {
    // For phone, open tel: link
    window.location.href = actionUrl
  } else {
    // For other methods, open the URL
    window.open(actionUrl, '_blank')
  }
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
    <ProfileIncompleteBanner />
    
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
          <!-- Images Gallery (hidden for "Je recherche" listings) -->
          <UCard v-if="!listing.isSearching">
            <div v-if="imageUrls.length > 0" class="space-y-4">
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
                    currentImageIndex === Number(index) ? 'border-primary-500' : 'border-transparent opacity-60 hover:opacity-100'
                  ]"
                  @click="currentImageIndex = Number(index)"
                >
                  <img :src="url" :alt="`Image ${Number(index) + 1}`" class="h-full w-full object-cover" />
                </button>
              </div>
            </div>
            <!-- No images fallback -->
            <div v-else class="space-y-4">
              <div class="relative aspect-square w-full overflow-hidden rounded-lg bg-white/10 flex items-center justify-center">
                <UIcon name="i-heroicons-photo" class="h-24 w-24 text-white/40" />
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
          <!-- Price card (hidden for "Je recherche" listings) -->
          <UCard v-if="!listing.isSearching">
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
          
          <!-- "Je recherche" badge -->
          <UCard v-if="listing.isSearching" class="border-2 border-orange-400/50">
            <template #header>
              <h2 class="text-xl font-semibold flex items-center gap-2">
                <UIcon name="i-heroicons-magnifying-glass" class="search-icon-small text-orange-400" />
                Je recherche
              </h2>
            </template>
            <div class="text-sm text-white/80">
              Cette annonce exprime un besoin. Contactez le troqueur pour lui proposer votre offre.
            </div>
          </UCard>

          <!-- Seller info -->
          <UCard>
            <template #header>
              <h2 class="text-xl font-semibold">Troqueur</h2>
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
              
              <!-- Trading preferences tags -->
              <div v-if="listing.seller?.tradingPreferences && listing.seller.tradingPreferences.length > 0" class="pt-2 border-t border-white/10">
                <p class="mb-2 text-xs font-medium text-white/60">Préférences de troc</p>
                <div class="flex flex-wrap gap-1.5">
                  <UBadge
                    v-for="tagId in listing.seller.tradingPreferences"
                    :key="tagId"
                    color="primary"
                    variant="soft"
                    size="sm"
                  >
                    <UIcon 
                      :name="getTradingTag(tagId)?.icon || 'i-heroicons-tag'" 
                      class="mr-1 h-3 w-3"
                    />
                    {{ getTradingTag(tagId)?.label || tagId }}
                  </UBadge>
                </div>
              </div>
              <div v-if="authStore.isAuthenticated && authStore.user?.id !== listing.sellerId" class="space-y-2">
                <UButton
                  color="primary"
                  block
                  icon="i-heroicons-chat-bubble-left-right"
                  @click="handleContactSeller"
                >
                  Contacter le troqueur
                </UButton>
                <UButton
                  variant="outline"
                  block
                  icon="i-heroicons-arrow-path"
                  :disabled="!isProfileComplete"
                  @click="handleTransferPupu"
                >
                  Transférer des Pūpū à ce troqueur
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

    <!-- Contact Modal -->
    <UModal v-model:open="isContactModalOpen" :ui="{ wrapper: 'max-w-md' }">
      <template #header>
        <div class="flex items-center justify-between w-full">
          <div class="flex items-center gap-2">
            <UIcon name="i-heroicons-chat-bubble-left-right" class="w-5 h-5" />
            <span class="font-medium">Contacter le troqueur</span>
          </div>
          <UButton
            color="neutral"
            variant="ghost"
            icon="i-heroicons-x-mark"
            class="ml-auto"
            @click="isContactModalOpen = false"
          />
        </div>
      </template>

      <template #body>
        <div class="p-6 space-y-3">
          <div v-if="availableContactMethods.length === 0" class="text-center py-4">
            <p class="text-white/60">Aucun moyen de contact disponible</p>
          </div>
          <div v-else class="space-y-2">
            <div
              v-for="contact in availableContactMethods"
              :key="contact.method"
              class="flex items-center gap-3 rounded-lg border border-white/10 bg-white/5 p-3 hover:bg-white/10 transition-colors cursor-pointer"
              @click="handleContactAction(contact.method, contact.value, contact.actionUrl)"
            >
              <UIcon :name="getContactMethodIcon(contact.method)" class="w-5 h-5 text-primary-500 shrink-0" />
              <div class="flex-1 min-w-0">
                <div class="text-sm font-medium text-white/90">
                  {{ getContactMethodLabel(contact.method) }}
                </div>
                <div class="text-sm text-white/60 truncate">
                  {{ contact.value }}
                </div>
              </div>
              <UIcon name="i-heroicons-arrow-top-right-on-square" class="w-4 h-4 text-white/40 shrink-0" />
            </div>
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>

<style scoped>
:deep(.i-heroicons\:magnifying-glass) {
  width: 4em !important;
  height: 4em !important;
}

:deep(.search-icon-small.i-heroicons\:magnifying-glass) {
  width: 2em !important;
  height: 2em !important;
}
</style>
