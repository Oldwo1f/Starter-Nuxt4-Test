<script setup lang="ts">
interface Props {
  listing: any
  viewMode?: 'list' | 'grid'
}

const props = withDefaults(defineProps<Props>(), {
  viewMode: 'grid',
})

const { getImageUrl: getImageUrlHelper } = useApi()

const getImageUrl = (listing: any) => {
  if (listing.images && listing.images.length > 0) {
    return getImageUrlHelper(listing.images[0])
  }
  return null
}
</script>

<template>
  <UCard
    class="cursor-pointer bg-gradient-to-br from-white/5 to-white/[0.02] border-0 transition-transform hover:scale-[1.02] sm:hover:scale-105"
    @click="navigateTo(`/marketplace/${listing.id}`)"
  >
    <template v-if="viewMode === 'grid'" #header>
      <div class="relative h-48 w-full overflow-hidden rounded-lg">
        <img
          v-if="getImageUrl(listing)"
          :src="getImageUrl(listing)"
          :alt="listing.title"
          class="h-full w-full object-cover"
        />
        <div v-else class="flex h-full items-center justify-center bg-white/10">
          <UIcon name="i-heroicons-photo" class="h-12 w-12 text-white/40" />
        </div>
      </div>
    </template>

    <div v-if="viewMode === 'list'" class="flex flex-col gap-4 sm:flex-row">
      <!-- Image -->
      <div class="h-48 w-full shrink-0 overflow-hidden rounded-lg sm:h-32 sm:w-48">
        <img
          v-if="getImageUrl(listing)"
          :src="getImageUrl(listing)"
          :alt="listing.title"
          class="h-full w-full object-cover"
        />
        <div v-else class="flex h-full items-center justify-center bg-white/10">
          <UIcon name="i-heroicons-photo" class="h-12 w-12 text-white/40" />
        </div>
      </div>
      <!-- Content -->
      <div class="flex-1 space-y-2">
        <div class="flex items-start justify-between gap-2">
          <h3 class="text-lg font-semibold line-clamp-2">{{ listing.title }}</h3>
          <div class="flex shrink-0 items-center gap-1 text-primary-500">
            <span class="text-xl">🐚</span>
            <span class="font-bold">{{ listing.price }}</span>
          </div>
        </div>
        <p class="line-clamp-2 text-sm text-white/70">{{ listing.description }}</p>
        <div class="flex flex-wrap items-center gap-4 text-xs text-white/60">
          <span>{{ listing.location?.commune }}, {{ listing.location?.ile }}</span>
          <span>{{ listing.category?.name }}</span>
          <span>{{ listing.type === 'bien' ? 'Produit' : 'Service' }}</span>
        </div>
      </div>
    </div>

    <div v-else class="space-y-2">
      <h3 class="font-semibold line-clamp-2">{{ listing.title }}</h3>
      <div class="flex items-center gap-2 text-primary-500">
        <span class="text-xl">🐚</span>
        <span class="font-bold">{{ listing.price }}</span>
      </div>
      <div class="text-sm text-white/60">
        {{ listing.location?.commune }}, {{ listing.location?.ile }}
      </div>
    </div>
  </UCard>
</template>
