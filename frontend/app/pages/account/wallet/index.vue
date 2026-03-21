<script setup lang="ts">
import { useAuthStore } from '~/stores/useAuthStore'
import { useWalletStore } from '~/stores/useWalletStore'
import { useProfileValidation } from '~/composables/useProfileValidation'

definePageMeta({
  layout: 'account',
  middleware: 'auth',
  titleKey: 'account.menuWallet',
})

const walletStore = useWalletStore()
const authStore = useAuthStore()
const { isProfileComplete } = useProfileValidation()
const { t } = useI18n()
const { formatDate } = useLocaleDate()

// Fetch data
const fetchData = async () => {
  await Promise.all([
    walletStore.fetchBalance(),
    walletStore.fetchJijiBalance(),
    walletStore.fetchTransactions(),
  ])
}

onMounted(() => {
  fetchData()
})

const formatTxDate = (date: string) =>
  formatDate(date, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
</script>

<template>
  <div class="space-y-6">
    <ProfileIncompleteBanner />
    
    <div class="space-y-2">
      <h1 class="text-3xl font-bold">{{ t('account.walletPage.title') }}</h1>
      <p class="text-white/60">{{ t('account.walletPage.subtitle') }}</p>
    </div>

    <!-- Balances -->
    <div class="grid gap-6 sm:grid-cols-2">
    <!-- Pūpū Balance Card -->
    <UCard class="bg-gradient-to-r from-primary-500/20 to-primary-600/20">
      <div class="text-center">
        <div class="mb-2 text-sm text-white/60">{{ t('account.walletPage.available') }}</div>
        <div class="mb-4 flex items-center justify-center gap-2 text-5xl font-bold text-primary-500">
          <span>🐚</span>
          <span>{{ Math.round(walletStore.balance) }}</span>
        </div>
        <div class="text-sm text-white/60">
          ≈ {{ (walletStore.balance * 100).toFixed(0) }} XPF
        </div>
        <UButton
          to="/account/wallet/transfer"
          color="primary"
          size="lg"
          class="mt-6"
          icon="i-heroicons-arrow-path"
          :disabled="!isProfileComplete"
        >
          {{ t('account.walletPage.transferCta') }}
        </UButton>
      </div>
    </UCard>

    <!-- Jiji Balance Card -->
    <UCard class="bg-gradient-to-r from-amber-500/20 to-amber-600/20">
      <div class="text-center">
        <div class="mb-2 text-sm text-white/60">{{ t('account.walletPage.jijiLabel') }}</div>
        <div class="mb-4 flex items-center justify-center gap-2 text-5xl font-bold text-amber-500">
          <JijiIcon size="lg" />
          <span>{{ Math.round(walletStore.jijiBalance) }}</span>
        </div>
        <div class="text-sm text-white/60">
          {{ t('account.walletPage.jijiHint') }}
        </div>
        <UButton
          to="/games/bingo"
          color="neutral"
          variant="soft"
          size="lg"
          class="mt-6"
          icon="i-heroicons-play"
        >
          {{ t('account.walletPage.play') }}
        </UButton>
      </div>
    </UCard>
    </div>

    <!-- Transactions -->
    <UCard class="bg-gradient-to-br from-white/5 to-white/[0.02] border-0">
      <template #header>
        <div class="flex items-center justify-between">
          <h2 class="text-xl font-semibold">{{ t('account.walletPage.historyTitle') }}</h2>
          <UButton to="/account/transactions" variant="ghost" size="sm">
            {{ t('account.walletPage.seeAll') }}
          </UButton>
        </div>
      </template>
      <div v-if="walletStore.isLoading" class="text-center py-8">
        <div class="inline-block h-8 w-8 animate-spin rounded-full border-4 border-primary-500 border-t-transparent" />
      </div>
      <div v-else-if="walletStore.transactions.length > 0" class="space-y-4">
        <div
          v-for="transaction in walletStore.transactions.slice(0, 10)"
          :key="transaction.id"
          class="flex items-center justify-between border-b border-white/10 pb-4 last:border-0"
        >
          <div class="flex-1">
            <div class="font-semibold">
              {{ transaction.description || t('account.walletPage.transactionFallback') }}
            </div>
            <div class="text-sm text-white/60">
              {{ formatTxDate(transaction.createdAt) }}
            </div>
            <div v-if="transaction.listing" class="mt-1 text-xs text-white/40">
              {{ t('account.walletPage.listingPrefix') }} {{ transaction.listing.title }}
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
              {{ t('account.walletPage.balanceAfter') }} {{ Math.round(transaction.balanceAfter) }} 🐚
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
            {{ t('account.walletPage.prev') }}
          </UButton>
          <span class="text-sm text-white/60">
            {{ t('account.walletPage.pageOf', { page: walletStore.pagination.page, total: walletStore.pagination.totalPages }) }}
          </span>
          <UButton
            :disabled="!walletStore.pagination.hasNext"
            variant="outline"
            trailing-icon="i-heroicons-chevron-right"
            @click="walletStore.fetchTransactions(walletStore.pagination.page + 1)"
          >
            {{ t('account.walletPage.next') }}
          </UButton>
        </div>
      </div>
      <div v-else class="py-12 text-center text-white/60">
        <UIcon name="i-heroicons-inbox" class="mx-auto mb-4 h-12 w-12" />
        <p>{{ t('account.walletPage.empty') }}</p>
      </div>
    </UCard>
  </div>
</template>
