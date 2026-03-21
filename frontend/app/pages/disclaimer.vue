<script setup lang="ts">
definePageMeta({
  layout: 'default',
})

const { t } = useI18n()
</script>

<template>
  <div class="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
    <div class="mb-8">
      <h1 class="mb-4 text-4xl font-bold">{{ t('disclaimerPage.title') }}</h1>
    </div>

    <UCard>
      <div class="prose prose-invert max-w-none space-y-6">
        <section>
          <h2 class="text-2xl font-semibold mb-4">{{ t('disclaimerPage.h2') }}</h2>
          <p class="text-white/80">
            {{ t('disclaimerPage.p1') }}
          </p>
          <p class="text-white/80">
            {{ t('disclaimerPage.p2') }}
          </p>
          <p class="text-white/80">
            {{ t('disclaimerPage.p3') }}
          </p>
        </section>
      </div>
    </UCard>
  </div>
</template>

