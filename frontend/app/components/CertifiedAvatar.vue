<template>
  <UAvatar
    v-if="src"
    :src="src"
    :alt="alt"
    :size="size"
    :text="text"
    :class="[
      isCertified ? 'ring-2 ring-amber-400 ring-offset-2 ring-offset-gray-900' : '',
      avatarClass
    ]"
  />
  <UAvatar
    v-else
    :alt="alt"
    :text="text"
    :size="size"
    :class="[
      isCertified ? 'ring-2 ring-amber-400 ring-offset-2 ring-offset-gray-900' : '',
      avatarClass
    ]"
  />
</template>

<script setup lang="ts">
interface Props {
  src?: string | null
  alt?: string
  text?: string
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  isCertified?: boolean
  avatarClass?: string
}

withDefaults(defineProps<Props>(), {
  src: null,
  alt: '',
  text: '',
  size: 'md',
  isCertified: false,
  avatarClass: '',
})
</script>
