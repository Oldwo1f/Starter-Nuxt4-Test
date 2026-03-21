<script setup lang="ts">
definePageMeta({
  layout: 'default',
})

const { t } = useI18n()
</script>

<template>
  <div class="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
    <div class="mb-8">
      <h1 class="mb-4 text-4xl font-bold">
        {{ t('privacyDeletionStatus.title') }}
      </h1>
      <p class="text-white/60">
        {{ t('privacyDeletionStatus.subtitle') }}
      </p>
    </div>

    <UCard>
      <div class="prose prose-invert max-w-none space-y-6">
        <section>
          <h2 class="mb-4 text-2xl font-semibold">
            {{ t('privacyDeletionStatus.doneh') }}
          </h2>
          <p class="text-white/80">
            {{ t('privacyDeletionStatus.donep1') }}
          </p>
          <p class="text-white/80">
            {{ t('privacyDeletionStatus.donep2') }}
          </p>
          <p class="text-white/80">
            {{ t('privacyDeletionStatus.donep3') }}
          </p>
        </section>

        <section>
          <h2 class="mb-4 text-2xl font-semibold">
            {{ t('privacyDeletionStatus.qah') }}
          </h2>
          <p class="text-white/80">
            {{ t('privacyDeletionStatus.footerQLead') }}
            <NuxtLink to="/politique-de-confidentialite" class="text-primary-400 hover:underline">
              {{ t('privacyDeletionStatus.privacyLink') }}
            </NuxtLink>
            {{ t('privacyDeletionStatus.footerQTail') }}
          </p>
        </section>
      </div>
    </UCard>
  </div>
</template>
