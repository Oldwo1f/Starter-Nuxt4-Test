<script setup lang="ts">
definePageMeta({
  layout: 'default',
})

import { usePartnerStore } from '~/stores/usePartnerStore'
import type { Partner } from '~/stores/usePartnerStore'

const partnerStore = usePartnerStore()
const { apiBaseUrl } = useApi()
const { t, locale } = useI18n()

onMounted(async () => {
  await partnerStore.fetchPartners()
})

function comparePartners(a: Partner, b: Partner): number {
  const loc = locale.value === 'ty' ? 'ty' : 'fr'
  return a.name.localeCompare(b.name, loc, { sensitivity: 'base' })
}

const premiumPartnersSorted = computed(() =>
  partnerStore.partners.filter((p) => p.premium === true).sort(comparePartners),
)

const regularPartnersSorted = computed(() =>
  partnerStore.partners.filter((p) => p.premium !== true).sort(comparePartners),
)

/** Bannière pour la zone large : horizontale en priorité, sinon verticale. */
function partnerBannerDisplayUrl(partner: Partner): string | null {
  const path = partner.bannerHorizontalUrl || partner.bannerVerticalUrl
  if (!path) return null
  return `${apiBaseUrl}${path}`
}

const soutienQrAccordionItems = computed(() => [
  {
    label: t('partnersPage.soutienQrTitle'),
    icon: 'i-heroicons-qr-code',
    content: t('partnersPage.soutienQrDescription'),
  },
])
</script>

<template>
  <div class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
    <div class="mb-12 text-center">
      <h1 class="mb-4 text-4xl font-bold tracking-tight sm:text-5xl">{{ t('partnersPage.title') }}</h1>
      <p class="mx-auto max-w-2xl text-lg text-white/70">
        {{ t('partnersPage.subtitle') }}
      </p>
    </div>

    <div v-if="partnerStore.isLoading" class="py-12 text-center">
      <UIcon name="i-heroicons-arrow-path" class="mx-auto mb-4 h-12 w-12 animate-spin text-white/60" />
      <p class="text-white/60">{{ t('partnersPage.loading') }}</p>
    </div>

    <template v-else-if="partnerStore.partners.length > 0">
      <section v-if="premiumPartnersSorted.length" class="mb-12 space-y-5">
        <UCard
          v-for="partner in premiumPartnersSorted"
          :key="`premium-${partner.id}`"
          class="w-full overflow-hidden border-0 bg-gradient-to-br from-white/[0.08] to-white/[0.02] ring-1 ring-amber-500/30"
        >
          <div class="flex flex-col md:flex-row md:items-stretch">
            <div
              class="border-b border-white/10 md:w-1/3 md:shrink-0 md:border-b-0 md:border-r md:border-white/10"
            >
              <div class="p-5">
                <PartnerAnnuaireFields :partner="partner" />
              </div>
            </div>
            <div class="relative min-h-[200px] w-full bg-white/[0.04] md:w-2/3 md:min-h-[260px]">
              <img
                v-if="partnerBannerDisplayUrl(partner)"
                :src="partnerBannerDisplayUrl(partner)!"
                :alt="partner.name"
                class="h-56 w-full object-cover md:absolute md:inset-0 md:h-full md:min-h-[260px]"
              />
              <div
                v-else
                class="flex h-56 min-h-[200px] items-center justify-center md:absolute md:inset-0 md:h-full"
              >
                <UIcon name="i-heroicons-photo" class="h-14 w-14 text-white/25" />
              </div>
            </div>
          </div>
        </UCard>
      </section>

      <section v-if="regularPartnersSorted.length">
        <h2
          v-if="premiumPartnersSorted.length"
          class="mb-5 text-center text-xl font-semibold text-white/90 sm:text-left"
        >
          {{ t('partnersPage.directoryTitle') }}
        </h2>
        <div class="grid grid-cols-1 gap-5 md:grid-cols-3">
          <UCard
            v-for="partner in regularPartnersSorted"
            :key="partner.id"
            class="flex h-full flex-col overflow-hidden border-0 bg-gradient-to-br from-white/[0.07] to-white/[0.02] ring-1 ring-white/10"
          >
            <div class="p-5">
              <PartnerAnnuaireFields :partner="partner" />
            </div>
          </UCard>
        </div>
      </section>
    </template>

    <div v-else class="py-12 text-center text-white/60">
      <UIcon name="i-heroicons-building-office-2" class="mx-auto mb-4 h-12 w-12" />
      <p>{{ t('partnersPage.empty') }}</p>
    </div>

    <div class="mt-14 space-y-10 border-t border-white/10 pt-12">
      <ParticipationCallout context="partners" />
      <UAccordion
        type="single"
        :collapsible="true"
        :items="soutienQrAccordionItems"
        class="mx-auto w-full max-w-3xl"
        :ui="{
          root: 'rounded-xl ring-1 ring-primary-500/25 bg-primary-500/[0.06]',
          item: 'border-0',
          header: 'px-4 py-3 sm:px-5',
          trigger: 'py-0 text-primary-200 hover:text-primary-100',
          content: 'px-4 pb-4 pt-0 sm:px-5 sm:pb-5',
          body: 'text-sm leading-relaxed text-white/75',
        }"
      />
    </div>
  </div>
</template>
