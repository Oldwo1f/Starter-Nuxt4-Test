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
        {{ t('privacySuppression.title') }}
      </h1>
      <p class="text-white/60">
        {{ t('privacySuppression.subtitle') }}
      </p>
    </div>

    <UCard>
      <div class="prose prose-invert max-w-none space-y-6">
        <section>
          <h2 class="mb-4 text-2xl font-semibold">
            {{ t('privacySuppression.fbh') }}
          </h2>
          <p class="text-white/80">
            {{ t('privacySuppression.fbp1') }}
          </p>
          <ol class="list-inside list-decimal space-y-2 text-white/80">
            <li>
              {{ t('privacySuppression.fbl1') }}
            </li>
            <li>
              {{ t('privacySuppression.fbl2') }}
            </li>
            <li>
              {{ t('privacySuppression.fbl3') }}
            </li>
          </ol>
          <p class="text-white/80">
            {{ t('privacySuppression.fbp2') }}
          </p>
        </section>

        <section>
          <h2 class="mb-4 text-2xl font-semibold">
            {{ t('privacySuppression.emailh') }}
          </h2>
          <p class="text-white/80">
            {{ t('privacySuppression.emailp1') }}
          </p>
          <ul class="list-inside list-disc space-y-2 text-white/80">
            <li>
              {{ t('privacySuppression.emailli1') }}
            </li>
            <li>
              {{ t('privacySuppression.emailLi2Lead') }}
              <NuxtLink to="/politique-de-confidentialite" class="text-primary-400 hover:underline">
                {{ t('privacySuppression.privacyLink') }}
              </NuxtLink>
              {{ t('privacySuppression.emailLi2Tail') }}
            </li>
          </ul>
        </section>

        <section>
          <h2 class="mb-4 text-2xl font-semibold">
            {{ t('privacySuppression.dataDeletedh') }}
          </h2>
          <p class="text-white/80">
            {{ t('privacySuppression.dataDeletedp') }}
          </p>
        </section>

        <section>
          <h2 class="mb-4 text-2xl font-semibold">
            {{ t('privacySuppression.footerQh') }}
          </h2>
          <p class="text-white/80">
            {{ t('privacySuppression.footerQLead') }}
            <NuxtLink to="/politique-de-confidentialite" class="text-primary-400 hover:underline">
              {{ t('privacySuppression.privacyLink') }}
            </NuxtLink>
            {{ t('privacySuppression.footerQTail') }}
          </p>
        </section>
      </div>
    </UCard>
  </div>
</template>
