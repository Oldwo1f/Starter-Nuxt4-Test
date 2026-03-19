<script setup lang="ts">
definePageMeta({
  layout: 'account',
  middleware: 'auth',
})

// Redirection vers la nouvelle page Mes articles
navigateTo('/account/articles', { replace: true })
</script>

<template>
  <div />
</template>
