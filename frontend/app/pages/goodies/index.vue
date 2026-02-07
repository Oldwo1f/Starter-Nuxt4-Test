<script setup lang="ts">
import { useGoodiesStore } from '~/stores/useGoodiesStore'

definePageMeta({
  layout: 'default',
})

const goodiesStore = useGoodiesStore()

// Fetch goodies on mount
onMounted(() => {
  goodiesStore.fetchGoodies()
})
</script>

<template>
  <div class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
    <div class="mb-12 text-center">
      <h1 class="mb-4 text-4xl font-bold tracking-tight sm:text-5xl">Goodies</h1>
      <p class="mx-auto max-w-2xl text-lg text-white/70">
        Téléchargez des ressources gratuites : logos, images, listes de crypto, vidéos et plus encore
      </p>
    </div>

    <!-- Loading state -->
    <div v-if="goodiesStore.isLoading" class="flex justify-center py-12">
      <UIcon name="i-heroicons-arrow-path" class="h-8 w-8 animate-spin text-primary-500" />
    </div>

    <!-- Error state -->
    <div v-else-if="goodiesStore.error" class="py-12 text-center">
      <UIcon name="i-heroicons-exclamation-triangle" class="mx-auto mb-4 h-12 w-12 text-red-500" />
      <p class="text-red-500">{{ goodiesStore.error }}</p>
    </div>

    <!-- Goodies grid -->
    <div v-else-if="goodiesStore.goodies.length > 0" class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      <GoodieCard
        v-for="goodie in goodiesStore.goodies"
        :key="goodie.id"
        :goodie="goodie"
      />
    </div>

    <!-- Empty state -->
    <div v-else class="py-12 text-center text-white/60">
      <UIcon name="i-heroicons-gift" class="mx-auto mb-4 h-12 w-12" />
      <p>Aucun goodie trouvé</p>
    </div>
  </div>
</template>
