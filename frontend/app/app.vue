<script setup lang="ts">
// Le dark mode est forcé via le plugin darkmode.client.ts
</script>

<template>
  <UApp>
    <SocketInitializer />
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </UApp>
</template>
