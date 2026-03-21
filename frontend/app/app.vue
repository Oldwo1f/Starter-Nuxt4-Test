<script setup lang="ts">
// Le dark mode est forcé via le plugin darkmode.client.ts
const route = useRoute()
const { t } = useI18n()

useHead({
  title: computed(() => {
    const key = route.meta.titleKey as string | undefined
    if (key) return t(key)
    const title = route.meta.title
    return typeof title === 'string' ? title : undefined
  }),
})
</script>

<template>
  <UApp>
    <SocketInitializer />
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </UApp>
</template>
