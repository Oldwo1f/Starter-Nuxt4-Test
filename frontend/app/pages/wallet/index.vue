<script setup lang="ts">
import { useAuthStore } from '~/stores/useAuthStore'
import { useWalletStore } from '~/stores/useWalletStore'

definePageMeta({
  layout: 'default',
  middleware: 'auth',
})

const walletStore = useWalletStore()
const authStore = useAuthStore()
const { t } = useI18n()
const { formatDate } = useLocaleDate()

// Fetch data
const fetchData = async () => {
  await Promise.all([
    walletStore.fetchBalance(),
    walletStore.fetchTransactions(),
  ])
}

onMounted(() => {
  fetchData()
})
</script>

<template>
  <div class="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
    <div class="mb-6">
      <h1 class="text-3xl font-bold">{{ t('walletPublic.title') }}</h1>
      <p class="text-white/60">{{ t('walletPublic.subtitle') }}</p>
    </div>

    <!-- Balance Card -->
    <UCard class="mb-6 bg-gradient-to-r from-primary-500/20 to-primary-600/20">
      <div class="text-center">
        <div class="mb-2 text-sm text-white/60">{{ t('walletPublic.available') }}</div>
        <div class="mb-4 flex items-center justify-center gap-2 text-5xl font-bold text-primary-500">
          <span>🐚</span>
          <span>{{ walletStore.balance.toFixed(2) }}</span>
        </div>
        <div class="text-sm text-white/60">
          ≈ {{ (walletStore.balance * 100).toFixed(0) }} XPF
        </div>
        <UButton
          to="/wallet/transfer"
          color="primary"
          size="lg"
          class="mt-6"
          icon="i-heroicons-arrow-path"
        >
          {{ t('walletPublic.transferCta') }}
        </UButton>
      </div>
    </UCard>

    <!-- Transactions -->
    <UCard>
      <template #header>
        <h2 class="text-xl font-semibold">{{ t('walletPublic.historyTitle') }}</h2>
      </template>
      <div v-if="walletStore.isLoading" class="text-center py-8">
        <div class="inline-block h-8 w-8 animate-spin rounded-full border-4 border-primary-500 border-t-transparent" />
      </div>
      <div v-else-if="walletStore.transactions.length > 0" class="space-y-4">
        <div
          v-for="transaction in walletStore.transactions"
          :key="transaction.id"
          class="flex items-center justify-between border-b border-white/10 pb-4 last:border-0"
        >
          <div class="flex-1">
            <div class="font-semibold">
              {{ transaction.description || t('walletPublic.transactionFallback') }}
            </div>
            <div class="text-sm text-white/60">
              {{ formatDate(transaction.createdAt, {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              }) }}
            </div>
            <div v-if="transaction.listing" class="mt-1 text-xs text-white/40">
              {{ t('walletPublic.listingPrefix') }} {{ transaction.listing.title }}
            </div>
          </div>
          <div class="text-right">
            <div
              :class="[
                'text-lg font-bold',
                transaction.fromUserId === authStore.user?.id
                  ? 'text-red-500'
                  : 'text-green-500',
              ]"
            >
              {{ transaction.fromUserId === authStore.user?.id ? '-' : '+' }}
              {{ transaction.amount }} 🐚
            </div>
            <div class="text-xs text-white/60">
              {{ t('walletPublic.balanceAfter') }} {{ transaction.balanceAfter.toFixed(2) }} 🐚
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
            {{ t('walletPublic.prev') }}
          </UButton>
          <span class="text-sm text-white/60">
            {{ t('walletPublic.pageOf', { page: walletStore.pagination.page, total: walletStore.pagination.totalPages }) }}
          </span>
          <UButton
            :disabled="!walletStore.pagination.hasNext"
            variant="outline"
            trailing-icon="i-heroicons-chevron-right"
            @click="walletStore.fetchTransactions(walletStore.pagination.page + 1)"
          >
            {{ t('walletPublic.next') }}
          </UButton>
        </div>
      </div>
      <div v-else class="py-12 text-center text-white/60">
        <UIcon name="i-heroicons-inbox" class="mx-auto mb-4 h-12 w-12" />
        <p>{{ t('walletPublic.empty') }}</p>
      </div>
    </UCard>
  </div>
</template>
