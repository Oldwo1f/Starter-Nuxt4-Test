<script setup lang="ts">
import bgAcademyImage from '~/assets/images/bg.jpeg'
</script>

<template>
  <div class="relative flex min-h-dvh flex-col">
    <div
      class="pointer-events-none fixed inset-0 -z-10"
      :style="{
        backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.8)), url(${bgAcademyImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }"
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

