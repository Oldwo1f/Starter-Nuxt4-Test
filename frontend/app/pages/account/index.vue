<script setup lang="ts">
import { useAuthStore } from '~/stores/useAuthStore'
import { useWalletStore } from '~/stores/useWalletStore'
import { useMarketplaceStore } from '~/stores/useMarketplaceStore'

definePageMeta({
  layout: 'account',
  middleware: 'auth',
})

const authStore = useAuthStore()
const walletStore = useWalletStore()
const marketplaceStore = useMarketplaceStore()
const toast = useToast()

const API_BASE_URL = 'http://localhost:3001'

// Stats
const stats = ref({
  balance: 0,
  activeListings: 0,
  totalListings: 0,
  totalTransactions: 0,
  totalViews: 0,
})

// Recent data
const recentListings = ref<any[]>([])
const recentTransactions = ref<any[]>([])

const isLoading = ref(false)

// Fetch all data
const fetchData = async () => {
  if (!authStore.isAuthenticated || !authStore.user?.id) return

  isLoading.value = true
  try {
    // Fetch balance
    await walletStore.fetchBalance()
    stats.value.balance = walletStore.balance

    // Fetch user listings
    const listingsResult = await marketplaceStore.fetchListings(1, 50, {
      sellerId: authStore.user.id,
    })
    if (listingsResult.success && listingsResult.data) {
      const allListings = listingsResult.data.data || []
      stats.value.totalListings = listingsResult.data.total || 0
      stats.value.activeListings = allListings.filter(
        (l: any) => l.status === 'active'
      ).length
      stats.value.totalViews = allListings.reduce(
        (sum: number, l: any) => sum + (l.viewCount || 0),
        0
      )
      // Get 5 most recent
      recentListings.value = allListings
        .sort(
          (a: any, b: any) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )
        .slice(0, 5)
    }

    // Fetch transactions
    const transactionsResult = await walletStore.fetchTransactions(1, 5)
    if (transactionsResult.success && transactionsResult.data) {
      stats.value.totalTransactions = transactionsResult.data.total || 0
      recentTransactions.value = transactionsResult.data.data || []
    }
  } catch (error) {
    console.error('Error fetching dashboard data:', error)
    toast.add({
      title: 'Erreur',
      description: 'Impossible de charger les données du dashboard',
      color: 'red',
    })
  } finally {
    isLoading.value = false
  }
}

// Helper function to format image URL
const getImageUrl = (imagePath: string | null | undefined) => {
  if (!imagePath) return null
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    return imagePath
  }
  return `http://localhost:3001${imagePath}`
}

