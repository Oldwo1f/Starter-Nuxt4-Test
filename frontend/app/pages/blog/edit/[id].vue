<script setup lang="ts">
definePageMeta({
  layout: 'default',
  middleware: 'auth',
})

const route = useRoute()
const router = useRouter()

// Redirection vers la page Mes articles avec modification
const postId = route.params.id
navigateTo({ path: '/account/articles', query: { edit: postId } }, { replace: true })
</script>

<template>
  <div class="flex justify-center py-12">
    <UIcon name="i-heroicons-arrow-path" class="h-8 w-8 animate-spin text-primary-500" />
  </div>
</template>
