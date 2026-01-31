<script setup lang="ts">
definePageMeta({
  layout: 'default',
})

const { appName, tagline } = useAppInfo()
</script>

<template>
  <div class="mx-auto max-w-5xl px-6 py-10">
    <div class="space-y-6">
      <div class="space-y-2">
        <h1 class="text-3xl font-semibold tracking-tight">
          {{ appName }}
        </h1>
        <p class="text-white/70">
          {{ tagline }}
        </p>
      </div>

      <UCard>
        <template #header>
          <div class="flex items-center gap-2">
            <UIcon name="i-heroicons-home" />
            <span class="font-medium">Accueil</span>
          </div>
        </template>
      </UCard>
    </div>
  </div>
</template>

