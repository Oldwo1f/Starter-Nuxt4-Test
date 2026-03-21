<script setup lang="ts">
const STORAGE_KEY = 'marketplace_how_it_works_visited'

const { t } = useI18n()
const hasVisited = ref(false)

onMounted(() => {
  if (import.meta.client) {
    hasVisited.value = !!localStorage.getItem(STORAGE_KEY)
  }
})

const markAsVisited = () => {
  if (import.meta.client) {
    localStorage.setItem(STORAGE_KEY, 'true')
    hasVisited.value = true
  }
}
</script>

<template>
  <UAlert
    v-if="!hasVisited"
    color="primary"
    variant="soft"
    icon="i-heroicons-information-circle"
    :title="t('marketplaceBanner.title')"
    :description="t('marketplaceBanner.description')"
    class="mb-6"
  >
    <template #actions>
      <div class="flex flex-wrap items-center gap-2">
        <UButton
          to="/marketplace/how-it-works"
          color="primary"
          variant="solid"
          size="sm"
          @click="markAsVisited"
        >
          {{ t('marketplaceBanner.discover') }}
        </UButton>
        <UButton
          color="neutral"
          variant="ghost"
          size="sm"
          @click="markAsVisited"
        >
          {{ t('marketplaceBanner.dismiss') }}
        </UButton>
      </div>
    </template>
  </UAlert>
</template>
