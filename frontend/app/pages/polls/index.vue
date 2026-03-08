<script setup lang="ts">
definePageMeta({
  layout: 'default',
  title: 'Sondages',
})

import { usePollStore, PollType, PollStatus, PollAccessLevel } from '~/stores/usePollStore'

const pollStore = usePollStore()
const toast = useToast()

// Filtres
const selectedType = ref<PollType | ''>('')
const selectedStatus = ref<PollStatus | ''>('')
const selectedAccessLevel = ref<PollAccessLevel | ''>('')

// Charger les sondages
onMounted(async () => {
  await pollStore.fetchPolls(
    pollStore.pagination.page,
    pollStore.pagination.pageSize,
    selectedStatus.value || undefined,
    selectedAccessLevel.value || undefined,
    selectedType.value || undefined,
  )
})

// Watchers pour recharger quand les filtres changent
watch([selectedType, selectedStatus, selectedAccessLevel], async () => {
  await pollStore.fetchPolls(
    1,
    pollStore.pagination.pageSize,
    selectedStatus.value || undefined,
    selectedAccessLevel.value || undefined,
    selectedType.value || undefined,
  )
})

// Handler pour changement de page
const handlePageChange = async (page: number) => {
  await pollStore.fetchPolls(
    page,
    pollStore.pagination.pageSize,
    selectedStatus.value || undefined,
    selectedAccessLevel.value || undefined,
    selectedType.value || undefined,
  )
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

    <!-- Filtres -->
    <div class="mb-8 flex flex-wrap gap-4">
      <USelect
        v-model="selectedType"
        :options="[
          { label: 'Tous les types', value: '' },
          { label: 'QCM', value: 'qcm' },
          { label: 'Classement', value: 'ranking' },
        ]"
        option-attribute="label"
        value-attribute="value"
        placeholder="Type de sondage"
        class="w-full sm:w-48"
      />
      <USelect
        v-model="selectedStatus"
        :options="[
          { label: 'Tous les statuts', value: '' },
          { label: 'En cours', value: 'active' },
          { label: 'Terminé', value: 'ended' },
        ]"
        option-attribute="label"
        value-attribute="value"
        placeholder="Statut"
        class="w-full sm:w-48"
      />
      <USelect
        v-model="selectedAccessLevel"
        :options="[
          { label: 'Tous les accès', value: '' },
          { label: 'Public', value: 'public' },
          { label: 'Membres', value: 'member' },
        ]"
        option-attribute="label"
        value-attribute="value"
        placeholder="Niveau d'accès"
        class="w-full sm:w-48"
      />
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
