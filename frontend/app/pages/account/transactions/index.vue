<script setup lang="ts">
import { useAuthStore } from '~/stores/useAuthStore'
import { useWalletStore } from '~/stores/useWalletStore'

definePageMeta({
  layout: 'account',
  middleware: 'auth',
})

const walletStore = useWalletStore()
const authStore = useAuthStore()

// Filters
const typeFilter = ref<'all' | 'debit' | 'credit' | 'exchange'>('all')
const searchQuery = ref('')

// Computed filtered transactions
const filteredTransactions = computed(() => {
  let transactions = walletStore.transactions

  // Filter by type
  if (typeFilter.value !== 'all') {
    transactions = transactions.filter((t) => {
      if (typeFilter.value === 'debit') {
        return t.type === 'debit' || (t.type === 'exchange' && t.fromUserId === authStore.user?.id)
      }
      if (typeFilter.value === 'credit') {
        return t.type === 'credit' || (t.type === 'exchange' && t.toUserId === authStore.user?.id && t.fromUserId !== authStore.user?.id)
      }
      if (typeFilter.value === 'exchange') {
        return t.type === 'exchange'
      }
      return true
    })
  }

  // Filter by search
  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase()
    transactions = transactions.filter((t) => {
      const description = (t.description || '').toLowerCase()
      const listingTitle = (t.listing?.title || '').toLowerCase()
      return description.includes(query) || listingTitle.includes(query)
    })
  }

  return transactions
})

// Fetch transactions
const fetchTransactions = async () => {
  await walletStore.fetchTransactions()
}

