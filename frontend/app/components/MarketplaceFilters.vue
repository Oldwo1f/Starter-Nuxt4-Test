<script setup lang="ts">
interface Props {
  locations: any[]
  categories: any[]
  filters: {
    locationId: number | undefined
    categoryId: number | undefined
    type: 'bien' | 'service' | undefined
    minPrice: number | undefined
    maxPrice: number | undefined
    search: string
  }
}

interface Emits {
  (e: 'update:filters', filters: Props['filters']): void
  (e: 'apply'): void
  (e: 'clear'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const localFilters = ref({ ...props.filters })

// Watch props changes
watch(() => props.filters, (newFilters) => {
  localFilters.value = { ...newFilters }
}, { deep: true })

// Emit updates
watch(localFilters, (newFilters) => {
  emit('update:filters', { ...newFilters })
}, { deep: true })

const handleClear = () => {
  localFilters.value = {
    locationId: undefined,
    categoryId: undefined,
    type: undefined,
    minPrice: undefined,
    maxPrice: undefined,
    search: '',
  }
  emit('clear')
}

const handleApply = () => {
  emit('apply')
}
</script>

<template>
  <div class="space-y-4">
    <!-- Search -->
    <div>
      <label class="mb-2 block text-sm font-medium">Recherche</label>
      <UInput
        v-model="localFilters.search"
        placeholder="Rechercher..."
        icon="i-heroicons-magnifying-glass"
        size="lg"
      />
    </div>

    <!-- Location filter -->
    <div>
      <label class="mb-2 block text-sm font-medium">Localisation</label>
      <USelect
        v-model="localFilters.locationId"
        :items="locations.length > 0 ? locations.map(l => ({ label: `${l.commune} - ${l.ile} (${l.archipel})`, value: l.id })) : []"
        placeholder="Toutes les localisations"
        size="lg"
        :disabled="locations.length === 0"
      />
    </div>

    <!-- Category filter -->
    <div>
      <label class="mb-2 block text-sm font-medium">Catégorie</label>
      <USelect
        v-model="localFilters.categoryId"
        :items="categories.length > 0 ? categories.map(c => ({ label: c.name, value: c.id })) : []"
        placeholder="Toutes les catégories"
        size="lg"
        :disabled="categories.length === 0"
      />
    </div>

    <!-- Type filter (Bien/Service) -->
    <div>
      <label class="mb-2 block text-sm font-medium">Type</label>
      <div class="flex gap-2">
        <UButton
          :variant="localFilters.type === 'bien' ? 'solid' : 'outline'"
          color="success"
          size="lg"
          class="flex-1"
          @click="localFilters.type = localFilters.type === 'bien' ? undefined : 'bien'"
        >
          Biens
        </UButton>
        <UButton
          :variant="localFilters.type === 'service' ? 'solid' : 'outline'"
          color="info"
          size="lg"
          class="flex-1"
          @click="localFilters.type = localFilters.type === 'service' ? undefined : 'service'"
        >
          Services
        </UButton>
      </div>
    </div>

    <!-- Price range -->
    <div>
      <label class="mb-2 block text-sm font-medium">Prix (Pūpū)</label>
      <div class="grid grid-cols-2 gap-2">
        <UInput
          v-model.number="localFilters.minPrice"
          type="number"
          placeholder="Min"
          size="lg"
        />
        <UInput
          v-model.number="localFilters.maxPrice"
          type="number"
          placeholder="Max"
          size="lg"
        />
      </div>
    </div>

    <!-- Actions -->
    <div class="flex gap-2 pt-2">
      <UButton
        block
        variant="outline"
        color="neutral"
        @click="handleClear"
      >
        Réinitialiser
      </UButton>
      <UButton
        block
        color="primary"
        @click="handleApply"
      >
        Appliquer
      </UButton>
    </div>
  </div>
</template>
