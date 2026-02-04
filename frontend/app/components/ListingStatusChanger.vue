<script setup lang="ts">
import { useMarketplaceStore } from '~/stores/useMarketplaceStore'

interface Props {
  listingId: number
  currentStatus: 'active' | 'sold' | 'archived'
  size?: 'sm' | 'md' | 'lg'
  variant?: 'solid' | 'outline' | 'ghost' | 'soft' | 'subtle'
}

const props = withDefaults(defineProps<Props>(), {
  size: 'sm',
  variant: 'outline',
})

const emit = defineEmits<{
  statusChanged: [status: 'active' | 'sold' | 'archived']
}>()

const marketplaceStore = useMarketplaceStore()
const toast = useToast()

const isLoading = ref(false)

const statusOptions = [
  { label: 'Active', value: 'active' as const, color: 'green', icon: 'i-heroicons-check-circle' },
  { label: 'Vendue', value: 'sold' as const, color: 'red', icon: 'i-heroicons-x-circle' },
  { label: 'Archivée', value: 'archived' as const, color: 'gray', icon: 'i-heroicons-archive-box' },
]

const currentStatusOption = computed(() => {
  return statusOptions.find(opt => opt.value === props.currentStatus) || statusOptions[0]
})

const handleStatusChange = async (newStatus: 'active' | 'sold' | 'archived') => {
  if (newStatus === props.currentStatus) {
    return
  }

  isLoading.value = true
  try {
    const result = await marketplaceStore.updateListingStatus(props.listingId, newStatus)
    if (result.success) {
      toast.add({
        title: 'Statut mis à jour',
        description: `L'annonce a été marquée comme ${statusOptions.find(opt => opt.value === newStatus)?.label.toLowerCase()}.`,
        color: 'green',
      })
      emit('statusChanged', newStatus)
    } else {
      toast.add({
        title: 'Erreur',
        description: result.error || 'Erreur lors de la mise à jour du statut',
        color: 'red',
      })
    }
  } catch (error: any) {
    toast.add({
      title: 'Erreur',
      description: error.message || 'Erreur lors de la mise à jour du statut',
      color: 'red',
    })
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <UDropdownMenu
    :items="[
      statusOptions
        .filter(opt => opt.value !== currentStatus)
        .map(opt => ({
          label: opt.label,
          icon: opt.icon,
          color: opt.color,
          onClick: () => handleStatusChange(opt.value),
        })),
    ]"
  >
    <UButton
      :color="currentStatusOption.color"
      :variant="variant"
      :size="size"
      :loading="isLoading"
      :icon="currentStatusOption.icon"
    >
      {{ currentStatusOption.label }}
      <UIcon name="i-heroicons-chevron-down" class="ml-1 h-4 w-4" />
    </UButton>
  </UDropdownMenu>
</template>
