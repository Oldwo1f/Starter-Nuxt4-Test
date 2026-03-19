<script setup lang="ts">
import jijiImg from '~/assets/images/jiji.png'

withDefaults(
  defineProps<{
    size?: 'xs' | 'sm' | 'md' | 'lg'
  }>(),
  { size: 'md' }
)

const sizeClasses = {
  xs: 'w-4 h-4',
  sm: 'w-5 h-5',
  md: 'w-6 h-6',
  lg: 'w-8 h-8',
}
</script>

<template>
  <img
    :src="jijiImg"
    alt="Jiji"
    class="inline-block flex-shrink-0"
    :class="sizeClasses[size]"
  />
</template>
