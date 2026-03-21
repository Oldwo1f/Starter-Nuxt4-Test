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
      <h1 class="mb-4 text-4xl font-bold">{{ t('politiquePage.title') }}</h1>
      <p class="text-white/60">
        {{ t('politiquePage.updated') }} {{ lastUpdateDate }}
      </p>
    </div>

    <UCard>
      <div class="prose prose-invert max-w-none space-y-6">
        <section>
          <h2 class="mb-4 text-2xl font-semibold">{{ t('politiquePage.s1h') }}</h2>
          <p class="text-white/80">
            {{ t('politiquePage.s1p') }}
          </p>
        </section>

        <section>
          <h2 class="mb-4 text-2xl font-semibold">{{ t('politiquePage.s2h') }}</h2>
          <p class="text-white/80">
            {{ t('politiquePage.s2p') }}
          </p>
        </section>

        <section>
          <h2 class="mb-4 text-2xl font-semibold">{{ t('politiquePage.s3h') }}</h2>
          <p class="text-white/80">
            {{ t('politiquePage.s3p') }}
          </p>
        </section>

        <section>
          <h2 class="mb-4 text-2xl font-semibold">{{ t('politiquePage.s4h') }}</h2>
          <p class="text-white/80">
            {{ t('politiquePage.s4p') }}
          </p>
        </section>

        <section>
          <h2 class="mb-4 text-2xl font-semibold">{{ t('politiquePage.s5h') }}</h2>
          <p class="text-white/80">
            {{ t('politiquePage.s5p') }}
          </p>
        </section>
      </div>
    </UCard>
  </div>
</template>
