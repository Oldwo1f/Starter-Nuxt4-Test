<script setup lang="ts">
import bgImage from '~/assets/images/bg.jpeg'

const route = useRoute()
const pageBgStyle = computed(() => {
  const base = {
    backgroundSize: 'cover' as const,
    backgroundPosition: 'center' as const,
    backgroundRepeat: 'no-repeat' as const,
  }
  // Pages où l’image de fond doit rester visible (sans assombrissement global)
  if (route.path === '/' || route.path === '/tarifs' || route.path === '/pricing') {
    return { ...base, backgroundImage: `url(${bgImage})` }
  }
  return {
    ...base,
    backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.8)), url(${bgImage})`,
  }
})
</script>

<template>
  <div class="relative flex min-h-dvh flex-col">
    <!-- Image de fond (overlay sombre sauf sur la home) -->
    <div
      class="pointer-events-none fixed inset-0 -z-10"
      :style="pageBgStyle"
      aria-hidden="true"
    />
    <AppHeader />
    <main class="flex-1 pb-20 md:pb-0">
      <slot />
    </main>
    <AppFooter />
    <AppBottomNav />
  </div>
</template>