// Format date
const formatDate = (date: string) => {
  return new Date(date).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

onMounted(() => {
  fetchData()
})
</script>

<template>
  <div class="space-y-6">
    <div class="space-y-2">
      <h1 class="text-3xl font-bold">Dashboard</h1>
      <p class="text-white/60">Vue d'ensemble de votre activité</p>
    </div>

    <div v-if="isLoading" class="text-center py-12">
      <div class="inline-block h-8 w-8 animate-spin rounded-full border-4 border-primary-500 border-t-transparent" />
    </div>

    <div v-else class="space-y-6">
      <!-- Statistics Cards -->
      <div class="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <UCard class="bg-gradient-to-r from-primary-500/20 to-primary-600/20">
          <div class="text-center">
            <div class="mb-2 text-sm text-white/60">Solde Pūpū</div>
            <div class="mb-2 flex items-center justify-center gap-2 text-3xl font-bold text-primary-500">
              <span>🐚</span>
              <span>{{ Math.round(stats.balance) }}</span>
            </div>
            <UButton to="/account/wallet" variant="ghost" size="sm" class="mt-2">
              Voir le portefeuille
            </UButton>
          </div>
        </UCard>

        <UCard>
          <div class="text-center">
            <div class="mb-2 text-sm text-white/60">Annonces actives</div>
            <div class="text-3xl font-bold">{{ stats.activeListings }}</div>
            <div class="mt-1 text-xs text-white/60">
              sur {{ stats.totalListings }} total
            </div>
            <UButton to="/account/listings" variant="ghost" size="sm" class="mt-2">
              Mes annonces
            </UButton>
          </div>
        </UCard>

        <UCard>
          <div class="text-center">
            <div class="mb-2 text-sm text-white/60">Transactions</div>
            <div class="text-3xl font-bold">{{ stats.totalTransactions }}</div>
            <UButton to="/account/transactions" variant="ghost" size="sm" class="mt-2">
              Historique
            </UButton>
          </div>
        </UCard>

        <UCard>
          <div class="text-center">
            <div class="mb-2 text-sm text-white/60">Vues totales</div>
            <div class="text-3xl font-bold">{{ stats.totalViews }}</div>
            <div class="mt-1 text-xs text-white/60">sur toutes vos annonces</div>
          </div>
        </UCard>
      </div>

      <!-- Quick Actions -->
      <UCard>
        <template #header>
          <h2 class="text-xl font-semibold">Actions rapides</h2>
        </template>
        <div class="flex flex-wrap gap-3">
          <UButton to="/marketplace/create" color="primary" icon="i-heroicons-plus-circle">
            Créer une annonce
          </UButton>
          <UButton to="/account/wallet/transfer" color="primary" variant="outline" icon="i-heroicons-arrow-path">
            Transférer des Pūpū
          </UButton>
          <UButton to="/account/listings" variant="outline" icon="i-heroicons-rectangle-stack">
            Gérer mes annonces
          </UButton>
        </div>
      </UCard>

      <div class="grid gap-6 lg:grid-cols-2">
        <!-- Recent Listings -->
        <UCard>
          <template #header>
            <div class="flex items-center justify-between">
              <h2 class="text-xl font-semibold">Annonces récentes</h2>
              <UButton to="/account/listings" variant="ghost" size="sm">
                Voir tout
              </UButton>
            </div>
          </template>
          <div v-if="recentListings.length === 0" class="py-8 text-center text-white/60">
            <UIcon name="i-heroicons-inbox" class="mx-auto mb-2 h-8 w-8" />
            <p>Aucune annonce</p>
          </div>
          <div v-else class="space-y-3">
            <div
              v-for="listing in recentListings"
              :key="listing.id"
              class="flex gap-3 rounded-lg border border-white/10 p-3 transition-colors hover:bg-white/5"
            >
              <div class="h-16 w-16 shrink-0 overflow-hidden rounded-lg">
                <img
                  v-if="getImageUrl(listing.images?.[0])"
                  :src="getImageUrl(listing.images[0])"
                  :alt="listing.title"
                  class="h-full w-full object-cover"
                />
                <div v-else class="flex h-full items-center justify-center bg-white/10">
                  <UIcon name="i-heroicons-photo" class="h-6 w-6 text-white/40" />
                </div>
              </div>
              <div class="flex-1 min-w-0">
                <h3 class="font-semibold line-clamp-1">{{ listing.title }}</h3>
                <div class="mt-1 flex items-center gap-2 text-xs text-white/60">
                  <span>{{ listing.viewCount || 0 }} vues</span>
                  <span>•</span>
                  <span>{{ formatDate(listing.createdAt) }}</span>
                </div>
                <div class="mt-1 flex items-center gap-2">
                  <UBadge
                    :color="listing.status === 'active' ? 'green' : listing.status === 'sold' ? 'red' : 'gray'"
                    variant="subtle"
                    size="xs"
                  >
                    {{ listing.status === 'active' ? 'Active' : listing.status === 'sold' ? 'Vendue' : 'Archivée' }}
                  </UBadge>
                  <span class="text-sm font-semibold text-primary-500">
                    🐚 {{ listing.price }}
                  </span>
                </div>
              </div>
              <UButton
                :to="`/account/listings/edit/${listing.id}`"
                variant="ghost"
                size="xs"
                icon="i-heroicons-pencil"
              />
            </div>
          </div>
        </UCard>

        <!-- Recent Transactions -->
        <UCard>
          <template #header>
            <div class="flex items-center justify-between">
              <h2 class="text-xl font-semibold">Transactions récentes</h2>
              <UButton to="/account/transactions" variant="ghost" size="sm">
                Voir tout
              </UButton>
            </div>
          </template>
          <div v-if="recentTransactions.length === 0" class="py-8 text-center text-white/60">
            <UIcon name="i-heroicons-inbox" class="mx-auto mb-2 h-8 w-8" />
            <p>Aucune transaction</p>
          </div>
          <div v-else class="space-y-3">
            <div
              v-for="transaction in recentTransactions"
              :key="transaction.id"
              class="flex items-center justify-between rounded-lg border border-white/10 p-3"
            >
              <div class="flex-1 min-w-0">
                <div class="font-semibold">
                  {{ transaction.description || 'Transaction' }}
                </div>
                <div class="mt-1 text-xs text-white/60">
                  {{ formatDate(transaction.createdAt) }}
                </div>
                <div v-if="transaction.listing" class="mt-1 text-xs text-white/40">
                  Annonce: {{ transaction.listing.title }}
                </div>
              </div>
              <div class="text-right">
                  <div
                    :class="[
                      'text-lg font-bold',
                      transaction.type === 'debit' || (transaction.type === 'exchange' && transaction.fromUserId === authStore.user?.id)
                        ? 'text-red-500'
                        : 'text-green-500',
                    ]"
                  >
                    {{ transaction.type === 'debit' || (transaction.type === 'exchange' && transaction.fromUserId === authStore.user?.id) ? '-' : '+' }}
                    {{ transaction.amount }} 🐚
                  </div>
                <div class="text-xs text-white/60">
                  Solde: {{ Math.round(transaction.balanceAfter) }} 🐚
                </div>
              </div>
            </div>
          </div>
        </UCard>
      </div>
    </div>
  </div>
</template>
