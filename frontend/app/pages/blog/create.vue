<script setup lang="ts">
definePageMeta({
  layout: 'default',
  middleware: 'auth',
})

// Redirection vers la page Mes articles avec création
navigateTo({ path: '/account/articles', query: { create: '1' } }, { replace: true })
</script>

<template>
  <div class="flex justify-center py-12">
    <UIcon name="i-heroicons-arrow-path" class="h-8 w-8 animate-spin text-primary-500" />
  </div>
</template>
