<script setup lang="ts">
definePageMeta({
  layout: 'default',
})

const { t } = useI18n()
const { formatDate } = useLocaleDate()

const lastUpdateDate = computed(() => formatDate(new Date()))
</script>

<template>
  <div class="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
    <div class="mb-8">
      <h1 class="mb-4 text-4xl font-bold">{{ t('cguPage.title') }}</h1>
      <p class="text-white/60">{{ t('cguPage.updated') }} {{ lastUpdateDate }}</p>
    </div>

    <UCard>
      <div class="prose prose-invert max-w-none space-y-6">
        <section>
          <h2 class="mb-4 text-2xl font-semibold">{{ t('cguPage.s1h') }}</h2>
          <p class="text-white/80">
            {{ t('cguPage.s1p') }}
          </p>
        </section>

        <section>
          <h2 class="mb-4 text-2xl font-semibold">{{ t('cguPage.s2h') }}</h2>
          <p class="text-white/80">
            {{ t('cguPage.s2p') }}
          </p>
          <ul class="ml-4 list-inside list-disc space-y-2 text-white/80">
            <li>{{ t('cguPage.s2li0') }}</li>
            <li>{{ t('cguPage.s2li1') }}</li>
            <li>{{ t('cguPage.s2li2') }}</li>
            <li>{{ t('cguPage.s2li3') }}</li>
          </ul>
        </section>

        <section>
          <h2 class="mb-4 text-2xl font-semibold">{{ t('cguPage.s3h') }}</h2>
          <p class="text-white/80">
            {{ t('cguPage.s3p') }}
          </p>
          <ul class="ml-4 list-inside list-disc space-y-2 text-white/80">
            <li>{{ t('cguPage.s3li0') }}</li>
            <li>{{ t('cguPage.s3li1') }}</li>
            <li>{{ t('cguPage.s3li2') }}</li>
          </ul>
        </section>

        <section>
          <h2 class="mb-4 text-2xl font-semibold">{{ t('cguPage.s4h') }}</h2>
          <p class="text-white/80">
            {{ t('cguPage.s4p') }}
          </p>
          <ul class="ml-4 list-inside list-disc space-y-2 text-white/80">
            <li>{{ t('cguPage.s4li0') }}</li>
            <li>{{ t('cguPage.s4li1') }}</li>
            <li>{{ t('cguPage.s4li2') }}</li>
            <li>{{ t('cguPage.s4li3') }}</li>
          </ul>
        </section>

        <section>
          <h2 class="mb-4 text-2xl font-semibold">{{ t('cguPage.s5h') }}</h2>
          <p class="text-white/80">
            {{ t('cguPage.s5p') }}
          </p>
        </section>

        <section>
          <h2 class="mb-4 text-2xl font-semibold">{{ t('cguPage.s6h') }}</h2>
          <p class="text-white/80">
            {{ t('cguPage.s6p') }}
          </p>
        </section>

        <section>
          <h2 class="mb-4 text-2xl font-semibold">{{ t('cguPage.s7h') }}</h2>
          <p class="text-white/80">
            {{ t('cguPage.s7p') }}
          </p>
        </section>

        <section>
          <h2 class="mb-4 text-2xl font-semibold">{{ t('cguPage.s8h') }}</h2>
          <p class="text-white/80">
            {{ t('cguPage.s8p') }}
          </p>
        </section>
      </div>
    </UCard>
  </div>
</template>
