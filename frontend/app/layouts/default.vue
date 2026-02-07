<script setup lang="ts">
import patternSvg from '~/assets/images/J5.svg'
</script>

<template>
  <div class="relative flex min-h-dvh flex-col">
    <!-- Motifs polynésiens en overlay discret -->
    <div class="pointer-events-none fixed inset-0 -z-10 opacity-[1]">
      <img
        :src="patternSvg"
        alt=""
        class="h-full w-full object-cover"
        aria-hidden="true"
      />
    </div>
    <AppHeader />
    <main class="flex-1">
      <slot />
    </main>
    <AppFooter />
  </div>
</template>
