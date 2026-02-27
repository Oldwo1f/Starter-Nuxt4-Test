<script setup lang="ts">
import tatouImage from '~/assets/images/tatou.jpg'
</script>

<template>
  <div class="relative flex min-h-dvh flex-col">
    <!-- Image de fond tatou.jpg avec overlay sombre -->
    <div
      class="pointer-events-none fixed inset-0 -z-10"
      :style="{
        backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.8)), url(${tatouImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        opacity: 0.03
      }"
      aria-hidden="true"
    />
    <AppHeader />
    <main class="flex-1">
      <slot />
    </main>
    <AppFooter />
  </div>
</template>
