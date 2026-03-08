<script setup lang="ts">
definePageMeta({
  layout: 'default',
  title: 'Sondages',
})

import { usePollStore } from '~/stores/usePollStore'

const pollStore = usePollStore()
const toast = useToast()

// Charger les sondages (20 par page, triés du plus récent au plus vieux)
onMounted(async () => {
  await pollStore.fetchPolls(1, 20)
})

// Handler pour changement de page
const handlePageChange = async (page: number) => {
  await pollStore.fetchPolls(page, 20)
}
</script>

<template>
  <div class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
    <div class="mb-8">
      <h1 class="text-4xl font-bold text-white sm:text-5xl">
        Sondages
      </h1>
      <p class="mt-4 text-lg text-white/70">
        Découvrez tous les sondages et partagez votre avis
      </p>
    </div>

    <!-- Liste des sondages -->
    <div v-if="pollStore.isLoading" class="flex justify-center py-12">
      <UIcon name="i-heroicons-arrow-path" class="h-8 w-8 animate-spin text-primary-500" />
    </div>

    <div v-else-if="pollStore.polls.length === 0" class="py-12 text-center">
      <UIcon name="i-heroicons-clipboard-document" class="mx-auto mb-4 h-12 w-12 text-white/40" />
      <p class="text-white/60">Aucun sondage trouvé</p>
    </div>

    <div v-else class="space-y-6">
      <div class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <PollCard
          v-for="poll in pollStore.polls"
          :key="poll.id"
          :poll="poll"
          :show-response="true"
        />
      </div>

      <!-- Pagination -->
      <div v-if="pollStore.pagination.totalPages > 1" class="mt-8 flex justify-center">
        <UPagination
          v-model="pollStore.pagination.page"
          :page-count="pollStore.pagination.pageSize"
          :total="pollStore.pagination.total"
          :max="7"
          @update:model-value="handlePageChange"
        />
      </div>
    </div>
  </div>
</template>
