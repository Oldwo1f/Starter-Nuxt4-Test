<script setup lang="ts">
import { useWalletStore } from '~/stores/useWalletStore'

const walletStore = useWalletStore()

onMounted(async () => {
  await walletStore.fetchBalance()
})
</script>

<template>
  <div class="flex items-center gap-2">
    <span class="text-2xl">🐚</span>
    <div>
      <div class="text-lg font-bold text-primary-500">{{ walletStore.balance.toFixed(2) }}</div>
      <div class="text-xs text-white/60">Pūpū</div>
    </div>
  </div>
</template>
