<script setup lang="ts">
import bg2Image from '~/assets/images/bg2.jpg'
</script>

<template>
  <div class="relative flex min-h-dvh flex-col">
    <div
      class="pointer-events-none fixed inset-0 -z-10"
      :style="{
        backgroundImage: `url(${bg2Image})`,
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