// Format date
const formatDate = (date: string) => {
  return new Date(date).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// Get transaction type label
const getTransactionTypeLabel = (transaction: any) => {
  if (transaction.type === 'exchange') {
    return 'Échange'
  }
  if (transaction.type === 'debit') {
    return 'Débit'
  }
  if (transaction.type === 'credit') {
    return 'Crédit'
  }
  // Fallback: determine by user role
  if (transaction.fromUserId === authStore.user?.id) {
    return 'Débit'
  }
  return 'Crédit'
}

// Check if transaction is a debit for current user
const isDebit = (transaction: any) => {
  return transaction.type === 'debit' || (transaction.type === 'exchange' && transaction.fromUserId === authStore.user?.id)
}

// Check if transaction is a credit for current user
const isCredit = (transaction: any) => {
  return transaction.type === 'credit' || (transaction.type === 'exchange' && transaction.toUserId === authStore.user?.id && transaction.fromUserId !== authStore.user?.id)
}

onMounted(() => {
  fetchTransactions()
})
</script>

<template>
  <div class="space-y-6">
    <div class="space-y-2">
      <h1 class="text-3xl font-bold">Transactions</h1>
      <p class="text-white/60">Historique complet de vos transactions</p>
    </div>

    <!-- Filters -->
    <UCard>
      <div class="space-y-4">
        <!-- Type filter -->
        <div>
          <label class="mb-2 block text-sm font-medium">Type de transaction</label>
          <div class="flex flex-wrap gap-2">
            <UButton
              :variant="typeFilter === 'all' ? 'solid' : 'outline'"
              @click="typeFilter = 'all'"
            >
              Toutes
            </UButton>
            <UButton
              :variant="typeFilter === 'debit' ? 'solid' : 'outline'"
              @click="typeFilter = 'debit'"
            >
              Débits
            </UButton>
            <UButton
              :variant="typeFilter === 'credit' ? 'solid' : 'outline'"
              @click="typeFilter = 'credit'"
            >
              Crédits
            </UButton>
            <UButton
              :variant="typeFilter === 'exchange' ? 'solid' : 'outline'"
              @click="typeFilter = 'exchange'"
            >
              Échanges
            </UButton>
          </div>
        </div>

        <!-- Search -->
        <div>
          <label class="mb-2 block text-sm font-medium">Rechercher</label>
          <UInput
            v-model="searchQuery"
            placeholder="Rechercher par description ou annonce..."
            icon="i-heroicons-magnifying-glass"
            size="lg"
          />
        </div>
      </div>
    </UCard>

    <!-- Transactions -->
    <UCard>
      <template #header>
        <h2 class="text-xl font-semibold">
          {{ filteredTransactions.length }} transaction{{ filteredTransactions.length > 1 ? 's' : '' }}
        </h2>
      </template>

      <div v-if="walletStore.isLoading" class="text-center py-12">
        <div class="inline-block h-8 w-8 animate-spin rounded-full border-4 border-primary-500 border-t-transparent" />
      </div>

      <div v-else-if="filteredTransactions.length > 0" class="space-y-4">
        <div
          v-for="transaction in filteredTransactions"
          :key="transaction.id"
          class="flex items-center justify-between rounded-lg border border-white/10 p-4 transition-colors hover:bg-white/5"
        >
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-3">
              <div
                :class="[
                  'flex h-10 w-10 items-center justify-center rounded-full',
                  isDebit(transaction)
                    ? 'bg-red-500/20 text-red-400'
                    : 'bg-green-500/20 text-green-400',
                ]"
              >
                <UIcon
                  :name="transaction.type === 'exchange' ? 'i-heroicons-arrow-path' : isDebit(transaction) ? 'i-heroicons-arrow-up' : 'i-heroicons-arrow-down'"
                  class="h-5 w-5"
                />
              </div>
              <div class="flex-1 min-w-0">
                <div class="font-semibold">
                  {{ transaction.description || 'Transaction' }}
                </div>
                <div class="mt-1 flex items-center gap-2 text-sm text-white/60">
                  <span>{{ formatDate(transaction.createdAt) }}</span>
                  <span>•</span>
                  <UBadge variant="subtle" size="xs">
                    {{ getTransactionTypeLabel(transaction) }}
                  </UBadge>
                  <span v-if="transaction.listing">•</span>
                  <span v-if="transaction.listing" class="text-xs text-white/40">
                    Annonce: {{ transaction.listing.title }}
                  </span>
                </div>
              </div>
            </div>
          </div>
          <div class="text-right">
            <div
              :class="[
                'text-lg font-bold',
                isDebit(transaction)
                  ? 'text-red-500'
                  : 'text-green-500',
              ]"
            >
              {{ isDebit(transaction) ? '-' : '+' }}
              {{ transaction.amount }} 🐚
            </div>
            <div class="text-xs text-white/60">
              Solde: {{ Math.round(transaction.balanceAfter) }} 🐚
            </div>
          </div>
        </div>

        <!-- Pagination -->
        <div v-if="walletStore.pagination.totalPages > 1" class="flex items-center justify-center gap-2 pt-4">
          <UButton
            :disabled="!walletStore.pagination.hasPrev"
            variant="outline"
            icon="i-heroicons-chevron-left"
            @click="walletStore.fetchTransactions(walletStore.pagination.page - 1)"
          >
            Précédent
          </UButton>
          <span class="text-sm text-white/60">
            Page {{ walletStore.pagination.page }} sur {{ walletStore.pagination.totalPages }}
          </span>
          <UButton
            :disabled="!walletStore.pagination.hasNext"
            variant="outline"
            trailing-icon="i-heroicons-chevron-right"
            @click="walletStore.fetchTransactions(walletStore.pagination.page + 1)"
          >
            Suivant
          </UButton>
        </div>
      </div>

      <div v-else class="py-12 text-center text-white/60">
        <UIcon name="i-heroicons-inbox" class="mx-auto mb-4 h-12 w-12" />
        <p>Aucune transaction trouvée</p>
        <p v-if="typeFilter !== 'all' || searchQuery" class="mt-2 text-sm">
          Essayez de modifier vos filtres
        </p>
      </div>
    </UCard>
  </div>
</template>
