<script setup lang="ts">
definePageMeta({
  layout: 'default',
  meta: { title: 'Jeux' },
})
</script>

<template>
  <div class="container mx-auto px-4 py-8">
    <h1 class="text-2xl font-bold text-white mb-6">
      Jeux
    </h1>
    <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      <NuxtLink
        to="/games/kikiri"
        class="flex items-center gap-4 rounded-xl bg-white/5 border border-white/10 p-6 transition-colors hover:bg-white/10 hover:border-green-500/30"
      >
        <div class="flex h-12 w-12 items-center justify-center rounded-lg bg-green-500/20">
          <UIcon name="i-heroicons-cube" class="h-6 w-6 text-green-400" />
        </div>
        <div>
          <h2 class="font-semibold text-white">
            Kikiri
          </h2>
          <p class="text-sm text-white/60">
            Dés tahitiens sous la coupelle
          </p>
        </div>
      </NuxtLink>
    </div>
  </div>
</template>
