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
      <h1 class="mb-4 text-4xl font-bold">{{ t('cgvPage.title') }}</h1>
      <p class="text-white/60">{{ t('cgvPage.updated') }} {{ lastUpdateDate }}</p>
    </div>

    <UCard>
      <div class="prose prose-invert max-w-none space-y-6">
        <section>
          <h2 class="mb-4 text-2xl font-semibold">{{ t('cgvPage.s1h') }}</h2>
          <p class="text-white/80">
            {{ t('cgvPage.s1p') }}
          </p>
        </section>

        <section>
          <h2 class="mb-4 text-2xl font-semibold">{{ t('cgvPage.s2h') }}</h2>
          <p class="text-white/80">
            {{ t('cgvPage.s2p') }}
          </p>
        </section>

        <section>
          <h2 class="mb-4 text-2xl font-semibold">{{ t('cgvPage.s3h') }}</h2>
          <p class="text-white/80">
            {{ t('cgvPage.s3p') }}
          </p>
        </section>

        <section>
          <h2 class="mb-4 text-2xl font-semibold">{{ t('cgvPage.s4h') }}</h2>
          <p class="text-white/80">
            {{ t('cgvPage.s4p') }}
          </p>
          <ul class="ml-4 list-inside list-disc space-y-2 text-white/80">
            <li>{{ t('cgvPage.s4li0') }}</li>
            <li>{{ t('cgvPage.s4li1') }}</li>
            <li>{{ t('cgvPage.s4li2') }}</li>
            <li>{{ t('cgvPage.s4li3') }}</li>
          </ul>
        </section>

        <section>
          <h2 class="mb-4 text-2xl font-semibold">{{ t('cgvPage.s5h') }}</h2>
          <p class="text-white/80">
            {{ t('cgvPage.s5p') }}
          </p>
        </section>

        <section>
          <h2 class="mb-4 text-2xl font-semibold">{{ t('cgvPage.s6h') }}</h2>
          <p class="text-white/80">
            {{ t('cgvPage.s6p') }}
          </p>
          <ul class="ml-4 list-inside list-disc space-y-2 text-white/80">
            <li>{{ t('cgvPage.s6li0') }}</li>
            <li>{{ t('cgvPage.s6li1') }}</li>
            <li>{{ t('cgvPage.s6li2') }}</li>
          </ul>
        </section>

        <section>
          <h2 class="mb-4 text-2xl font-semibold">{{ t('cgvPage.s7h') }}</h2>
          <p class="text-white/80">
            {{ t('cgvPage.s7p') }}
          </p>
        </section>

        <section>
          <h2 class="mb-4 text-2xl font-semibold">{{ t('cgvPage.s8h') }}</h2>
          <p class="text-white/80">
            {{ t('cgvPage.s8p') }}
          </p>
        </section>

        <section>
          <h2 class="mb-4 text-2xl font-semibold">{{ t('cgvPage.s9h') }}</h2>
          <p class="text-white/80">
            {{ t('cgvPage.s9p') }}
          </p>
        </section>

        <section>
          <h2 class="mb-4 text-2xl font-semibold">{{ t('cgvPage.s10h') }}</h2>
          <p class="text-white/80">
            {{ t('cgvPage.s10p') }}
          </p>
        </section>
      </div>
    </UCard>
  </div>
</template>
