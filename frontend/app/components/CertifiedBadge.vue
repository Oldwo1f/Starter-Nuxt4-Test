<template>
  <UBadge
    v-if="isCertified"
    color="amber"
    variant="soft"
    :size="size"
    class="flex items-center gap-1"
  >
    <UIcon name="i-heroicons-shield-check" class="h-3.5 w-3.5" />
    <span v-if="showText">Certifié</span>
  </UBadge>
</template>

<script setup lang="ts">
interface Props {
  isCertified?: boolean
  size?: 'xs' | 'sm' | 'md' | 'lg'
  showText?: boolean
}

withDefaults(defineProps<Props>(), {
  isCertified: false,
  size: 'sm',
  showText: false,
})
</script>
